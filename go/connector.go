package app

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/pkg/sftp"
)

type Connector struct {
	config Config
	tls    *tls.Config
}

func NewConnector(config Config) (*Connector, error) {
	tlsConfig, err := CreateTLSConfig(config)
	if err != nil {
		return nil, err
	}

	return &Connector{
		config: config,
		tls:    tlsConfig,
	}, nil
}

func (c *Connector) Connect(instance string) (*Session, error) {
	apiURL := &url.URL{
		Scheme: "https",
		Host:   c.config.Address,
		Path:   path.Join("/1.0/instances", instance, "sftp"),
	}

	dialer := tls.Dialer{
		Config: c.tls,
	}

	conn, err := dialer.DialContext(context.Background(), "tcp", apiURL.Host)
	if err != nil {
		return nil, err
	}

	tlsConn := conn.(*tls.Conn)

	req := &http.Request{
		Method:     http.MethodGet,
		URL:        apiURL,
		Proto:      "HTTP/1.1",
		ProtoMajor: 1,
		ProtoMinor: 1,
		Host:       apiURL.Host,
		Header:     make(http.Header),
	}

	req.Header.Set("Upgrade", "sftp")
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("User-Agent", c.config.UserAgent)

	if err := req.Write(tlsConn); err != nil {
		tlsConn.Close()
		return nil, err
	}

	resp, err := http.ReadResponse(bufio.NewReader(tlsConn), req)
	if err != nil {
		tlsConn.Close()
		return nil, err
	}

	if resp.StatusCode != http.StatusSwitchingProtocols {
		tlsConn.Close()
		return nil, fmt.Errorf("expected HTTP 101, got %s", resp.Status)
	}

	if !strings.EqualFold(resp.Header.Get("Upgrade"), "sftp") {
		tlsConn.Close()
		return nil, fmt.Errorf("server refused SFTP upgrade")
	}

	client, err := sftp.NewClientPipe(tlsConn, tlsConn)
	if err != nil {
		tlsConn.Close()
		return nil, err
	}

	return &Session{
		conn:     tlsConn,
		client:   client,
		instance: instance,
	}, nil
}
