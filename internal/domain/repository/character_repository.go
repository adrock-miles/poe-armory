package repository

import (
	"context"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

// CharacterRepository defines the persistence contract for characters.
type CharacterRepository interface {
	GetByID(ctx context.Context, id int64) (*model.Character, error)
	GetByAccountAndName(ctx context.Context, accountName, name string) (*model.Character, error)
	ListByFilter(ctx context.Context, filter model.CharacterFilter) ([]model.Character, error)
	ListAll(ctx context.Context) ([]model.Character, error)
	ListLeagues(ctx context.Context) ([]string, error)
	ListAccounts(ctx context.Context) ([]string, error)
	Upsert(ctx context.Context, char *model.Character) error
	Delete(ctx context.Context, id int64) error
	DeleteMany(ctx context.Context, ids []int64) error
}

// SnapshotRepository defines the persistence contract for character snapshots.
type SnapshotRepository interface {
	Create(ctx context.Context, snapshot *model.CharacterSnapshot) error
	GetByID(ctx context.Context, id int64) (*model.CharacterSnapshot, error)
	ListByCharacterID(ctx context.Context, characterID int64) ([]model.CharacterSnapshot, error)
	GetLatestByCharacterID(ctx context.Context, characterID int64) (*model.CharacterSnapshot, error)
	Delete(ctx context.Context, id int64) error
}
