package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var rootCmd = &cobra.Command{
	Use:   "poe-armory",
	Short: "PoE Armory - Path of Exile Character Tracker",
	Long:  "A tool to import, snapshot, and track Path of Exile 1 character builds over time.",
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().String("config", "", "config file (default is ./config.yaml)")
	rootCmd.PersistentFlags().Int("port", 8080, "server port")
	rootCmd.PersistentFlags().String("db", "./data/poe-armory.db", "database file path")

	viper.BindPFlag("server.port", rootCmd.PersistentFlags().Lookup("port"))
	viper.BindPFlag("database.path", rootCmd.PersistentFlags().Lookup("db"))
}
