package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

type SQLiteSessionRepo struct {
	db *sql.DB
}

func NewSessionRepo(db *sql.DB) *SQLiteSessionRepo {
	return &SQLiteSessionRepo{db: db}
}

func (r *SQLiteSessionRepo) Create(ctx context.Context, s *model.Session) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO sessions (id, profile_id, expires_at, created_at)
		VALUES (?, ?, ?, ?)`, s.ID, s.ProfileID, s.ExpiresAt, time.Now().UTC())
	return err
}

func (r *SQLiteSessionRepo) GetByID(ctx context.Context, id string) (*model.Session, error) {
	s := &model.Session{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, profile_id, expires_at, created_at
		FROM sessions WHERE id = ? AND expires_at > ?`, id, time.Now().UTC()).
		Scan(&s.ID, &s.ProfileID, &s.ExpiresAt, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SQLiteSessionRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, id)
	return err
}

func (r *SQLiteSessionRepo) DeleteExpired(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at < ?`, time.Now().UTC())
	return err
}

func (r *SQLiteSessionRepo) DeleteByProfileID(ctx context.Context, profileID int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sessions WHERE profile_id = ?`, profileID)
	return err
}
