package main

/*
#include <stdlib.h>
*/
import "C"
import (
	"encoding/base64"
	"encoding/json"
	"os"
	"time"

	app "github.com/urixen/next-lxd"
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

func goString(s *C.char) string {
	if s == nil {
		return ""
	}
	return C.GoString(s)
}

func resultJSON(v interface{}) *C.char {
	data, err := json.Marshal(v)
	if err != nil {
		return C.CString(`{"error":"json marshal failed"}`)
	}
	return C.CString(string(data))
}

func errorJSON(err error) *C.char {
	return resultJSON(map[string]string{"error": err.Error()})
}

func parseParams(raw *C.char) (map[string]interface{}, *C.char) {
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(goString(raw)), &params); err != nil {
		return nil, errorJSON(err)
	}
	return params, nil
}

func getSession(params map[string]interface{}) (*app.Session, *C.char) {
	id, ok := params["sessionId"]
	if !ok {
		return nil, C.CString(`{"error":"missing sessionId"}`)
	}
	sid, ok := id.(float64)
	if !ok {
		return nil, C.CString(`{"error":"sessionId must be a number"}`)
	}
	s, ok := app.GetSession(uint64(sid))
	if !ok {
		return nil, C.CString(`{"error":"invalid session ID"}`)
	}
	return s, nil
}

type fileInfoJSON struct {
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	Mode    uint32 `json:"mode"`
	ModTime string `json:"modTime"`
	IsDir   bool   `json:"isDir"`
}

func toFileInfoJSON(fi os.FileInfo) fileInfoJSON {
	return fileInfoJSON{
		Name:    fi.Name(),
		Size:    fi.Size(),
		Mode:    uint32(fi.Mode()),
		ModTime: fi.ModTime().Format(time.RFC3339Nano),
		IsDir:   fi.IsDir(),
	}
}

// ─── Connect / Disconnect ───────────────────────────────────────────────────

//export NextConnect
func NextConnect(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	address, _ := params["address"].(string)
	cert, _ := params["cert"].(string)
	key, _ := params["key"].(string)
	instance, _ := params["instance"].(string)
	insecure, _ := params["insecure"].(bool)

	cfg := app.Config{
		Address:  address,
		CertFile: cert,
		KeyFile:  key,
		Insecure: insecure,
	}

	client, err := app.New(cfg)
	if err != nil {
		return errorJSON(err)
	}

	session, err := client.Connect(instance)
	if err != nil {
		return errorJSON(err)
	}

	sessionID := app.AddSession(session)
	return resultJSON(map[string]interface{}{"sessionId": sessionID})
}

//export NextDisconnect
func NextDisconnect(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	id, _ := params["sessionId"].(float64)
	app.RemoveSession(uint64(id))

	if err := s.Close(); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

// ─── Directory / File Info ──────────────────────────────────────────────────

//export NextReadDir
func NextReadDir(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	entries, err := s.ReadDir(path)
	if err != nil {
		return errorJSON(err)
	}

	infos := make([]fileInfoJSON, len(entries))
	for i, fi := range entries {
		infos[i] = toFileInfoJSON(fi)
	}
	return resultJSON(map[string]interface{}{"entries": infos})
}

//export NextStat
func NextStat(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	fi, err := s.Stat(path)
	if err != nil {
		return errorJSON(err)
	}
	return resultJSON(toFileInfoJSON(fi))
}

//export NextLstat
func NextLstat(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	fi, err := s.Lstat(path)
	if err != nil {
		return errorJSON(err)
	}
	return resultJSON(toFileInfoJSON(fi))
}

// ─── Remove / Rename / Mkdir ────────────────────────────────────────────────

//export NextRemove
func NextRemove(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	if err := s.Remove(path); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextRemoveDir
func NextRemoveDir(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	if err := s.RemoveDirectory(path); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextRename
func NextRename(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	oldPath, _ := params["oldPath"].(string)
	newPath, _ := params["newPath"].(string)

	if err := s.Rename(oldPath, newPath); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextPosixRename
func NextPosixRename(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	oldPath, _ := params["oldPath"].(string)
	newPath, _ := params["newPath"].(string)

	if err := s.PosixRename(oldPath, newPath); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextMkdir
func NextMkdir(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	if err := s.Mkdir(path); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextMkdirAll
func NextMkdirAll(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	if err := s.MkdirAll(path); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

// ─── Symlink / ReadLink / RealPath / Getwd / Glob ───────────────────────────

//export NextReadLink
func NextReadLink(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	target, err := s.ReadLink(path)
	if err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"target": target})
}

//export NextSymlink
func NextSymlink(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	target, _ := params["target"].(string)
	link, _ := params["link"].(string)

	if err := s.Symlink(target, link); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextRealPath
func NextRealPath(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	rp, err := s.RealPath(path)
	if err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"path": rp})
}

//export NextGetwd
func NextGetwd(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	wd, err := s.Getwd()
	if err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"path": wd})
}

//export NextGlob
func NextGlob(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	pattern, _ := params["pattern"].(string)

	matches, err := s.Glob(pattern)
	if err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]interface{}{"matches": matches})
}

