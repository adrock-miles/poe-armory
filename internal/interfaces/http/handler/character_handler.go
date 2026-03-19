package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"

	"github.com/poe-armory/poe-armory/internal/domain/model"
	"github.com/poe-armory/poe-armory/internal/domain/service"
)

type CharacterHandler struct {
	svc *service.CharacterService
}

func NewCharacterHandler(svc *service.CharacterService) *CharacterHandler {
	return &CharacterHandler{svc: svc}
}

type importRequest struct {
	AccountName string `json:"accountName"`
}

func (h *CharacterHandler) ImportCharacters(w http.ResponseWriter, r *http.Request) {
	var req importRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.AccountName == "" {
		writeError(w, http.StatusBadRequest, "accountName is required")
		return
	}

	chars, err := h.svc.ImportCharacters(r.Context(), req.AccountName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, chars)
}

func (h *CharacterHandler) ListCharacters(w http.ResponseWriter, r *http.Request) {
	filter := model.CharacterFilter{
		AccountName: r.URL.Query().Get("account"),
		League:      r.URL.Query().Get("league"),
		Class:       r.URL.Query().Get("class"),
	}

	chars, err := h.svc.ListCharacters(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if chars == nil {
		writeJSON(w, http.StatusOK, []struct{}{})
		return
	}
	writeJSON(w, http.StatusOK, chars)
}

func (h *CharacterHandler) ListLeagues(w http.ResponseWriter, r *http.Request) {
	leagues, err := h.svc.ListLeagues(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if leagues == nil {
		leagues = []string{}
	}
	writeJSON(w, http.StatusOK, leagues)
}

func (h *CharacterHandler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.svc.ListAccounts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if accounts == nil {
		accounts = []string{}
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (h *CharacterHandler) GetCharacter(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	char, err := h.svc.GetCharacter(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}
	writeJSON(w, http.StatusOK, char)
}

func (h *CharacterHandler) DeleteCharacter(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	if err := h.svc.DeleteCharacter(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *CharacterHandler) SnapshotCharacter(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)

	char, err := h.svc.GetCharacter(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	snapshot, err := h.svc.SnapshotCharacter(r.Context(), char.AccountName, char.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, snapshot)
}

func (h *CharacterHandler) ListSnapshots(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	snapshots, err := h.svc.GetSnapshots(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, snapshots)
}

func (h *CharacterHandler) GetLatestSnapshot(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	snapshot, err := h.svc.GetLatestSnapshot(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "no snapshots found")
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func (h *CharacterHandler) GetSnapshot(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	snapshot, err := h.svc.GetSnapshot(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "snapshot not found")
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
