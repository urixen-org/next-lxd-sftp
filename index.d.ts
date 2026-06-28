/**
 * Next-LXD SFTP — LXD instance SFTP operations via a Node.js native addon.
 *
 * All functions accept a plain object and return a plain object synchronously.
 * Errors are returned as `{ error: string }` rather than thrown.
 *
 * @example
 * ```ts
 * import nextLxd from 'next-lxd-sftp'
 *
 * const { sessionId } = nextLxd.nextConnect({
 *   address: '192.168.1.100:8443',
 *   cert: fs.readFileSync('cert.pem', 'utf-8'),
 *   key: fs.readFileSync('key.pem', 'utf-8'),
 *   instance: 'my-container',
 *   insecure: false,
 * })
 *
 * const dir = nextLxd.nextReadDir({ sessionId, path: '/home' })
 * console.log(dir.entries)
 *
 * nextLxd.nextDisconnect({ sessionId })
 * ```
 */
declare const nextLxdSftp: NextLxd

export = nextLxdSftp
export as namespace nextLxdSftp

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** File information returned by Stat / Lstat / ReadDir entries. */
interface FileInfo {
  /** File or directory name (last path component). */
  name: string
  /** File size in bytes. */
  size: number
  /** Unix file mode bits (e.g. `0o755` for a directory). */
  mode: number
  /** Last modification time in RFC 3339 format (e.g. `"2026-06-19T07:39:47+06:00"`). */
  modTime: string
  /** Whether the entry is a directory. */
  isDir: boolean
}

/** Generic success envelope with no meaningful payload. */
interface OkResult {
  /** Always `"true"` when present. */
  ok: "true"
}

/** Error envelope returned by any function on failure. */
interface ErrorResult {
  /** Human-readable error message. */
  error: string
}

/** Result from a successful {@link NextLxd.nextConnect | nextConnect} call. */
interface ConnectResult {
  /** Opaque numeric session ID. Pass this to all subsequent operations. */
  sessionId: number
}

/** Result from a successful {@link NextLxd.nextReadDir | nextReadDir} call. */
interface ReadDirResult {
  /** Directory entries. */
  entries: FileInfo[]
}

/** Result from a successful {@link NextLxd.nextStat | nextStat} / nextLstat call. */
type StatResult = FileInfo

/** Result from a successful {@link NextLxd.nextReadLink | nextReadLink} call. */
interface ReadLinkResult {
  /** Target path of the symlink. */
  target: string
}

/** Result from a successful {@link NextLxd.nextRealPath | nextRealPath} call. */
interface RealPathResult {
  /** Resolved absolute path. */
  path: string
}

/** Result from a successful {@link NextLxd.nextGetwd | nextGetwd} call. */
type GetwdResult = RealPathResult

/** Result from a successful {@link NextLxd.nextGlob | nextGlob} call. */
interface GlobResult {
  /** Glob pattern matches. */
  matches: string[]
}

/** Result from a successful {@link NextLxd.nextOpen | nextOpen} / nextOpenFile / nextCreate call. */
interface OpenResult {
  /** Opaque numeric file handle ID. Pass this to read/write/close operations. */
  fileId: number
}

/** Result from a successful {@link NextLxd.nextRead | nextRead} call. */
interface ReadResult {
  /** Base64-encoded binary data read from the file. */
  data: string
  /** Number of bytes actually read (may be less than `length` requested). */
  n: number
}

/** Result from a successful {@link NextLxd.nextWrite | nextWrite} call. */
interface WriteResult {
  /** Number of bytes actually written. */
  n: number
}

// ─── Input Parameters ─────────────────────────────────────────────────────────

/** Parameters for {@link NextLxd.nextConnect | nextConnect}. */
interface ConnectParams {
  /** LXD server address (e.g. `"192.168.1.100:8443"`). */
  address: string
  /**
   * TLS client certificate.
   * Can be a PEM string or a path to a PEM file — the bridge detects
   * PEM content by the `-----BEGIN ` prefix and writes to a temp file.
   */
  cert: string
  /**
   * TLS client private key.
   * Same behaviour as `cert`.
   */
  key: string
  /** LXD instance (container / VM) name to connect to via SFTP. */
  instance: string
  /** Skip TLS certificate verification (default `false`). */
  insecure?: boolean
}

/** Parameters for {@link NextLxd.nextDisconnect | nextDisconnect}. */
interface SessionParams {
  /** Session ID from a previous {@link NextLxd.nextConnect | nextConnect} call. */
  sessionId: number
}

/** Parameters for {@link NextLxd.nextReadDir | nextReadDir}. */
interface PathParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Remote directory path. */
  path: string
}

/** Parameters for {@link NextLxd.nextSymlink | nextSymlink}. */
interface SymlinkParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Symlink target (existing path). */
  target: string
  /** Symlink name (path to create). */
  link: string
}

