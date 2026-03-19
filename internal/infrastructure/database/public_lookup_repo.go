package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

type SQLitePublicLookupRepo struct {
	db *sql.DB
}

func NewPublicLookupRepo(db *sql.DB) *SQLitePublicLookupRepo {
	return &SQLitePublicLookupRepo{db: db}
}

func (r *SQLitePublicLookupRepo) Create(ctx context.Context, lookup *model.PublicLookup) error {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO public_lookups (account_name, character_name, share_code, data_json, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		lookup.AccountName, lookup.ShareCode, lookup.ShareCode, lookup.DataJSON, time.Now().UTC(), lookup.ExpiresAt)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	lookup.ID = id
	return nil
}

func (r *SQLitePublicLookupRepo) GetByShareCode(ctx context.Context, code string) (*model.PublicLookup, error) {
	l := &model.PublicLookup{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, account_name, character_name, share_code, data_json, created_at, expires_at
		FROM public_lookups WHERE share_code = ? AND expires_at > ?`, code, time.Now().UTC()).
		Scan(&l.ID, &l.AccountName, &l.ShareCode, &l.ShareCode, &l.DataJSON, &l.CreatedAt, &l.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return l, nil
}

func (r *SQLitePublicLookupRepo) DeleteExpired(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM public_lookups WHERE expires_at < ?`, time.Now().UTC())
	return err
}
