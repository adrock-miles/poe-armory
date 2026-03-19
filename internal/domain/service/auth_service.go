package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
	"github.com/poe-armory/poe-armory/internal/domain/repository"
)

// AuthService handles authentication and session management.
type AuthService struct {
	profileRepo repository.ProfileRepository
	sessionRepo repository.SessionRepository
	maxAge      int
}

func NewAuthService(
	profileRepo repository.ProfileRepository,
	sessionRepo repository.SessionRepository,
	maxAge int,
) *AuthService {
	return &AuthService{
		profileRepo: profileRepo,
		sessionRepo: sessionRepo,
		maxAge:      maxAge,
	}
}

// CreateOrUpdateProfile creates or updates a profile after OAuth callback.
func (s *AuthService) CreateOrUpdateProfile(ctx context.Context, accountName, realm, accessToken, refreshToken string, expiresIn int) (*model.Profile, error) {
	profile := &model.Profile{
		AccountName:  accountName,
		Realm:        realm,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenExpiry:  time.Now().UTC().Add(time.Duration(expiresIn) * time.Second),
	}

	if err := s.profileRepo.Upsert(ctx, profile); err != nil {
		return nil, fmt.Errorf("upserting profile: %w", err)
	}

	// Re-fetch to get the ID (in case of update)
	profile, err := s.profileRepo.GetByAccountName(ctx, accountName)
	if err != nil {
		return nil, err
	}

	return profile, nil
}

// CreateSession creates a new browser session for a profile.
func (s *AuthService) CreateSession(ctx context.Context, profileID int64) (*model.Session, error) {
	id, err := generateSessionID()
	if err != nil {
		return nil, err
	}

	session := &model.Session{
		ID:        id,
		ProfileID: profileID,
		ExpiresAt: time.Now().UTC().Add(time.Duration(s.maxAge) * time.Second),
		CreatedAt: time.Now().UTC(),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("creating session: %w", err)
	}

	return session, nil
}

// ValidateSession checks if a session is valid and returns the associated profile.
func (s *AuthService) ValidateSession(ctx context.Context, sessionID string) (*model.Profile, error) {
	session, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("session not found or expired")
	}

	profile, err := s.profileRepo.GetByID(ctx, session.ProfileID)
	if err != nil {
		return nil, fmt.Errorf("profile not found")
	}

	return profile, nil
}

// Logout deletes a session.
func (s *AuthService) Logout(ctx context.Context, sessionID string) error {
	return s.sessionRepo.Delete(ctx, sessionID)
}

// GetProfile gets a profile by ID.
func (s *AuthService) GetProfile(ctx context.Context, id int64) (*model.Profile, error) {
	return s.profileRepo.GetByID(ctx, id)
}

// ListProfiles lists all registered profiles.
func (s *AuthService) ListProfiles(ctx context.Context) ([]model.Profile, error) {
	return s.profileRepo.ListAll(ctx)
}

// CleanupExpiredSessions removes expired sessions.
func (s *AuthService) CleanupExpiredSessions(ctx context.Context) error {
	return s.sessionRepo.DeleteExpired(ctx)
}

func generateSessionID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
