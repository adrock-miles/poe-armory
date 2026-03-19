package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
	"github.com/poe-armory/poe-armory/internal/domain/repository"
)

// PublicService handles public profile lookups and shareable links.
type PublicService struct {
	lookupRepo repository.PublicLookupRepository
	poeClient  PoeAPIClient
}

func NewPublicService(
	lookupRepo repository.PublicLookupRepository,
	poeClient PoeAPIClient,
) *PublicService {
	return &PublicService{
		lookupRepo: lookupRepo,
		poeClient:  poeClient,
	}
}

// PublicCharacterData is the full character data for a public lookup.
type PublicCharacterData struct {
	Character model.Character  `json:"character"`
	Items     []model.Item     `json:"items"`
	Gems      []model.Gem      `json:"gems"`
	Tree      *model.PassiveTree `json:"passiveTree"`
}

// LookupPublicCharacter fetches character data from the PoE API and creates a shareable link.
func (s *PublicService) LookupPublicCharacter(ctx context.Context, accountName, characterName string) (*model.PublicLookup, *PublicCharacterData, error) {
	// Fetch all data from PoE API
	chars, err := s.poeClient.GetCharacters(ctx, accountName)
	if err != nil {
		return nil, nil, fmt.Errorf("fetching characters: %w", err)
	}

	var character *model.Character
	for i := range chars {
		if chars[i].Name == characterName {
			character = &chars[i]
			break
		}
	}
	if character == nil {
		return nil, nil, fmt.Errorf("character %q not found on account %q", characterName, accountName)
	}

	items, gems, err := s.poeClient.GetItems(ctx, accountName, characterName)
	if err != nil {
		return nil, nil, fmt.Errorf("fetching items: %w", err)
	}

	tree, err := s.poeClient.GetPassiveTree(ctx, accountName, characterName)
	if err != nil {
		return nil, nil, fmt.Errorf("fetching tree: %w", err)
	}

	data := &PublicCharacterData{
		Character: *character,
		Items:     items,
		Gems:      gems,
		Tree:      tree,
	}

	// Generate share code and persist
	code, err := generateShareCode()
	if err != nil {
		return nil, nil, err
	}

	dataJSON, err := json.Marshal(data)
	if err != nil {
		return nil, nil, fmt.Errorf("marshaling data: %w", err)
	}

	lookup := &model.PublicLookup{
		AccountName: accountName,
		ShareCode:   code,
		DataJSON:    string(dataJSON),
		ExpiresAt:   time.Now().UTC().Add(24 * time.Hour),
	}

	if err := s.lookupRepo.Create(ctx, lookup); err != nil {
		return nil, nil, fmt.Errorf("saving lookup: %w", err)
	}

	return lookup, data, nil
}

// GetSharedCharacter retrieves a previously looked-up character by share code.
func (s *PublicService) GetSharedCharacter(ctx context.Context, shareCode string) (*PublicCharacterData, error) {
	lookup, err := s.lookupRepo.GetByShareCode(ctx, shareCode)
	if err != nil {
		return nil, fmt.Errorf("share link not found or expired")
	}

	var data PublicCharacterData
	if err := json.Unmarshal([]byte(lookup.DataJSON), &data); err != nil {
		return nil, fmt.Errorf("parsing stored data: %w", err)
	}

	return &data, nil
}

func generateShareCode() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
