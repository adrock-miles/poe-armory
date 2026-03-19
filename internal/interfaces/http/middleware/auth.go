package middleware

import (
	"context"
	"net/http"

	"github.com/poe-armory/poe-armory/internal/domain/model"
	"github.com/poe-armory/poe-armory/internal/domain/service"
)

type contextKey string

const profileContextKey contextKey = "profile"

// Auth middleware validates the session and injects the profile into context.
// It does NOT block unauthenticated requests — handlers decide if auth is required.
func Auth(authSvc *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("poe_armory_session")
			if err == nil && cookie.Value != "" {
				profile, err := authSvc.ValidateSession(r.Context(), cookie.Value)
				if err == nil {
					ctx := context.WithValue(r.Context(), profileContextKey, profile)
					r = r.WithContext(ctx)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ProfileFromContext extracts the profile from the request context.
func ProfileFromContext(ctx context.Context) *model.Profile {
	p, _ := ctx.Value(profileContextKey).(*model.Profile)
	return p
}

// RequireAuth middleware blocks unauthenticated requests.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if ProfileFromContext(r.Context()) == nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"authentication required"}`))
			return
		}
		next(w, r)
	}
}
