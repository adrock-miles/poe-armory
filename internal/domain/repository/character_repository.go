package repository

import (
	"context"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

// CharacterRepository defines the persistence contract for characters.
type CharacterRepository interface {
	GetByID(ctx context.Context, id int64) (*model.Character, error)
	GetByAccountAndName(ctx context.Context, accountName, name string) (*model.Character, error)
	ListByAccount(ctx context.Context, accountName string) ([]model.Character, error)
	ListByFilter(ctx context.Context, filter model.CharacterFilter) ([]model.Character, error)
	ListAll(ctx context.Context) ([]model.Character, error)
	ListLeagues(ctx context.Context) ([]string, error)
	Upsert(ctx context.Context, char *model.Character) error
	Delete(ctx context.Context, id int64) error
}

// SnapshotRepository defines the persistence contract for character snapshots.
type SnapshotRepository interface {
	Create(ctx context.Context, snapshot *model.CharacterSnapshot) error
	GetByID(ctx context.Context, id int64) (*model.CharacterSnapshot, error)
	ListByCharacterID(ctx context.Context, characterID int64) ([]model.CharacterSnapshot, error)
	GetLatestByCharacterID(ctx context.Context, characterID int64) (*model.CharacterSnapshot, error)
	Delete(ctx context.Context, id int64) error
}

// ProfileRepository defines the persistence contract for profiles.
type ProfileRepository interface {
	GetByID(ctx context.Context, id int64) (*model.Profile, error)
	GetByAccountName(ctx context.Context, accountName string) (*model.Profile, error)
	ListAll(ctx context.Context) ([]model.Profile, error)
	Upsert(ctx context.Context, profile *model.Profile) error
	Delete(ctx context.Context, id int64) error
}

// SessionRepository defines the persistence contract for sessions.
type SessionRepository interface {
	Create(ctx context.Context, session *model.Session) error
	GetByID(ctx context.Context, id string) (*model.Session, error)
	Delete(ctx context.Context, id string) error
	DeleteExpired(ctx context.Context) error
	DeleteByProfileID(ctx context.Context, profileID int64) error
}

// PublicLookupRepository defines the persistence contract for public lookups.
type PublicLookupRepository interface {
	Create(ctx context.Context, lookup *model.PublicLookup) error
	GetByShareCode(ctx context.Context, code string) (*model.PublicLookup, error)
	DeleteExpired(ctx context.Context) error
}