/** Parameters for {@link NextLxd.nextGlob | nextGlob}. */
interface GlobPatternParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Glob pattern (e.g. `"*.txt"`, `"/home/**\/*.go"`). */
  pattern: string
}

/** Parameters for {@link NextLxd.nextOpenFile | nextOpenFile}. */
interface OpenFileParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Remote file path. */
  path: string
  /** SFTP open flags (e.g. `os.O_RDWR | os.O_CREATE`). Default: 0 (read-only). */
  flags?: number
}

/** Parameters for {@link NextLxd.nextRead | nextRead}. */
interface ReadParams {
  /** File handle ID from a previous open/create call. */
  fileId: number
  /** Number of bytes to read (default `4096`). */
  length?: number
}

/** Parameters for {@link NextLxd.nextWrite | nextWrite}. */
interface WriteParams {
  /** File handle ID from a previous open/create call. */
  fileId: number
  /** Binary data to write, base64-encoded. */
  data: string
}

/** Parameters for file handle operations (close). */
interface FileIdParams {
  /** File handle ID from a previous open/create call. */
  fileId: number
}

/** Parameters for {@link NextLxd.nextRename | nextRename} / nextPosixRename. */
interface RenameParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Current path. */
  oldPath: string
  /** New path. */
  newPath: string
}

/** Parameters for {@link NextLxd.nextChmod | nextChmod}. */
interface ChmodParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Remote path. */
  path: string
  /** Unix file mode (e.g. `0o755`). */
  mode: number
}

/** Parameters for {@link NextLxd.nextChown | nextChown}. */
interface ChownParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Remote path. */
  path: string
  /** User ID (`-1` to leave unchanged). */
  uid: number
  /** Group ID (`-1` to leave unchanged). */
  gid: number
}

/** Parameters for {@link NextLxd.nextChtimes | nextChtimes}. */
interface ChtimesParams {
  /** Session ID from a previous connect call. */
  sessionId: number
  /** Remote path. */
  path: string
  /** Access time in RFC 3339 format (e.g. `"2026-06-28T12:00:00Z"`). */
  atime: string
  /** Modification time in RFC 3339 format. */
  mtime: string
}

// ─── Main Interface ──────────────────────────────────────────────────────────

/**
 * LXD SFTP native addon.
 *
 * Every method takes a single plain-object argument and returns a plain object.
 * On failure the returned object contains an `error` string key instead of the
 * expected payload keys.
 */
interface NextLxd {
  // ── Session Management ──────────────────────────────────────────────────

  /**
   * Connect to a LXD instance over SFTP.
   *
   * Returns a numeric `sessionId` that must be passed to all subsequent calls.
   *
   * @param params - Connection parameters.
   * @returns `{ sessionId: number }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * const { sessionId } = nextLxdSftp.nextConnect({
   *   address: '192.168.1.100:8443',
   *   cert: fs.readFileSync('cert.pem', 'utf-8'),
   *   key: fs.readFileSync('key.pem', 'utf-8'),
   *   instance: 'my-container',
   *   insecure: false,
   * })
   * ```
   */
  nextConnect(params: ConnectParams): ConnectResult | ErrorResult

  /**
   * Disconnect from a LXD instance and release the session.
   *
   * @param params - Must contain a valid `sessionId`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextDisconnect(params: SessionParams): OkResult | ErrorResult

  // ── Directory / File Info ───────────────────────────────────────────────

  /**
   * List entries in a remote directory.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ entries: FileInfo[] }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * const dir = nextLxdSftp.nextReadDir({ sessionId, path: '/home' })
   * for (const entry of dir.entries ?? []) {
   *   console.log(entry.name, entry.isDir ? '(dir)' : '')
   * }
   * ```
   */
  nextReadDir(params: PathParams): ReadDirResult | ErrorResult

  /**
   * Stat a remote file or directory.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns A `FileInfo` object on success, or `{ error: string }`.
   */
  nextStat(params: PathParams): StatResult | ErrorResult

  /**
   * Stat a remote symlink (does not follow the link).
   *
   * @param params - `sessionId` and remote `path`.
   * @returns A `FileInfo` object on success, or `{ error: string }`.
   */
  nextLstat(params: PathParams): StatResult | ErrorResult

  /**
   * Read the target of a symbolic link.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ target: string }` on success, or `{ error: string }`.
   */
  nextReadLink(params: PathParams): ReadLinkResult | ErrorResult

  /**
   * Create a symbolic link.
   *
   * @param params - `sessionId`, `target` (existing path), and `link` (path to create).
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextSymlink(params: SymlinkParams): OkResult | ErrorResult

  /**
   * Resolve a remote path to its canonical (absolute) form.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ path: string }` on success, or `{ error: string }`.
   */
  nextRealPath(params: PathParams): RealPathResult | ErrorResult

  /**
   * Get the current working directory on the remote instance.
   *
   * @param params - Must contain a valid `sessionId`.
   * @returns `{ path: string }` on success, or `{ error: string }`.
   */
  nextGetwd(params: SessionParams): GetwdResult | ErrorResult

