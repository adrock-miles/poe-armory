package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/poe-armory/poe-armory/internal/domain/service"
)

// PublicHandler manages public profile lookups.
type PublicHandler struct {
	publicSvc *service.PublicService
}

func NewPublicHandler(publicSvc *service.PublicService) *PublicHandler {
	return &PublicHandler{publicSvc: publicSvc}
}

type publicLookupRequest struct {
	AccountName   string `json:"accountName"`
	CharacterName string `json:"characterName"`
}

// LookupCharacter fetches a public character and creates a shareable link.
func (h *PublicHandler) LookupCharacter(w http.ResponseWriter, r *http.Request) {
	var req publicLookupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.AccountName == "" || req.CharacterName == "" {
		writeError(w, http.StatusBadRequest, "accountName and characterName are required")
		return
	}

	lookup, data, err := h.publicSvc.LookupPublicCharacter(r.Context(), req.AccountName, req.CharacterName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"shareCode": lookup.ShareCode,
		"expiresAt": lookup.ExpiresAt,
		"data":      data,
	})
}

// GetSharedCharacter retrieves a shared character by code.
func (h *PublicHandler) GetSharedCharacter(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]
	if code == "" {
		writeError(w, http.StatusBadRequest, "share code required")
		return
	}

	data, err := h.publicSvc.GetSharedCharacter(r.Context(), code)
	if err != nil {
		writeError(w, http.StatusNotFound, "share link not found or expired")
		return
	}

	writeJSON(w, http.StatusOK, data)
}
