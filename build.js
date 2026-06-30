/**
 * Cross-platform build script for next-lxd-sftp native addon.
 *
 * Orchestrates:
 *   1. Compile the Go backend
 *      - Windows:   c-shared (DLL) + MSVC import lib via .h file parsing
 *      - macOS/Linux: c-archive (static lib)
 *   2. Run node-gyp to build the final .node file
 *   3. Copy DLL alongside .node on Windows (for runtime loading)
 *
 * All compiled Go artifacts use Go-style naming:
 *   next-lxd.<goos>-<goarch>.<ext>   (e.g. next-lxd.windows-amd64.lib)
 *
 * Usage:
 *   node build.js                  # release build
 *   node build.js --debug          # debug build
 *   node build.js --no-clean       # skip node-gyp clean
 */

"use strict";

const { execSync } = require("child_process");
const {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    renameSync,
    unlinkSync,
    writeFileSync,
    readFileSync,
} = require("fs");
const path = require("path");
const os = require("os");

// ─── Paths ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname);
const GO_DIR = path.join(ROOT, "go");
const GO_SRC = path.join(GO_DIR, "lib");
const COMPILED_DIR = path.join(GO_DIR, "compiled");
const RELEASE_DIR = path.join(ROOT, "build", "Release");
const DEBUG_DIR = path.join(ROOT, "build", "Debug");

const isWin = os.platform() === "win32";
const isMac = os.platform() === "darwin";
const isLinux = os.platform() === "linux";

// ─── Platform / Arch mapping (Go naming convention) ─────────────────────────
//
// Matches the naming scheme used by go/build.ps1 so that artifacts produced by
// either script are interchangeable. Maps Node.js `os.platform()` / `os.arch()`
// values to Go toolchain equivalents.

const PLATFORM_MAP = {
    win32: "windows",
    darwin: "darwin",
    linux: "linux",
};

const ARCH_MAP = {
    x64: "amd64",
    arm64: "arm64",
    ia32: "386",
    arm: "arm",
};

const MACHINE_MAP = {
    amd64: "x64",
    386: "x86",
    arm64: "ARM64",
    arm: "ARM",
};

function getGoPlatform() {
    // Allow override via GOOS env var (for cross-compilation in CI)
    if (process.env.GOOS) return process.env.GOOS;
    return PLATFORM_MAP[os.platform()] || os.platform();
}

