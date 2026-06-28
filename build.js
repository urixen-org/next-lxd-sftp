/**
 * Cross-platform build script for next-lxd-sftp native addon.
 *
 * Orchestrates:
 *   1. Compile the Go backend
 *      - Windows:   c-shared (DLL) + MSVC import lib via dumpbin + lib.exe
 *      - macOS/Linux: c-archive (static lib)
 *   2. Run node-gyp to build the final .node file
 *   3. Copy DLL alongside .node on Windows (for runtime loading)
 *
 * Usage:
 *   node build.js                  # release build
 *   node build.js --debug          # debug build
 *   node build.js --no-clean       # skip node-gyp clean
 */

'use strict';

const { execSync } = require('child_process');
const {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	unlinkSync,
	writeFileSync
} = require('fs');
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

function tryRun(cmd, opts = {}) {
	try {
		run(cmd, opts);
		return true;
	} catch {
		return false;
	}
}

function banner(label) {
	const sep = '\u2500'.repeat(60);
	console.log(`\n${sep}\n  ${label}\n${sep}`);
}

/**
 * Search for a MSVC tool (lib.exe, dumpbin.exe) by looking
 * in PATH first, then using vswhere, then scanning common
 * VS installation directories.
 *
 * Returns the full path to the tool, or null if not found.
 */
function findMSVCTool(name) {
	// Already in PATH?
	try {
		execSync(`where ${name}`, { stdio: 'pipe' });
		return name;
	} catch {
		// not in PATH, search
	}

	// Try vswhere first (pre-installed on GitHub Actions runners)
	const vswherePath = path.join(
		process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
		'Microsoft Visual Studio',
		'Installer',
		'vswhere.exe'
	);
	if (existsSync(vswherePath)) {
		try {
			const result = execSync(
				`"${vswherePath}" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`,
				{ encoding: 'utf8' }
			);
			const vsPath = result.trim();
			if (vsPath) {
				const msvcDir = path.join(vsPath, 'VC', 'Tools', 'MSVC');
				if (existsSync(msvcDir)) {
					const versions = readdirSync(msvcDir)
						.filter((d) => /^\d/.test(d))
						.sort()
						.reverse();
					for (const ver of versions) {
						const toolPath = path.join(msvcDir, ver, 'bin', 'Hostx64', 'x64', name);
						if (existsSync(toolPath)) {
							console.log(`  \u2192 found ${name} at ${toolPath}`);
							return toolPath;
						}
					}
				}
			}
		} catch {
			// vswhere failed, fall through to directory scan
		}
	}

	// Fallback: scan common VS directories
	const candidates = [
		'2026',
		'2025',
		'2024',
		'2023',
		'2022',
		'2019',
		'2017',
		'18',
		'17',
		'16',
		'15'
	];
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
					const toolPath = path.join(msvcDir, ver, 'bin', 'Hostx64', 'x64', name);
					if (existsSync(toolPath)) {
						console.log(`  \u2192 found ${name} at ${toolPath}`);
						return toolPath;
					}
				}
			}
		}
	}

	return null;
}

/**
 * Parse dumpbin /exports output into a .def file string.
 */
function dumpbinExportsToDef(dllName, dumpbinOut) {
	const lines = dumpbinOut.split('\n');
	const exports = [];
	let inTable = false;

	for (const raw of lines) {
		const line = raw.trim();
		if (line.includes('ordinal hint')) {
			inTable = true;
			continue;
		}
		if (inTable) {
			if (line === '' || !/^\s*\d+/.test(line)) {
				// end of table: empty line or non-numeric start
				if (exports.length > 0) break;
				inTable = false;
				continue;
			}
			// Typical line: "          1    0 00011000 NextConnect"
			const parts = line.trim().split(/\s+/);
			if (parts.length >= 4) {
				exports.push(parts[3]);
			}
		}
	}

	// Deduplicate and sort (for a clean .def)
	const unique = [...new Set(exports)].sort();

	return [`LIBRARY ${dllName}`, 'EXPORTS', ...unique.map((e) => '  ' + e)].join('\n') + '\n';
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

	if (!existsSync(COMPILED_DIR)) {
		mkdirSync(COMPILED_DIR, { recursive: true });
	}

	if (isWin) {
		// ── Windows: build as c-shared DLL ───────────────────────────────────
		//
		// Build as a DLL (instead of c-archive) to avoid .pdata format conflicts
		// between GCC (which Go's cgo finds via Git for Windows) and MSVC.
		// The DLL uses MinGW-style linking internally; MSVC only sees the
		// import library created from the DLL exports.

		const dllFile = path.join(COMPILED_DIR, 'next-lxd.dll');

		run(`go build -buildmode=c-shared -o "${dllFile}" ./lib`, {
			cwd: GO_DIR
		});

		// Locate MSVC tools to create the import library
		const libExe = findMSVCTool('lib.exe');
		if (!libExe) {
			throw new Error(
				'MSVC lib.exe not found.\n' +
					'  Open a Visual Studio Developer Command Prompt and run the build from there,\n' +
					"  or install the 'Desktop development with C++' workload via the Visual Studio Installer."
			);
		}

		const dumpbinExe = findMSVCTool('dumpbin.exe');
		if (!dumpbinExe) {
			throw new Error('MSVC dumpbin.exe not found — needed to generate .def from DLL exports.');
		}

		// Generate .def file from DLL exports using dumpbin
		const dumpbinOut = execSync(`"${dumpbinExe}" /exports "${dllFile}"`, { encoding: 'utf8' });
		const defContent = dumpbinExportsToDef('next-lxd.dll', dumpbinOut);
		const defFile = path.join(COMPILED_DIR, 'next-lxd.def');
		writeFileSync(defFile, defContent);
		console.log(`  \u2713 generated ${path.relative(ROOT, defFile)}`);

		// Create MSVC import library from the .def
		const machine = MACHINE_MAP[goArch] || 'x64';
		const libFile = path.join(COMPILED_DIR, `${baseName}.lib`);
		run(`"${libExe}" /def:"${defFile}" /machine:${machine} /out:"${libFile}"`);

		// Rename .h to match naming convention
		const headerSrc = path.join(COMPILED_DIR, 'next-lxd.h');
		const headerDst = path.join(COMPILED_DIR, `${baseName}.h`);
		if (existsSync(headerSrc)) {
			if (existsSync(headerDst)) unlinkSync(headerDst);
			renameSync(headerSrc, headerDst);
		}
	} else {
		// ── macOS / Linux: build as c-archive (static) ───────────────────────
		const archFile = path.join(COMPILED_DIR, `${baseName}.a`);

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
	}

	// ── 2. Ensure output directories exist ─────────────────────────────────

	banner('Step 2/4: Ensuring output directories');

	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	// ── 3. Build native addon with node-gyp ────────────────────────────────

	banner('Step 3/4: Building native addon (node-gyp)');

	if (!noClean) {
		tryRun('npx --yes node-gyp clean');
	}

	if (isDebug) {
		run('npx --yes node-gyp configure --debug');
		run('npx --yes node-gyp build --debug');
	} else {
		run('npx --yes node-gyp configure');
		run('npx --yes node-gyp build');
	}

	// ── 4. Deploy DLL alongside .node (Windows only) ───────────────────────

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
