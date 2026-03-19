package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

type SQLiteCharacterRepo struct {
	db *sql.DB
}

func NewCharacterRepo(db *sql.DB) *SQLiteCharacterRepo {
	return &SQLiteCharacterRepo{db: db}
}

func (r *SQLiteCharacterRepo) GetByID(ctx context.Context, id int64) (*model.Character, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, account_name, name, league, class_id, class, ascendancy, level, experience, created_at, updated_at
		FROM characters WHERE id = ?`, id)
	return scanCharacter(row)
}

func (r *SQLiteCharacterRepo) GetByAccountAndName(ctx context.Context, accountName, name string) (*model.Character, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, account_name, name, league, class_id, class, ascendancy, level, experience, created_at, updated_at
		FROM characters WHERE account_name = ? AND name = ?`, accountName, name)
	return scanCharacter(row)
}

func (r *SQLiteCharacterRepo) ListByAccount(ctx context.Context, accountName string) ([]model.Character, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, account_name, name, league, class_id, class, ascendancy, level, experience, created_at, updated_at
		FROM characters WHERE account_name = ? ORDER BY level DESC, name ASC`, accountName)
	if err != nil {
		return nil, fmt.Errorf("querying characters: %w", err)
	}
	defer rows.Close()
	return scanCharacters(rows)
}

func (r *SQLiteCharacterRepo) ListAll(ctx context.Context) ([]model.Character, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, account_name, name, league, class_id, class, ascendancy, level, experience, created_at, updated_at
		FROM characters ORDER BY updated_at DESC, level DESC`)
	if err != nil {
		return nil, fmt.Errorf("querying characters: %w", err)
	}
	defer rows.Close()
	return scanCharacters(rows)
}

func (r *SQLiteCharacterRepo) Upsert(ctx context.Context, char *model.Character) error {
	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `
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

	id, err := result.LastInsertId()
	if err == nil && id > 0 {
		char.ID = id
	}
	char.UpdatedAt = now
	return nil
}

func (r *SQLiteCharacterRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM characters WHERE id = ?`, id)
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
