package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	PoE      PoEConfig      `mapstructure:"poe"`
	OAuth    OAuthConfig    `mapstructure:"oauth"`
	Session  SessionConfig  `mapstructure:"session"`
}

type ServerConfig struct {
	Port    int    `mapstructure:"port"`
	Host    string `mapstructure:"host"`
	BaseURL string `mapstructure:"base_url"`
}

type DatabaseConfig struct {
	Path string `mapstructure:"path"`
}

type PoEConfig struct {
	UserAgent string `mapstructure:"user_agent"`
}

type OAuthConfig struct {
	ClientID     string `mapstructure:"client_id"`
	ClientSecret string `mapstructure:"client_secret"`
	RedirectURI  string `mapstructure:"redirect_uri"`
}

type SessionConfig struct {
	Secret   string `mapstructure:"secret"`
	MaxAge   int    `mapstructure:"max_age"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.base_url", "http://localhost:8080")
	viper.SetDefault("database.path", "./data/poe-armory.db")
	viper.SetDefault("poe.user_agent", "PoeArmory/1.0")
	viper.SetDefault("session.secret", "change-me-in-production")
	viper.SetDefault("session.max_age", 36000) // 10 hours, matches PoE token lifetime

	viper.SetEnvPrefix("POE_ARMORY")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Railway sets PORT env var
	viper.BindEnv("server.port", "PORT")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config: %w", err)
		}
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	return &cfg, nil
}
