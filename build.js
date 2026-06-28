/**
 * Cross-platform build script for next-lxd-sftp native addon.
 *
 * Orchestrates:
 *   1. Compile the Go backend into a static/shared library
 *   2. On Windows: create an MSVC import library from the Go DLL
 *   3. Run node-gyp to build the final .node file
 *   4. Copy the Go shared library alongside the .node (Windows only)
 *
 * Usage:
 *   node build.js                  # release build
 *   node build.js --debug          # debug build
 *   node build.js --no-clean       # skip node-gyp clean
 */

'use strict';

const { execSync } = require('child_process');
const { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } = require('fs');
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

const MACHINE_MAP = {
	amd64: 'x64',
	arm64: 'ARM64'
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
	const sep = '─'.repeat(60);
	console.log(`\n${sep}\n  ${label}\n${sep}`);
}

/**
 * Resolve the path to MSVC's lib.exe.
 *
 * Returns the full path to lib.exe if found, "lib.exe" if already in PATH,
 * or null if not found anywhere.
 */
function resolveLibExe() {
	// Already in PATH?
	try {
		execSync('where lib.exe', { stdio: 'pipe' });
		return 'lib.exe';
	} catch {
		// not in PATH — search VS installations
	}

	const candidates = ['2022', '2019', '2017'];
	const editions = ['Community', 'Professional', 'Enterprise', 'BuildTools'];
	const programFiles = [
		process.env.ProgramFiles || 'C:\\Program Files',
		process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
	];

	for (const pf of programFiles) {
		for (const year of candidates) {
			for (const edition of editions) {
				const msvcDir = path.join(
					pf,
					'Microsoft Visual Studio',
					year,
					edition,
					'VC',
					'Tools',
					'MSVC'
				);
				if (!existsSync(msvcDir)) continue;

				const versions = readdirSync(msvcDir)
					.filter((d) => /^\d/.test(d))
					.sort()
					.reverse();

				for (const ver of versions) {
					const libPath = path.join(msvcDir, ver, 'bin', 'Hostx64', 'x64', 'lib.exe');
					if (existsSync(libPath)) {
						console.log('  \u2192 found lib.exe at ' + libPath);
						return libPath;
					}
				}
			}
		}
	}

	return null;
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

	banner(`Step 1/4: Building Go library (${buildType})`);

	// Ensure compiled directory exists
	if (!existsSync(COMPILED_DIR)) {
		mkdirSync(COMPILED_DIR, { recursive: true });
	}

	if (isWin) {
		// Windows: build as c-shared DLL, then create import lib for MSVC
		const dllFile = path.join(COMPILED_DIR, 'next-lxd.dll');

		// Build DLL from Go source (run from GO_DIR so go.mod is found)
		run(`go build -buildmode=c-shared -o "${dllFile}" ./lib`, { cwd: GO_DIR });

		// Generate .def file from DLL exports
		const defFile = path.join(COMPILED_DIR, 'next-lxd.def');
		if (existsSync(defFile)) unlinkSync(defFile);
		run(`gendef "${dllFile}"`);

		// Create MSVC import library (.lib) with Go-style naming
		const machine = MACHINE_MAP[goArch] || 'x64';
		const libFile = path.join(COMPILED_DIR, `${baseName}.lib`);

		const libExe = resolveLibExe();
		if (!libExe) {
			throw new Error(
				'MSVC lib.exe not found.\n' +
					'  Open a Visual Studio Developer Command Prompt and run the build from there,\n' +
					"  or install the 'Desktop development with C++' workload via the Visual Studio Installer."
			);
		}
		run(`"${libExe}" /def:"${defFile}" /machine:${machine} /out:"${libFile}"`);

		// Rename .h to match naming convention
		const headerSrc = path.join(COMPILED_DIR, 'next-lxd.h');
		const headerDst = path.join(COMPILED_DIR, `${baseName}.h`);
		if (existsSync(headerSrc)) {
			if (existsSync(headerDst)) unlinkSync(headerDst);
			renameSync(headerSrc, headerDst);
		}
	} else {
		// macOS / Linux: build as c-archive (static)
		const archFile = path.join(COMPILED_DIR, `${baseName}.a`);

		// Run from GO_DIR so go.mod is found
		run(`go build -buildmode=c-archive -o "${archFile}" ./lib`, { cwd: GO_DIR });

		// Rename .h to match naming convention
		const headerSrc = path.join(COMPILED_DIR, 'next-lxd.h');
		const headerDst = path.join(COMPILED_DIR, `${baseName}.h`);
		if (existsSync(headerSrc)) {
			if (existsSync(headerDst)) unlinkSync(headerDst);
			renameSync(headerSrc, headerDst);
		}
	}

	// ── 2. Ensure output directories exist ─────────────────────────────────

	banner('Step 2/4: Ensuring output directories');

	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	// ── 3. Build native addon with node-gyp ────────────────────────────────

	banner('Step 3/4: Building native addon (node-gyp)');

	if (!noClean) {
		try {
			run('node-gyp clean');
		} catch {
			// ignore if there's nothing to clean
		}
	}

	if (isDebug) {
		run('node-gyp configure --debug');
		run('node-gyp build --debug');
	} else {
		run('node-gyp configure');
		run('node-gyp build');
	}

	// ── 4. Deploy shared library alongside .node (Windows only) ────────────

	banner('Step 4/4: Deploying outputs');

	if (isWin) {
		const dllSrc = path.join(COMPILED_DIR, 'next-lxd.dll');
		const dllDst = path.join(outDir, 'next-lxd.dll');

		if (existsSync(dllSrc)) {
			copyFileSync(dllSrc, dllDst);
			console.log('  \u2713 copied next-lxd.dll \u2192 ' + path.relative(ROOT, dllDst));
		} else {
			console.warn('  \u26A0 next-lxd.dll not found at ' + dllSrc);
		}
	}

	console.log('\n  \u2713 Build complete!');
	console.log('  \u25C0 ' + path.relative(ROOT, outDir) + path.sep + 'next-lxd.node');
}

main();