function getGoArch() {
    // Allow override via GOARCH env var (for cross-compilation in CI)
    if (process.env.GOARCH) return process.env.GOARCH;
    return ARCH_MAP[os.arch()] || os.arch();
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
    console.log("  $ " + cmd);
    execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
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
    const sep = "\u2500".repeat(60);
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
        execSync(`where ${name}`, { stdio: "pipe" });
        return name;
    } catch {
        // not in PATH, search
    }

    // Try vswhere first (pre-installed on GitHub Actions runners)
    const vswherePath = path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Microsoft Visual Studio",
        "Installer",
        "vswhere.exe",
    );
    if (existsSync(vswherePath)) {
        try {
            const result = execSync(
                `"${vswherePath}" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`,
                { encoding: "utf8" },
            );
            const vsPath = result.trim();
            if (vsPath) {
                const msvcDir = path.join(vsPath, "VC", "Tools", "MSVC");
                if (existsSync(msvcDir)) {
                    const versions = readdirSync(msvcDir)
                        .filter((d) => /^\d/.test(d))
                        .sort()
                        .reverse();
                    for (const ver of versions) {
                        const toolPath = path.join(
                            msvcDir,
                            ver,
                            "bin",
                            "Hostx64",
                            "x64",
                            name,
                        );
                        if (existsSync(toolPath)) {
                            console.log(
                                `  \u2192 found ${name} at ${toolPath}`,
                            );
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
        "2026",
        "2025",
        "2024",
        "2023",
        "2022",
        "2019",
        "2017",
        "18",
        "17",
        "16",
        "15",
    ];
    const editions = ["Community", "Professional", "Enterprise", "BuildTools"];
    const programFiles = [
        process.env.ProgramFiles || "C:\\Program Files",
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    ];

    for (const pf of programFiles) {
        for (const year of candidates) {
            for (const edition of editions) {
                const msvcDir = path.join(
                    pf,
                    "Microsoft Visual Studio",
                    year,
                    edition,
                    "VC",
                    "Tools",
                    "MSVC",
                );
                if (!existsSync(msvcDir)) continue;

                const versions = readdirSync(msvcDir)
                    .filter((d) => /^\d/.test(d))
                    .sort()
                    .reverse();

                for (const ver of versions) {
                    const toolPath = path.join(
                        msvcDir,
                        ver,
                        "bin",
                        "Hostx64",
                        "x64",
                        name,
                    );
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
 * Generate a .def file from a Go-generated c-shared header file.
 *
 * The Go c-shared buildmode produces a .h file with declarations like:
 *   extern char* NextConnect(char* _params);
 *
 * We parse the .h to extract all exported function names and generate
 * a corresponding .def file for MSVC's lib.exe. This is much more
 * robust than parsing dumpbin /exports output (format varies across
 * MSVC versions) and doesn't require external tools like gendef.
 *
 * @param {string} dllName - The LIBRARY name in the .def (e.g. "next-lxd.dll")
 * @param {string} headerContent - The full text of the Go-generated .h
 * @returns {string} Contents for a .def file
 */
function headerToDef(dllName, headerContent) {
    const exports = [];
    for (const line of headerContent.split("\n")) {
        const trimmed = line.trim();
        // Match: extern char* NextFunctionName(...);
        const match = trimmed.match(/^extern\s+char\*\s+(Next\w+)/);
        if (match) {
            exports.push(match[1]);
        }
    }

    if (exports.length === 0) {
        throw new Error(
            "No exports found in Go-generated header. " +
                "The header may have an unexpected format.",
        );
    }

    // Deduplicate and sort for a clean .def
    const unique = [...new Set(exports)].sort();

    return (
        ["LIBRARY " + dllName, "EXPORTS", ...unique.map((e) => "  " + e)].join(
            "\n",
        ) + "\n"
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const isDebug = args.includes("--debug");
    const noClean = args.includes("--no-clean");
    const buildType = isDebug ? "debug" : "release";
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
        // import library created from the DLL exports via the Go-generated .h.

        const dllFile = path.join(COMPILED_DIR, "next-lxd.dll");
        const dllArchFile = path.join(COMPILED_DIR, `${baseName}.dll`);

        run(`go build -buildmode=c-shared -o "${dllFile}" ./lib`, {
            cwd: GO_DIR,
        });

        // Read the Go-generated header to build a .def file
        const headerSrc = path.join(COMPILED_DIR, "next-lxd.h");
        if (!existsSync(headerSrc)) {
            throw new Error(
                "Go c-shared build did not produce next-lxd.h. " +
                    "Check that the Go source has //export comments.",
            );
        }
        const headerContent = readFileSync(headerSrc, "utf8");

        // Build .def — the LIBRARY name matches the arch-prefixed DLL name
        const defContent = headerToDef(`${baseName}.dll`, headerContent);
        const defFile = path.join(COMPILED_DIR, `${baseName}.def`);
        writeFileSync(defFile, defContent);
        console.log(`  \u2713 generated ${path.relative(ROOT, defFile)}`);

        // Rename DLL and header to match Go naming convention
        if (existsSync(dllArchFile)) unlinkSync(dllArchFile);
        renameSync(dllFile, dllArchFile);

        const headerDst = path.join(COMPILED_DIR, `${baseName}.h`);
        if (existsSync(headerDst)) unlinkSync(headerDst);
        renameSync(headerSrc, headerDst);

        // Locate MSVC lib.exe to create the import library
        const libExe = findMSVCTool("lib.exe");
        if (!libExe) {
            throw new Error(
                "MSVC lib.exe not found.\n" +
                    "  Open a Visual Studio Developer Command Prompt and run the build from there,\n" +
                    "  or install the 'Desktop development with C++' workload via the Visual Studio Installer.",
            );
        }

        // Create MSVC import library from the .def
        const machine = MACHINE_MAP[goArch] || "x64";
        const libFile = path.join(COMPILED_DIR, `${baseName}.lib`);
        run(
            `"${libExe}" /def:"${defFile}" /machine:${machine} /out:"${libFile}"`,
        );
    } else {
        // ── macOS / Linux: build as c-archive (static) ───────────────────────
        const archFile = path.join(COMPILED_DIR, `${baseName}.a`);

        run(`go build -buildmode=c-archive -o "${archFile}" ./lib`, {
            cwd: GO_DIR,
        });

        // Rename .h to match naming convention
        const headerSrc = path.join(COMPILED_DIR, "next-lxd.h");
        const headerDst = path.join(COMPILED_DIR, `${baseName}.h`);
        if (existsSync(headerSrc)) {
            if (existsSync(headerDst)) unlinkSync(headerDst);
            renameSync(headerSrc, headerDst);
        }
    }

    // ── 2. Ensure output directories exist ─────────────────────────────────

    banner("Step 2/4: Ensuring output directories");

    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }

    // ── 3. Build native addon with node-gyp ────────────────────────────────

    banner("Step 3/4: Building native addon (node-gyp)");

    if (!noClean) {
        tryRun("npx --yes node-gyp clean");
    }

    if (isDebug) {
        run("npx --yes node-gyp configure --debug");
        run("npx --yes node-gyp build --debug");
    } else {
        run("npx --yes node-gyp configure");
        run("npx --yes node-gyp build");
    }

    // ── 4. Deploy Go compiled outputs alongside .node ──────────────────────

    banner("Step 4/4: Deploying outputs");

    // Move all Go compiled artifacts to the output directory
    if (existsSync(COMPILED_DIR)) {
        const files = readdirSync(COMPILED_DIR);
        for (const file of files) {
            const src = path.join(COMPILED_DIR, file);
            const dst = path.join(outDir, file);

            // Skip directories (shouldn't be any, but be safe)
            if (!existsSync(src)) continue;

            if (existsSync(dst)) unlinkSync(dst);
            renameSync(src, dst);
            console.log(
                "  \u2713 moved " +
                    path.relative(ROOT, src) +
                    " \u2192 " +
                    path.relative(ROOT, dst),
            );
        }
    }

    console.log("\n  \u2713 Build complete!");
    console.log(
        "  \u25C0 " + path.relative(ROOT, outDir) + path.sep + "next-lxd.node",
    );
}

main();
