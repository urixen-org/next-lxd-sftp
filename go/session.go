package app

import (
	"net"
	"os"
	"time"

	"github.com/pkg/sftp"
)

type Session struct {
	conn     net.Conn
	client   *sftp.Client
	instance string
}

func (s *Session) Close() error {
	if s.client != nil {
		_ = s.client.Close()
	}

	if s.conn != nil {
		return s.conn.Close()
	}

	return nil
}

func (s *Session) SFTP() *sftp.Client {
	return s.client
}

func (s *Session) Instance() string {
	return s.instance
}

func (s *Session) ReadDir(path string) ([]os.FileInfo, error) {
	return s.client.ReadDir(path)
}

func (s *Session) Stat(path string) (os.FileInfo, error) {
	return s.client.Stat(path)
}

func (s *Session) Lstat(path string) (os.FileInfo, error) {
	return s.client.Lstat(path)
}

func (s *Session) Open(path string) (*sftp.File, error) {
	return s.client.Open(path)
}

func (s *Session) OpenFile(path string, flags int) (*sftp.File, error) {
	return s.client.OpenFile(path, flags)
}

func (s *Session) Create(path string) (*sftp.File, error) {
	return s.client.Create(path)
}

func (s *Session) Remove(path string) error {
	return s.client.Remove(path)
}

func (s *Session) RemoveDirectory(path string) error {
	return s.client.RemoveDirectory(path)
}

func (s *Session) Rename(oldPath, newPath string) error {
	return s.client.Rename(oldPath, newPath)
}

func (s *Session) PosixRename(oldPath, newPath string) error {
	return s.client.PosixRename(oldPath, newPath)
}

func (s *Session) Mkdir(path string) error {
	return s.client.Mkdir(path)
}

func (s *Session) MkdirAll(path string) error {
	return s.client.MkdirAll(path)
}

func (s *Session) Chmod(path string, mode os.FileMode) error {
	return s.client.Chmod(path, mode)
}

func (s *Session) Chown(path string, uid, gid int) error {
	return s.client.Chown(path, uid, gid)
}

func (s *Session) Chtimes(path string, atime, mtime time.Time) error {
	return s.client.Chtimes(path, atime, mtime)
}

func (s *Session) ReadLink(path string) (string, error) {
	return s.client.ReadLink(path)
}

func (s *Session) Symlink(target, link string) error {
	return s.client.Symlink(target, link)
}

func (s *Session) RealPath(path string) (string, error) {
	return s.client.RealPath(path)
}

func (s *Session) Getwd() (string, error) {
	return s.client.Getwd()
}

func (s *Session) Glob(pattern string) ([]string, error) {
	return s.client.Glob(pattern)
}
