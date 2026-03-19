package application

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"github.com/poe-armory/poe-armory/internal/domain/service"
	"github.com/poe-armory/poe-armory/internal/infrastructure/config"
	"github.com/poe-armory/poe-armory/internal/infrastructure/database"
	"github.com/poe-armory/poe-armory/internal/infrastructure/poe_client"
	"github.com/poe-armory/poe-armory/internal/interfaces/http/handler"
	"github.com/poe-armory/poe-armory/internal/interfaces/http/middleware"
)

type App struct {
	Config *config.Config
	DB     *sql.DB
	Router *mux.Router
}

func New(cfg *config.Config) (*App, error) {
	db, err := database.NewSQLiteDB(cfg.Database.Path)
	if err != nil {
		return nil, fmt.Errorf("initializing database: %w", err)
	}

	if err := database.RunMigrations(db); err != nil {
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	// Repositories
	charRepo := database.NewCharacterRepo(db)
	snapshotRepo := database.NewSnapshotRepo(db)
	profileRepo := database.NewProfileRepo(db)
	sessionRepo := database.NewSessionRepo(db)
	lookupRepo := database.NewPublicLookupRepo(db)

	// PoE clients
	poeClient := poe_client.New("", cfg.PoE.UserAgent) // public API client
	oauthClient := poe_client.NewOAuthClient(
		cfg.OAuth.ClientID,
		cfg.OAuth.ClientSecret,
		cfg.OAuth.RedirectURI,
		cfg.PoE.UserAgent,
	)

	// Services
	charService := service.NewCharacterService(charRepo, snapshotRepo, poeClient)
	authService := service.NewAuthService(profileRepo, sessionRepo, cfg.Session.MaxAge)
	publicService := service.NewPublicService(lookupRepo, poeClient)

	// Router
	router := mux.NewRouter()
	router.Use(middleware.Logging)
	router.Use(middleware.JSON)
	router.Use(middleware.Auth(authService))

	// Handlers
	charHandler := handler.NewCharacterHandler(charService)
	authHandler := handler.NewAuthHandler(authService, charService, oauthClient, cfg)
	publicHandler := handler.NewPublicHandler(publicService)

	api := router.PathPrefix("/api/v1").Subrouter()

	// Health check (for Railway)
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	// Auth routes
	api.HandleFunc("/auth/login", authHandler.Login).Methods("GET")
	api.HandleFunc("/auth/callback", authHandler.Callback).Methods("GET")
	api.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")
	api.HandleFunc("/auth/me", authHandler.Me).Methods("GET")
	api.HandleFunc("/auth/profiles", authHandler.ListProfiles).Methods("GET")

	// Character routes (read endpoints are public, write endpoints require auth)
	api.HandleFunc("/characters", charHandler.ListCharacters).Methods("GET")
	api.HandleFunc("/characters/import", middleware.RequireAuth(charHandler.ImportCharacters)).Methods("POST")
	api.HandleFunc("/characters/leagues", charHandler.ListLeagues).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}", charHandler.GetCharacter).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}", middleware.RequireAuth(charHandler.DeleteCharacter)).Methods("DELETE")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshot", middleware.RequireAuth(charHandler.SnapshotCharacter)).Methods("POST")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshots", charHandler.ListSnapshots).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshots/latest", charHandler.GetLatestSnapshot).Methods("GET")
	api.HandleFunc("/snapshots/{id:[0-9]+}", charHandler.GetSnapshot).Methods("GET")

	// Public lookup routes (no auth required)
	api.HandleFunc("/public/lookup", publicHandler.LookupCharacter).Methods("POST")
	api.HandleFunc("/public/share/{code}", publicHandler.GetSharedCharacter).Methods("GET")

	// Serve static frontend files (SPA fallback)
	spa := spaHandler{staticPath: "./web/dist", indexPath: "index.html"}
	router.PathPrefix("/").Handler(spa)

	return &App{
		Config: cfg,
		DB:     db,
		Router: router,
	}, nil
}

func (a *App) Run() error {
	addr := fmt.Sprintf("%s:%d", a.Config.Server.Host, a.Config.Server.Port)
	log.Printf("Starting server on %s", addr)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", a.Config.Server.BaseURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	return http.ListenAndServe(addr, c.Handler(a.Router))
}

func (a *App) Close() {
	if a.DB != nil {
		a.DB.Close()
	}
}

// spaHandler serves the React SPA with fallback to index.html for client-side routing.
type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fs := http.Dir(h.staticPath)
	f, err := fs.Open(r.URL.Path)
	if err != nil {
		// File not found — serve index.html for SPA routing
		http.ServeFile(w, r, fmt.Sprintf("%s/%s", h.staticPath, h.indexPath))
		return
	}
	f.Close()

	http.FileServer(fs).ServeHTTP(w, r)
}
