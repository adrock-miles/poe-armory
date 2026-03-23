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

	// PoE public API client (no auth needed)
	poeClient := poe_client.New(cfg.PoE.UserAgent, poe_client.RealmPC)

	// Services
	charService := service.NewCharacterService(charRepo, snapshotRepo, poeClient)

	// Router
	router := mux.NewRouter()
	router.Use(middleware.Logging)
	router.Use(middleware.JSON)

	// Handlers
	h := handler.NewCharacterHandler(charService)

	api := router.PathPrefix("/api/v1").Subrouter()

	// Health check (for Railway)
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	// Character routes
	api.HandleFunc("/characters", h.ListCharacters).Methods("GET")
	api.HandleFunc("/characters/preview", h.PreviewCharacters).Methods("POST")
	api.HandleFunc("/characters/import", h.ImportCharacters).Methods("POST")
	api.HandleFunc("/characters/batch-delete", h.BatchDeleteCharacters).Methods("POST")
	api.HandleFunc("/characters/leagues", h.ListLeagues).Methods("GET")
	api.HandleFunc("/characters/accounts", h.ListAccounts).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}", h.GetCharacter).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}", h.DeleteCharacter).Methods("DELETE")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshot", h.SnapshotCharacter).Methods("POST")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshots", h.ListSnapshots).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshots/latest", h.GetLatestSnapshot).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}/gear-history", h.GetGearHistory).Methods("GET")
	api.HandleFunc("/snapshots/{id:[0-9]+}", h.GetSnapshot).Methods("GET")

	// Serve frontend (SPA with fallback to index.html)
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
		AllowedHeaders:   []string{"Content-Type"},
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
		http.ServeFile(w, r, fmt.Sprintf("%s/%s", h.staticPath, h.indexPath))
		return
	}
	f.Close()
	http.FileServer(fs).ServeHTTP(w, r)
}
