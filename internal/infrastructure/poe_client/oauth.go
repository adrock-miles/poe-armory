package poe_client

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	authorizeURL = "https://www.pathofexile.com/oauth/authorize"
	tokenURL     = "https://www.pathofexile.com/oauth/token"
	profileURL   = "https://www.pathofexile.com/api/profile"
)

// OAuthClient handles the PoE OAuth 2.1 flow with PKCE.
type OAuthClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	UserAgent    string
	httpClient   *http.Client
}

func NewOAuthClient(clientID, clientSecret, redirectURI, userAgent string) *OAuthClient {
	return &OAuthClient{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
		UserAgent:    userAgent,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// PKCEChallenge holds the code verifier and challenge for PKCE.
type PKCEChallenge struct {
	Verifier  string
	Challenge string
}

// GeneratePKCE creates a new PKCE verifier/challenge pair.
func GeneratePKCE() (*PKCEChallenge, error) {
	verifierBytes := make([]byte, 32)
	if _, err := rand.Read(verifierBytes); err != nil {
		return nil, fmt.Errorf("generating random bytes: %w", err)
	}
	verifier := base64.RawURLEncoding.EncodeToString(verifierBytes)

	h := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(h[:])

	return &PKCEChallenge{
		Verifier:  verifier,
		Challenge: challenge,
	}, nil
}

// GenerateState creates a random state string for CSRF protection.
func GenerateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// AuthorizationURL builds the PoE OAuth authorization URL.
func (c *OAuthClient) AuthorizationURL(state, codeChallenge string) string {
	params := url.Values{
		"client_id":             {c.ClientID},
		"response_type":        {"code"},
		"scope":                {"account:profile account:characters account:stashes"},
		"state":                {state},
		"redirect_uri":         {c.RedirectURI},
		"code_challenge":       {codeChallenge},
		"code_challenge_method": {"S256"},
	}
	return authorizeURL + "?" + params.Encode()
}

// TokenResponse is the response from the token endpoint.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

// ExchangeCode exchanges an authorization code for tokens.
func (c *OAuthClient) ExchangeCode(ctx context.Context, code, codeVerifier string) (*TokenResponse, error) {
	data := url.Values{
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {c.RedirectURI},
		"code_verifier": {codeVerifier},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("creating token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", c.UserAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("exchanging code: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("parsing token response: %w", err)
	}
	return &tokenResp, nil
}

// ProfileResponse is the account profile from the PoE API.
type ProfileResponse struct {
	Name  string `json:"name"`
	Realm string `json:"realm"`
}

// GetProfile fetches the authenticated user's profile.
func (c *OAuthClient) GetProfile(ctx context.Context, accessToken string) (*ProfileResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, profileURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("User-Agent", c.UserAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching profile: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("profile request failed (%d): %s", resp.StatusCode, string(body))
	}

	var profile ProfileResponse
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, fmt.Errorf("parsing profile: %w", err)
	}
	return &profile, nil
}

// NewAuthenticatedClient creates a PoE API client using an OAuth access token.
func NewAuthenticatedClient(accessToken, userAgent string) *Client {
	c := &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		userAgent:  userAgent,
	}
	c.accessToken = accessToken
	return c
}
