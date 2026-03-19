package model

import "time"

// Profile represents an authorized PoE account linked to this app.
type Profile struct {
	ID           int64     `json:"id"`
	AccountName  string    `json:"accountName"`
	Realm        string    `json:"realm"`
	AccessToken  string    `json:"-"`
	RefreshToken string    `json:"-"`
	TokenExpiry  time.Time `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Session represents an authenticated browser session.
type Session struct {
	ID        string    `json:"id"`
	ProfileID int64     `json:"profileId"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

// PublicLookup represents a cached public profile lookup for sharing.
type PublicLookup struct {
	ID          int64     `json:"id"`
	AccountName string    `json:"accountName"`
	ShareCode   string    `json:"shareCode"`
	DataJSON    string    `json:"-"`
	CreatedAt   time.Time `json:"createdAt"`
	ExpiresAt   time.Time `json:"expiresAt"`
}
