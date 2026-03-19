package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

type SQLiteProfileRepo struct {
	db *sql.DB
}

func NewProfileRepo(db *sql.DB) *SQLiteProfileRepo {
	return &SQLiteProfileRepo{db: db}
}

func (r *SQLiteProfileRepo) GetByID(ctx context.Context, id int64) (*model.Profile, error) {
	p := &model.Profile{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, account_name, realm, access_token, refresh_token, token_expiry, created_at, updated_at
		FROM profiles WHERE id = ?`, id).
		Scan(&p.ID, &p.AccountName, &p.Realm, &p.AccessToken, &p.RefreshToken, &p.TokenExpiry, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *SQLiteProfileRepo) GetByAccountName(ctx context.Context, accountName string) (*model.Profile, error) {
	p := &model.Profile{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, account_name, realm, access_token, refresh_token, token_expiry, created_at, updated_at
		FROM profiles WHERE account_name = ?`, accountName).
		Scan(&p.ID, &p.AccountName, &p.Realm, &p.AccessToken, &p.RefreshToken, &p.TokenExpiry, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *SQLiteProfileRepo) ListAll(ctx context.Context) ([]model.Profile, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, account_name, realm, access_token, refresh_token, token_expiry, created_at, updated_at
		FROM profiles ORDER BY account_name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []model.Profile
	for rows.Next() {
		var p model.Profile
		if err := rows.Scan(&p.ID, &p.AccountName, &p.Realm, &p.AccessToken, &p.RefreshToken, &p.TokenExpiry, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, rows.Err()
}

func (r *SQLiteProfileRepo) Upsert(ctx context.Context, p *model.Profile) error {
	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO profiles (account_name, realm, access_token, refresh_token, token_expiry, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(account_name) DO UPDATE SET
			access_token = excluded.access_token,
			refresh_token = excluded.refresh_token,
			token_expiry = excluded.token_expiry,
			updated_at = excluded.updated_at`,
		p.AccountName, p.Realm, p.AccessToken, p.RefreshToken, p.TokenExpiry, now, now)
	if err != nil {
		return fmt.Errorf("upserting profile: %w", err)
	}
	id, err := result.LastInsertId()
	if err == nil && id > 0 {
		p.ID = id
	}
	return nil
}

func (r *SQLiteProfileRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM profiles WHERE id = ?`, id)
	return err
}
