# next-lxd-sftp

**LXD instance SFTP operations via a Node.js native addon.**

Built with Go (CGO) + gonacli-generated C++ N-API bridge + node-gyp.

Cross-platform: Windows, macOS, Linux.

## Features

- **25 SFTP operations** exposed as synchronous JS functions
- **Session-based**: connect once, get a numeric session ID, pass it to subsequent calls
- **File handle management**: open/read/write/close files via opaque IDs
- **TLS + HTTP Upgrade**: connects via LXD's SFTP-over-WebSocket upgrade protocol
- **TypeScript types** included (full `index.d.ts` with JSDoc)
- **No external dependencies** at runtime — just `bindings` to locate the `.node` file

## Prerequisites

| Tool   | Version  | Notes |
|--------|----------|-------|
| Go     | 1.23+    | For compiling the Go backend |
| Node.js | 16+     | For node-gyp and the final addon |
| node-gyp | 9+    | `npm install -g node-gyp` |
| Python  | 3.x      | Required by node-gyp |
| C++ build tools | — | Windows: VS Build Tools / MSVC; Linux: g++/build-essential; macOS: Xcode CLI tools |
| MinGW  | —        | Windows only: needed by Go CGO for `c-shared`/`c-archive` builds |

## Installation

```bash
npm install next-lxd-sftp
```

Or from source:

```bash
git clone <repo>
cd next-lxd-sftp
npm install
npm run build
```

## Quick Start

```typescript
import nextLxd from 'next-lxd-sftp';

// Connect
const { sessionId } = nextLxd.nextConnect({
  address: '192.168.1.100:8443',
  cert: fs.readFileSync('client.crt', 'utf-8'),
  key:  fs.readFileSync('client.key', 'utf-8'),
  instance: 'my-container',
  insecure: true,      // skip TLS verification (default: false)
});

// List root directory
const dir = nextLxd.nextReadDir({ sessionId, path: '/' });
console.log('Entries:', dir.entries);

// Stat a file
const st = nextLxd.nextStat({ sessionId, path: '/etc/hostname' });
console.log(st);

// Get working directory
const wd = nextLxd.nextGetwd({ sessionId });
console.log('CWD:', wd.path);

// Read a file
const { fileId } = nextLxd.nextOpen({ sessionId, path: '/etc/hostname' });
let result = nextLxd.nextRead({ fileId, length: 4096 });
if (result.data) {
  console.log(Buffer.from(result.data, 'base64').toString('utf-8'));
}
nextLxd.nextCloseFile({ fileId });

// Disconnect
nextLxd.nextDisconnect({ sessionId });
```

## API

All functions accept a **single plain object** and return a **plain object synchronously**. On error the returned object has an `error: string` field instead of the expected payload.

See [`index.d.ts`](./index.d.ts) for full TypeScript definitions with JSDoc.

### Session Management

| Function | Params | Returns |
|----------|--------|---------|
| `nextConnect` | `{ address, cert, key, instance, insecure? }` | `{ sessionId }` |
| `nextDisconnect` | `{ sessionId }` | `{ ok }` |

### Directory / File Info

| Function | Params | Returns |
|----------|--------|---------|
| `nextReadDir` | `{ sessionId, path }` | `{ entries: FileInfo[] }` |
| `nextStat` | `{ sessionId, path }` | `FileInfo` |
| `nextLstat` | `{ sessionId, path }` | `FileInfo` (symlink itself) |
| `nextReadLink` | `{ sessionId, path }` | `{ target }` |
| `nextRealPath` | `{ sessionId, path }` | `{ path }` |
| `nextGetwd` | `{ sessionId }` | `{ path }` |
| `nextGlob` | `{ sessionId, pattern }` | `{ matches: string[] }` |

### File Operations

| Function | Params | Returns |
|----------|--------|---------|
| `nextOpen` | `{ sessionId, path }` | `{ fileId }` |
| `nextOpenFile` | `{ sessionId, path, flags? }` | `{ fileId }` |
| `nextCreate` | `{ sessionId, path }` | `{ fileId }` |
| `nextRead` | `{ fileId, length? }` | `{ data: base64, n }` |
| `nextWrite` | `{ fileId, data: base64 }` | `{ n }` |
| `nextCloseFile` | `{ fileId }` | `{ ok }` |

### File System Mutations

| Function | Params | Returns |
|----------|--------|---------|
| `nextRemove` | `{ sessionId, path }` | `{ ok }` |
| `nextRemoveDir` | `{ sessionId, path }` | `{ ok }` |
| `nextRename` | `{ sessionId, oldPath, newPath }` | `{ ok }` |
| `nextPosixRename` | `{ sessionId, oldPath, newPath }` | `{ ok }` |
| `nextMkdir` | `{ sessionId, path }` | `{ ok }` |
| `nextMkdirAll` | `{ sessionId, path }` | `{ ok }` |
| `nextChmod` | `{ sessionId, path, mode }` | `{ ok }` |
| `nextChown` | `{ sessionId, path, uid, gid }` | `{ ok }` |
| `nextChtimes` | `{ sessionId, path, atime, mtime }` | `{ ok }` |

## Cross-Platform Build

The `build.js` script handles all three platforms:

- **Windows**: `go build -buildmode=c-shared` → DLL → `gendef` + `lib.exe` → MSVC import lib → `node-gyp` links it → DLL copied to `build/Release/`
- **macOS**: `go build -buildmode=c-archive` → `.a` → `node-gyp` links statically + CoreFoundation/Security frameworks
- **Linux**: `go build -buildmode=c-archive` → `.a` → `node-gyp` links statically + pthread/dl

```bash
# Release build
npm run build

# Debug build
npm run build:debug

# Rebuild without cleaning (faster iteration)
npm run rebuild
```

## Project Structure

```
next-lxd-sftp/
├── go/                    # Go backend
│   ├── app.go             # package app — Client, Config
│   ├── config.go          # TLS config
│   ├── connector.go       # LXD SFTP connector (HTTP Upgrade)
│   ├── session.go         # SFTP session wrapper
│   ├── manager.go         # In-memory session/file handle store
│   ├── go.mod
│   ├── go.sum
│   └── lib/
│       └── bridge.go      # package main — CGO bridge (gonacli entry point)
├── src/
│   ├── next-lxd.cc        # C++ N-API bridge (gonacli-generated + JSON fix)
│   └── next-lxd.h         # C header for Go exports
├── index.js               # Package entry (require('bindings')('next-lxd'))
├── index.d.ts             # Full TypeScript types + JSDoc
├── package.json
├── binding.gyp            # node-gyp configuration
├── build.js               # Cross-platform build orchestrator
├── goaddon.json           # gonacli configuration (for regeneration reference)
├── test.ts                # Integration test
├── README.md
└── .gitignore
```

## Development

### Regenerating the C++ Bridge

If you change the exported Go functions, regenerate the bridge with gonacli:

```bash
gonacli generate --config goaddon.json
```

This overwrites `src/next-lxd.cc` and `src/next-lxd.h`.

**Important**: after regeneration, re-apply the JSON fix (gonacli's built-in `wg_object_to_string` doesn't escape newlines). The fix uses V8's `JSON.stringify`/`JSON.parse` instead. Check that lines 109–127 of `next-lxd.cc` use `env.Global().Get("JSON")`.

### Testing

```bash
# Install deps + build
npm install
npm run build

# Run integration test (requires a running LXD instance)
bun test.ts
# or
npx tsx test.ts
```

## License

MIT
