package app

import (
	"sync"
	"sync/atomic"

	"github.com/pkg/sftp"
)

var (
	sessionsMu sync.RWMutex
	sessions   = make(map[uint64]*Session)
	sessID     atomic.Uint64

	filesMu sync.RWMutex
	files   = make(map[uint64]*sftp.File)
	fileID  atomic.Uint64
)

func AddSession(s *Session) uint64 {
	id := sessID.Add(1)
	sessionsMu.Lock()
	sessions[id] = s
	sessionsMu.Unlock()
	return id
}

func GetSession(id uint64) (*Session, bool) {
	sessionsMu.RLock()
	s, ok := sessions[id]
	sessionsMu.RUnlock()
	return s, ok
}

func RemoveSession(id uint64) *Session {
	sessionsMu.Lock()
	s, ok := sessions[id]
	if ok {
		delete(sessions, id)
	}
	sessionsMu.Unlock()
	if !ok {
		return nil
	}
	return s
}

func AddFile(f *sftp.File) uint64 {
	id := fileID.Add(1)
	filesMu.Lock()
	files[id] = f
	filesMu.Unlock()
	return id
}

func GetFile(id uint64) (*sftp.File, bool) {
	filesMu.RLock()
	f, ok := files[id]
	filesMu.RUnlock()
	return f, ok
}

func RemoveFile(id uint64) *sftp.File {
	filesMu.Lock()
	f, ok := files[id]
	if ok {
		delete(files, id)
	}
	filesMu.Unlock()
	if !ok {
		return nil
	}
	return f
}
