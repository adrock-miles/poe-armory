package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

func NewSQLiteDB(dbPath string) (*sql.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating database directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	db.SetMaxOpenConns(1)

	return db, nil
}

func RunMigrations(db *sql.DB) error {
	migrations := []string{
		// Profiles (authorized PoE accounts)
		`CREATE TABLE IF NOT EXISTS profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_name TEXT NOT NULL UNIQUE,
			realm TEXT NOT NULL DEFAULT 'pc',
			access_token TEXT NOT NULL DEFAULT '',
			refresh_token TEXT NOT NULL DEFAULT '',
			token_expiry DATETIME,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,

		// Sessions (browser auth sessions)
		`CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			profile_id INTEGER NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,

		// Characters (now linked to a profile)
		`CREATE TABLE IF NOT EXISTS characters (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER,
			account_name TEXT NOT NULL,
			name TEXT NOT NULL,
			league TEXT NOT NULL DEFAULT '',
			class_id INTEGER NOT NULL DEFAULT 0,
			class TEXT NOT NULL DEFAULT '',
			ascendancy TEXT NOT NULL DEFAULT '',
			level INTEGER NOT NULL DEFAULT 1,
			experience INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(account_name, name),
			FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
		)`,

		// Snapshots
		`CREATE TABLE IF NOT EXISTS snapshots (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			character_id INTEGER NOT NULL,
			level INTEGER NOT NULL DEFAULT 1,
			experience INTEGER NOT NULL DEFAULT 0,
			snapshot_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
		)`,

		// Items
		`CREATE TABLE IF NOT EXISTS items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			snapshot_id INTEGER NOT NULL,
			name TEXT NOT NULL DEFAULT '',
			type_line TEXT NOT NULL DEFAULT '',
			base_type TEXT NOT NULL DEFAULT '',
			frame_type INTEGER NOT NULL DEFAULT 0,
			slot TEXT NOT NULL DEFAULT '',
			icon_url TEXT NOT NULL DEFAULT '',
			ilvl INTEGER NOT NULL DEFAULT 0,
			identified INTEGER NOT NULL DEFAULT 1,
			corrupted INTEGER NOT NULL DEFAULT 0,
			raw_json TEXT NOT NULL DEFAULT '{}',
			FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
		)`,

		// Gems
		`CREATE TABLE IF NOT EXISTS gems (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			snapshot_id INTEGER NOT NULL,
			item_slot TEXT NOT NULL DEFAULT '',
			socket_group INTEGER NOT NULL DEFAULT 0,
			name TEXT NOT NULL DEFAULT '',
			type_line TEXT NOT NULL DEFAULT '',
			icon_url TEXT NOT NULL DEFAULT '',
			level INTEGER NOT NULL DEFAULT 1,
			quality INTEGER NOT NULL DEFAULT 0,
			is_support INTEGER NOT NULL DEFAULT 0,
			raw_json TEXT NOT NULL DEFAULT '{}',
			FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
		)`,

		// Passive trees
		`CREATE TABLE IF NOT EXISTS passive_trees (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			snapshot_id INTEGER NOT NULL UNIQUE,
			hashes_json TEXT NOT NULL DEFAULT '[]',
			masteries_json TEXT NOT NULL DEFAULT '[]',
			keystones_json TEXT NOT NULL DEFAULT '[]',
			jewels_json TEXT NOT NULL DEFAULT '[]',
			raw_json TEXT NOT NULL DEFAULT '{}',
			FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
		)`,

		// Public lookups (for shareable character pages)
		`CREATE TABLE IF NOT EXISTS public_lookups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_name TEXT NOT NULL,
			character_name TEXT NOT NULL DEFAULT '',
			share_code TEXT NOT NULL UNIQUE,
			data_json TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_profiles_account ON profiles(account_name)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
		`CREATE INDEX IF NOT EXISTS idx_characters_account ON characters(account_name)`,
		`CREATE INDEX IF NOT EXISTS idx_characters_profile ON characters(profile_id)`,
		`CREATE INDEX IF NOT EXISTS idx_characters_league ON characters(league)`,
		`CREATE INDEX IF NOT EXISTS idx_snapshots_character ON snapshots(character_id)`,
		`CREATE INDEX IF NOT EXISTS idx_items_snapshot ON items(snapshot_id)`,
		`CREATE INDEX IF NOT EXISTS idx_gems_snapshot ON gems(snapshot_id)`,
		`CREATE INDEX IF NOT EXISTS idx_public_lookups_share ON public_lookups(share_code)`,
		`CREATE INDEX IF NOT EXISTS idx_public_lookups_expires ON public_lookups(expires_at)`,
	}

	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("running migration: %w", err)
		}
	}

	return nil
}
