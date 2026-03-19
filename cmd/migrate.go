package cmd

import (
	"log"

	"github.com/spf13/cobra"

	"github.com/poe-armory/poe-armory/internal/infrastructure/config"
	"github.com/poe-armory/poe-armory/internal/infrastructure/database"
)

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Run database migrations",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}

		db, err := database.NewSQLiteDB(cfg.Database.Path)
		if err != nil {
			return err
		}
		defer db.Close()

		if err := database.RunMigrations(db); err != nil {
			return err
		}

		log.Println("Migrations completed successfully")
		return nil
	},
}

func init() {
	rootCmd.AddCommand(migrateCmd)
}
