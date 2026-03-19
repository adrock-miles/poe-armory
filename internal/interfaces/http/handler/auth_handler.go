package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/service"
	"github.com/poe-armory/poe-armory/internal/infrastructure/config"
	"github.com/poe-armory/poe-armory/internal/infrastructure/poe_client"
)

// AuthHandler manages OAuth login/logout/callback flows.
type AuthHandler struct {
	authSvc     *service.AuthService
	charSvc     *service.CharacterService
	oauthClient *poe_client.OAuthClient
	cfg         *config.Config
	// In-memory PKCE/state store (keyed by state). For production, use DB or Redis.
	pendingAuth map[string]*pendingAuthState
}

type pendingAuthState struct {
	CodeVerifier string
	CreatedAt    time.Time
}

func NewAuthHandler(authSvc *service.AuthService, charSvc *service.CharacterService, oauthClient *poe_client.OAuthClient, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authSvc:     authSvc,
		charSvc:     charSvc,
		oauthClient: oauthClient,
		cfg:         cfg,
		pendingAuth: make(map[string]*pendingAuthState),
	}
}

// Login initiates the PoE OAuth flow.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if h.cfg.OAuth.ClientID == "" {
		writeError(w, http.StatusServiceUnavailable, "OAuth not configured. Set POE_ARMORY_OAUTH_CLIENT_ID and POE_ARMORY_OAUTH_CLIENT_SECRET.")
		return
	}

	pkce, err := poe_client.GeneratePKCE()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate PKCE")
		return
	}

	state, err := poe_client.GenerateState()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate state")
		return
	}

	h.pendingAuth[state] = &pendingAuthState{
		CodeVerifier: pkce.Verifier,
		CreatedAt:    time.Now(),
	}

	// Clean old pending states (> 5 min)
	for k, v := range h.pendingAuth {
		if time.Since(v.CreatedAt) > 5*time.Minute {
			delete(h.pendingAuth, k)
		}
	}

	authURL := h.oauthClient.AuthorizationURL(state, pkce.Challenge)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// Callback handles the OAuth callback from PoE.
func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		errMsg := r.URL.Query().Get("error_description")
		if errMsg == "" {
			errMsg = "missing code or state"
		}
		http.Redirect(w, r, "/?error="+errMsg, http.StatusTemporaryRedirect)
		return
	}

	pending, ok := h.pendingAuth[state]
	if !ok {
		http.Redirect(w, r, "/?error=invalid+state", http.StatusTemporaryRedirect)
		return
	}
	delete(h.pendingAuth, state)

	// Exchange code for token
	tokenResp, err := h.oauthClient.ExchangeCode(r.Context(), code, pending.CodeVerifier)
	if err != nil {
		log.Printf("Token exchange error: %v", err)
		http.Redirect(w, r, "/?error=token+exchange+failed", http.StatusTemporaryRedirect)
		return
	}

	// Fetch profile to get account name
	profileResp, err := h.oauthClient.GetProfile(r.Context(), tokenResp.AccessToken)
	if err != nil {
		log.Printf("Profile fetch error: %v", err)
		http.Redirect(w, r, "/?error=profile+fetch+failed", http.StatusTemporaryRedirect)
		return
	}

	// Create/update profile
	profile, err := h.authSvc.CreateOrUpdateProfile(
		r.Context(),
		profileResp.Name,
		profileResp.Realm,
		tokenResp.AccessToken,
		tokenResp.RefreshToken,
		tokenResp.ExpiresIn,
	)
	if err != nil {
		log.Printf("Profile create error: %v", err)
		http.Redirect(w, r, "/?error=profile+creation+failed", http.StatusTemporaryRedirect)
		return
	}

	// Auto-import characters using the OAuth token
	authClient := poe_client.NewAuthenticatedClient(tokenResp.AccessToken, h.cfg.PoE.UserAgent)
	_, importErr := h.charSvc.ImportCharactersWithClient(r.Context(), authClient, profile.AccountName, &profile.ID)
	if importErr != nil {
		log.Printf("Auto-import warning: %v", importErr)
	}

	// Create session
	session, err := h.authSvc.CreateSession(r.Context(), profile.ID)
	if err != nil {
		log.Printf("Session create error: %v", err)
		http.Redirect(w, r, "/?error=session+creation+failed", http.StatusTemporaryRedirect)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "poe_armory_session",
		Value:    session.ID,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   h.cfg.Session.MaxAge,
	})

	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}

// Logout destroys the session.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("poe_armory_session")
	if err == nil && cookie.Value != "" {
		h.authSvc.Logout(r.Context(), cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "poe_armory_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

// Me returns the current authenticated profile.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	profile := GetProfileFromContext(r)
	if profile == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"authenticated": false})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated": true,
		"profile": map[string]interface{}{
			"id":          profile.ID,
			"accountName": profile.AccountName,
			"realm":       profile.Realm,
		},
	})
}

// ListProfiles returns all registered profiles.
func (h *AuthHandler) ListProfiles(w http.ResponseWriter, r *http.Request) {
	profiles, err := h.authSvc.ListProfiles(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Strip tokens from response
	type safeProfile struct {
		ID          int64  `json:"id"`
		AccountName string `json:"accountName"`
		Realm       string `json:"realm"`
	}
	safe := make([]safeProfile, 0, len(profiles))
	for _, p := range profiles {
		safe = append(safe, safeProfile{ID: p.ID, AccountName: p.AccountName, Realm: p.Realm})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(safe)
}