  /**
   * List files matching a glob pattern on the remote instance.
   *
   * @param params - `sessionId` and `pattern` (glob string).
   * @returns `{ matches: string[] }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * const { matches } = nextLxdSftp.nextGlob({ sessionId, pattern: '/etc/**\/*.conf' })
   * ```
   */
  nextGlob(params: GlobPatternParams): GlobResult | ErrorResult

  // ── File Operations ─────────────────────────────────────────────────────

  /**
   * Open a remote file for reading.
   *
   * Returns a numeric `fileId` for use with {@link nextRead} and {@link nextCloseFile}.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ fileId: number }` on success, or `{ error: string }`.
   */
  nextOpen(params: PathParams): OpenResult | ErrorResult

  /**
   * Open a remote file with custom flags.
   *
   * @param params - `sessionId`, `path`, and optional `flags` (SFTP open flags).
   * @returns `{ fileId: number }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * // Open for writing (os.O_WRONLY | os.O_CREATE | os.O_TRUNC ≈ 0x241)
   * const { fileId } = nextLxdSftp.nextOpenFile({ sessionId, path: '/tmp/test', flags: 0x241 })
   * ```
   */
  nextOpenFile(params: OpenFileParams): OpenResult | ErrorResult

  /**
   * Create a remote file for writing (opens with O_RDWR | O_CREATE | O_TRUNC).
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ fileId: number }` on success, or `{ error: string }`.
   */
  nextCreate(params: PathParams): OpenResult | ErrorResult

  /**
   * Read binary data from an open file handle.
   *
   * Data is returned as a base64-encoded string. Decode with
   * `Buffer.from(result.data, 'base64')`.
   *
   * @param params - `fileId` and optional `length` (default `4096`).
   * @returns `{ data: string, n: number }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * const { data, n } = nextLxdSftp.nextRead({ fileId })
   * if (n > 0) {
   *   const buf = Buffer.from(data, 'base64')
   *   console.log(buf.toString('utf-8'))
   * }
   * ```
   */
  nextRead(params: ReadParams): ReadResult | ErrorResult

  /**
   * Write binary data to an open file handle.
   *
   * @param params - `fileId` and `data` (base64-encoded string).
   * @returns `{ n: number }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * const buf = Buffer.from('hello world', 'utf-8')
   * nextLxdSftp.nextWrite({ fileId, data: buf.toString('base64') })
   * ```
   */
  nextWrite(params: WriteParams): WriteResult | ErrorResult

  /**
   * Close an open file handle.
   *
   * @param params - Must contain a valid `fileId`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextCloseFile(params: FileIdParams): OkResult | ErrorResult

  // ── File System Mutations ───────────────────────────────────────────────

  /**
   * Remove a remote file.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextRemove(params: PathParams): OkResult | ErrorResult

  /**
   * Remove a remote empty directory.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextRemoveDir(params: PathParams): OkResult | ErrorResult

  /**
   * Rename (move) a remote file or directory.
   *
   * @param params - `sessionId`, `oldPath`, and `newPath`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextRename(params: RenameParams): OkResult | ErrorResult

  /**
   * POSIX-style rename (atomic even across filesystems on Linux).
   *
   * @param params - `sessionId`, `oldPath`, and `newPath`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextPosixRename(params: RenameParams): OkResult | ErrorResult

  /**
   * Create a remote directory.
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextMkdir(params: PathParams): OkResult | ErrorResult

  /**
   * Create a remote directory and all missing parents (`mkdir -p`).
   *
   * @param params - `sessionId` and remote `path`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   */
  nextMkdirAll(params: PathParams): OkResult | ErrorResult

  /**
   * Change permissions of a remote file or directory.
   *
   * @param params - `sessionId`, `path`, and `mode` (unix permission bits).
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * nextLxdSftp.nextChmod({ sessionId, path: '/home/user/script.sh', mode: 0o755 })
   * ```
   */
  nextChmod(params: ChmodParams): OkResult | ErrorResult

  /**
   * Change owner of a remote file or directory.
   *
   * @param params - `sessionId`, `path`, `uid`, and `gid`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * nextLxdSftp.nextChown({ sessionId, path: '/home/user', uid: 1000, gid: 1000 })
   * ```
   */
  nextChown(params: ChownParams): OkResult | ErrorResult

  /**
   * Change access and modification times of a remote file or directory.
   *
   * Times are specified as RFC 3339 strings.
   *
   * @param params - `sessionId`, `path`, `atime`, and `mtime`.
   * @returns `{ ok: "true" }` on success, or `{ error: string }`.
   *
   * @example
   * ```ts
   * nextLxdSftp.nextChtimes({
   *   sessionId,
   *   path: '/home/user/file.txt',
   *   atime: '2026-06-28T12:00:00Z',
   *   mtime: '2026-06-28T12:00:00Z',
   * })
   * ```
   */
  nextChtimes(params: ChtimesParams): OkResult | ErrorResult
}
