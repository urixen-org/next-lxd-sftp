/**
 * Cross-platform build script for next-lxd-sftp native addon.
 *
 * Orchestrates:
 *   1. Compile the Go backend into a static library (c-archive)
 *   2. Run node-gyp to build the final .node file
 *
 * Uses c-archive on all platforms so the .node file is self-contained
 * (Go code is linked directly into the addon — no separate DLL needed).
 *
 * Usage:
 *   node build.js                  # release build
 *   node build.js --debug          # debug build
 *   node build.js --no-clean       # skip node-gyp clean
 */

'use strict';

const { execSync } = require('child_process');
const { existsSync, mkdirSync, renameSync, unlinkSync } = require('fs');
const path = require('path');
const os = require('os');

// ─── Paths ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname);
const GO_DIR = path.join(ROOT, 'go');
const GO_SRC = path.join(GO_DIR, 'lib');
const COMPILED_DIR = path.join(GO_DIR, 'compiled');
const RELEASE_DIR = path.join(ROOT, 'build', 'Release');
const DEBUG_DIR = path.join(ROOT, 'build', 'Debug');

const isWin = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

// ─── Platform / Arch mapping (Go naming convention) ─────────────────────────
//
// Matches the naming scheme used by go/build.ps1 so that artifacts produced by
// either script are interchangeable.

const PLATFORM_MAP = {
	win32: 'windows',
	darwin: 'darwin',
	linux: 'linux'
};

const ARCH_MAP = {
	x64: 'amd64',
	arm64: 'arm64',
	ia32: '386',
	arm: 'arm'
};

function getGoPlatform() {
	return PLATFORM_MAP[os.platform()] || os.platform();
}

function getGoArch() {
	return ARCH_MAP[os.arch()] || os.arch();
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
	console.log('  $ ' + cmd);
	execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function banner(label) {
	const sep = '\u2500'.repeat(60);
	console.log(`\n${sep}\n  ${label}\n${sep}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
	const args = process.argv.slice(2);
	const isDebug = args.includes('--debug');
	const noClean = args.includes('--no-clean');
	const buildType = isDebug ? 'debug' : 'release';
	const outDir = isDebug ? DEBUG_DIR : RELEASE_DIR;

	const goArch = getGoArch();
	const goPlatform = getGoPlatform();
	const baseName = `next-lxd.${goPlatform}-${goArch}`;

	// ── 1. Build Go backend ────────────────────────────────────────────────

	banner(`Step 1/3: Building Go library (${buildType})`);

	// Ensure compiled directory exists
	if (!existsSync(COMPILED_DIR)) {
		mkdirSync(COMPILED_DIR, { recursive: true });
	}

	const ext = isWin ? 'lib' : 'a';

	// Build as c-archive on all platforms (static linking into .node)
	const archFile = path.join(COMPILED_DIR, `${baseName}.${ext}`);
	run(`go build -buildmode=c-archive -o "${archFile}" ./lib`, {
		cwd: GO_DIR
	});

	// Rename .h to match naming convention
	const headerSrc = path.join(COMPILED_DIR, 'next-lxd.h');
	const headerDst = path.join(COMPILED_DIR, `${baseName}.h`);
	if (existsSync(headerSrc)) {
		if (existsSync(headerDst)) unlinkSync(headerDst);
		renameSync(headerSrc, headerDst);
	}

	// ── 2. Build native addon with node-gyp ────────────────────────────────

	banner('Step 2/3: Building native addon (node-gyp)');

	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	if (!noClean) {
		try {
			run('npx --yes node-gyp clean');
		} catch {
			// ignore if there's nothing to clean
		}
	}

	if (isDebug) {
		run('npx --yes node-gyp configure --debug');
		run('npx --yes node-gyp build --debug');
	} else {
		run('npx --yes node-gyp configure');
		run('npx --yes node-gyp build');
	}

	// ── 3. Done ────────────────────────────────────────────────────────────

	banner('Step 3/3: Done');

	console.log('  \u2713 Build complete!');
	console.log('  \u25C0 ' + path.relative(ROOT, outDir) + path.sep + 'next-lxd.node');
}

main();
