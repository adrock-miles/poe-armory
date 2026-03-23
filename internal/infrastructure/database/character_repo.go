package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

type SQLiteCharacterRepo struct {
	db *sql.DB
}

func NewCharacterRepo(db *sql.DB) *SQLiteCharacterRepo {
	return &SQLiteCharacterRepo{db: db}
}

const charCols = `id, account_name, name, league, class_id, class, ascendancy, level, experience, created_at, updated_at`

func (r *SQLiteCharacterRepo) GetByID(ctx context.Context, id int64) (*model.Character, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+charCols+` FROM characters WHERE id = ?`, id)
	return scanCharacter(row)
}

func (r *SQLiteCharacterRepo) GetByAccountAndName(ctx context.Context, accountName, name string) (*model.Character, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+charCols+` FROM characters WHERE account_name = ? AND name = ?`, accountName, name)
	return scanCharacter(row)
}

func (r *SQLiteCharacterRepo) ListByFilter(ctx context.Context, filter model.CharacterFilter) ([]model.Character, error) {
	var conditions []string
	var args []interface{}

	if filter.AccountName != "" {
		conditions = append(conditions, "account_name = ?")
		args = append(args, filter.AccountName)
	}
	if filter.League != "" {
		conditions = append(conditions, "league = ?")
		args = append(args, filter.League)
	}
	if filter.Class != "" {
		conditions = append(conditions, "(class = ? OR ascendancy = ?)")
		args = append(args, filter.Class, filter.Class)
	}

	query := `SELECT ` + charCols + ` FROM characters`
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY league ASC, level DESC, name ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying characters: %w", err)
	}
	defer rows.Close()
	return scanCharacters(rows)
}

func (r *SQLiteCharacterRepo) ListAll(ctx context.Context) ([]model.Character, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+charCols+` FROM characters ORDER BY league ASC, level DESC, name ASC`)
	if err != nil {
		return nil, fmt.Errorf("querying characters: %w", err)
	}
	defer rows.Close()
	return scanCharacters(rows)
}

func (r *SQLiteCharacterRepo) ListLeagues(ctx context.Context) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT DISTINCT league FROM characters WHERE league != '' ORDER BY league ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leagues []string
	for rows.Next() {
		var l string
		if err := rows.Scan(&l); err != nil {
			return nil, err
		}
		leagues = append(leagues, l)
	}
	return leagues, rows.Err()
}

func (r *SQLiteCharacterRepo) ListAccounts(ctx context.Context) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT DISTINCT account_name FROM characters ORDER BY account_name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []string
	for rows.Next() {
		var a string
		if err := rows.Scan(&a); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, rows.Err()
}

func (r *SQLiteCharacterRepo) Upsert(ctx context.Context, char *model.Character) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO characters (account_name, name, league, class_id, class, ascendancy, level, experience, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(account_name, name) DO UPDATE SET
			league = excluded.league,
			class_id = excluded.class_id,
			class = excluded.class,
			ascendancy = excluded.ascendancy,
			level = excluded.level,
			experience = excluded.experience,
			updated_at = excluded.updated_at`,
		char.AccountName, char.Name, char.League, char.ClassID, char.Class,
		char.Ascendancy, char.Level, char.Experience, now, now)
	if err != nil {
		return fmt.Errorf("upserting character: %w", err)
	}

	// Always query back the actual ID — LastInsertId() is unreliable for
	// ON CONFLICT DO UPDATE (SQLite doesn't update last_insert_rowid on the
	// update path, so it returns a stale value from a previous insert).
	err = r.db.QueryRowContext(ctx,
		`SELECT id FROM characters WHERE account_name = ? AND name = ?`,
		char.AccountName, char.Name).Scan(&char.ID)
	if err != nil {
		return fmt.Errorf("retrieving character id after upsert: %w", err)
	}

	char.UpdatedAt = now
	return nil
}

func (r *SQLiteCharacterRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM characters WHERE id = ?`, id)
	return err
}

func (r *SQLiteCharacterRepo) DeleteMany(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}
	query := `DELETE FROM characters WHERE id IN (` + strings.Join(placeholders, ",") + `)`
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func scanCharacter(row *sql.Row) (*model.Character, error) {
	var c model.Character
	err := row.Scan(&c.ID, &c.AccountName, &c.Name, &c.League, &c.ClassID,
		&c.Class, &c.Ascendancy, &c.Level, &c.Experience, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func scanCharacters(rows *sql.Rows) ([]model.Character, error) {
	var chars []model.Character
	for rows.Next() {
		var c model.Character
		if err := rows.Scan(&c.ID, &c.AccountName, &c.Name, &c.League, &c.ClassID,
			&c.Class, &c.Ascendancy, &c.Level, &c.Experience, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		chars = append(chars, c)
	}
	return chars, rows.Err()
}
