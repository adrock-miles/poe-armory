package cmd

import (
	"log"

	"github.com/spf13/cobra"

	"github.com/poe-armory/poe-armory/internal/application"
	"github.com/poe-armory/poe-armory/internal/infrastructure/config"
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the HTTP server",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}

		app, err := application.New(cfg)
		if err != nil {
			return err
		}
		defer app.Close()

		log.Println("PoE Armory server starting...")
		return app.Run()
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
}