// ─── File Handle Operations ─────────────────────────────────────────────────

//export NextOpen
func NextOpen(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	f, err := s.Open(path)
	if err != nil {
		return errorJSON(err)
	}

	fileID := app.AddFile(f)
	return resultJSON(map[string]interface{}{"fileId": fileID})
}

//export NextOpenFile
func NextOpenFile(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)
	flags := 0
	if f, ok := params["flags"].(float64); ok {
		flags = int(f)
	}

	f, err := s.OpenFile(path, flags)
	if err != nil {
		return errorJSON(err)
	}

	fileID := app.AddFile(f)
	return resultJSON(map[string]interface{}{"fileId": fileID})
}

//export NextCreate
func NextCreate(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)

	f, err := s.Create(path)
	if err != nil {
		return errorJSON(err)
	}

	fileID := app.AddFile(f)
	return resultJSON(map[string]interface{}{"fileId": fileID})
}

//export NextRead
func NextRead(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	fid, ok := params["fileId"].(float64)
	if !ok {
		return C.CString(`{"error":"missing fileId"}`)
	}
	length := 4096
	if l, ok := params["length"].(float64); ok {
		length = int(l)
	}

	f, ok := app.GetFile(uint64(fid))
	if !ok {
		return C.CString(`{"error":"invalid file handle"}`)
	}

	buf := make([]byte, length)
	n, err := f.Read(buf)
	if err != nil && n == 0 {
		return errorJSON(err)
	}

	encoded := base64.StdEncoding.EncodeToString(buf[:n])
	return resultJSON(map[string]interface{}{
		"data": encoded,
		"n":    n,
	})
}

//export NextWrite
func NextWrite(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	fid, ok := params["fileId"].(float64)
	if !ok {
		return C.CString(`{"error":"missing fileId"}`)
	}

	f, ok := app.GetFile(uint64(fid))
	if !ok {
		return C.CString(`{"error":"invalid file handle"}`)
	}

	dataStr, _ := params["data"].(string)
	buf, err := base64.StdEncoding.DecodeString(dataStr)
	if err != nil {
		return errorJSON(err)
	}

	n, err := f.Write(buf)
	if err != nil {
		return errorJSON(err)
	}

	return resultJSON(map[string]interface{}{"n": n})
}

//export NextCloseFile
func NextCloseFile(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	fid, ok := params["fileId"].(float64)
	if !ok {
		return C.CString(`{"error":"missing fileId"}`)
	}

	f := app.RemoveFile(uint64(fid))
	if f == nil {
		return C.CString(`{"error":"invalid file handle"}`)
	}

	if err := f.Close(); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

// ─── Permissions / Times ────────────────────────────────────────────────────

//export NextChmod
func NextChmod(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)
	mode := os.FileMode(0)
	if m, ok := params["mode"].(float64); ok {
		mode = os.FileMode(uint32(m))
	}

	if err := s.Chmod(path, mode); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextChown
func NextChown(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)
	uid := 0
	gid := 0
	if u, ok := params["uid"].(float64); ok {
		uid = int(u)
	}
	if g, ok := params["gid"].(float64); ok {
		gid = int(g)
	}

	if err := s.Chown(path, uid, gid); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

//export NextChtimes
func NextChtimes(_params *C.char) *C.char {
	params, errc := parseParams(_params)
	if errc != nil {
		return errc
	}

	s, errc := getSession(params)
	if errc != nil {
		return errc
	}

	path, _ := params["path"].(string)
	atimeStr, _ := params["atime"].(string)
	mtimeStr, _ := params["mtime"].(string)

	atime, err := time.Parse(time.RFC3339Nano, atimeStr)
	if err != nil {
		return C.CString(`{"error":"invalid atime"}`)
	}
	mtime, err := time.Parse(time.RFC3339Nano, mtimeStr)
	if err != nil {
		return C.CString(`{"error":"invalid mtime"}`)
	}

	if err := s.Chtimes(path, atime, mtime); err != nil {
		return errorJSON(err)
	}
	return resultJSON(map[string]string{"ok": "true"})
}

func main() {}
