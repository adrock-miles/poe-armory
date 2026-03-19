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
	ListAll(ctx context.Context) ([]model.Character, error)
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
