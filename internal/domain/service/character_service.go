package service

import (
	"context"
	"fmt"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
	"github.com/poe-armory/poe-armory/internal/domain/repository"
)

// PoeAPIClient defines the contract for fetching character data from the PoE public API.
type PoeAPIClient interface {
	GetCharacters(ctx context.Context, accountName string) ([]model.Character, error)
	GetItems(ctx context.Context, accountName, characterName string) ([]model.Item, []model.Gem, error)
	GetPassiveTree(ctx context.Context, accountName, characterName string) (*model.PassiveTree, error)
}

// CharacterService contains the core business logic for character management.
type CharacterService struct {
	charRepo     repository.CharacterRepository
	snapshotRepo repository.SnapshotRepository
	poeClient    PoeAPIClient
}

func NewCharacterService(
	charRepo repository.CharacterRepository,
	snapshotRepo repository.SnapshotRepository,
	poeClient PoeAPIClient,
) *CharacterService {
	return &CharacterService{
		charRepo:     charRepo,
		snapshotRepo: snapshotRepo,
		poeClient:    poeClient,
	}
}

// ImportCharacters fetches all public characters for an account and upserts them.
func (s *CharacterService) ImportCharacters(ctx context.Context, accountName string) ([]model.Character, error) {
	characters, err := s.poeClient.GetCharacters(ctx, accountName)
	if err != nil {
		return nil, fmt.Errorf("fetching characters from PoE API: %w", err)
	}

	for i := range characters {
		characters[i].AccountName = accountName
		if err := s.charRepo.Upsert(ctx, &characters[i]); err != nil {
			return nil, fmt.Errorf("upserting character %s: %w", characters[i].Name, err)
		}
	}

	return characters, nil
}

// SnapshotCharacter creates a point-in-time snapshot of a character's full state.
func (s *CharacterService) SnapshotCharacter(ctx context.Context, accountName, characterName string) (*model.CharacterSnapshot, error) {
	char, err := s.charRepo.GetByAccountAndName(ctx, accountName, characterName)
	if err != nil {
		return nil, fmt.Errorf("finding character: %w", err)
	}

	items, gems, err := s.poeClient.GetItems(ctx, accountName, characterName)
	if err != nil {
		return nil, fmt.Errorf("fetching items: %w", err)
	}

	tree, err := s.poeClient.GetPassiveTree(ctx, accountName, characterName)
	if err != nil {
		return nil, fmt.Errorf("fetching passive tree: %w", err)
	}

	snapshot := &model.CharacterSnapshot{
		CharacterID: char.ID,
		Level:       char.Level,
		Experience:  char.Experience,
		SnapshotAt:  time.Now().UTC(),
		Items:       items,
		Gems:        gems,
		PassiveTree: tree,
	}

	if err := s.snapshotRepo.Create(ctx, snapshot); err != nil {
		return nil, fmt.Errorf("saving snapshot: %w", err)
	}

	return snapshot, nil
}

// GetCharacter retrieves a character by ID.
func (s *CharacterService) GetCharacter(ctx context.Context, id int64) (*model.Character, error) {
	return s.charRepo.GetByID(ctx, id)
}

// ListCharacters lists characters with optional filters.
func (s *CharacterService) ListCharacters(ctx context.Context, filter model.CharacterFilter) ([]model.Character, error) {
	return s.charRepo.ListByFilter(ctx, filter)
}

// ListLeagues returns all distinct leagues with characters.
func (s *CharacterService) ListLeagues(ctx context.Context) ([]string, error) {
	return s.charRepo.ListLeagues(ctx)
}

// ListAccounts returns all distinct account names.
func (s *CharacterService) ListAccounts(ctx context.Context) ([]string, error) {
	return s.charRepo.ListAccounts(ctx)
}

// GetSnapshots lists all snapshots for a character.
func (s *CharacterService) GetSnapshots(ctx context.Context, characterID int64) ([]model.CharacterSnapshot, error) {
	return s.snapshotRepo.ListByCharacterID(ctx, characterID)
}

// GetSnapshot retrieves a single snapshot with full data.
func (s *CharacterService) GetSnapshot(ctx context.Context, snapshotID int64) (*model.CharacterSnapshot, error) {
	return s.snapshotRepo.GetByID(ctx, snapshotID)
}

// GetLatestSnapshot retrieves the most recent snapshot for a character.
func (s *CharacterService) GetLatestSnapshot(ctx context.Context, characterID int64) (*model.CharacterSnapshot, error) {
	return s.snapshotRepo.GetLatestByCharacterID(ctx, characterID)
}

// DeleteCharacter removes a character and its data.
func (s *CharacterService) DeleteCharacter(ctx context.Context, id int64) error {
	return s.charRepo.Delete(ctx, id)
}
