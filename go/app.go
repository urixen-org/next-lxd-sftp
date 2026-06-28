package app

type Config struct {
	Address    string
	CertFile   string
	KeyFile    string
	Insecure   bool
	UserAgent  string
}

type Client struct {
	config    Config
	connector *Connector
}

func New(config Config) (*Client, error) {
	if config.UserAgent == "" {
		config.UserAgent = "next-lxd/1.0"
	}

	connector, err := NewConnector(config)
	if err != nil {
		return nil, err
	}

	return &Client{
		config:    config,
		connector: connector,
	}, nil
}

func (c *Client) Connect(instance string) (*Session, error) {
	return c.connector.Connect(instance)
}
