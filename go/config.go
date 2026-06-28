package app

import "crypto/tls"

func CreateTLSConfig(config Config) (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(config.CertFile, config.KeyFile)
	if err != nil {
		return nil, err
	}

	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		InsecureSkipVerify: config.Insecure,
		ServerName: "localhost",
	}, nil
}
