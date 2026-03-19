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

	charRepo := database.NewCharacterRepo(db)
	snapshotRepo := database.NewSnapshotRepo(db)
	poeClient := poe_client.New(cfg.PoE.POESESSID, cfg.PoE.UserAgent)
	charService := service.NewCharacterService(charRepo, snapshotRepo, poeClient)

	router := mux.NewRouter()
	router.Use(middleware.Logging)
	router.Use(middleware.JSON)

	h := handler.NewCharacterHandler(charService)
	api := router.PathPrefix("/api/v1").Subrouter()

	api.HandleFunc("/characters", h.ListCharacters).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}", h.GetCharacter).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}", h.DeleteCharacter).Methods("DELETE")
	api.HandleFunc("/characters/import", h.ImportCharacters).Methods("POST")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshot", h.SnapshotCharacter).Methods("POST")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshots", h.ListSnapshots).Methods("GET")
	api.HandleFunc("/characters/{id:[0-9]+}/snapshots/latest", h.GetLatestSnapshot).Methods("GET")
	api.HandleFunc("/snapshots/{id:[0-9]+}", h.GetSnapshot).Methods("GET")

	// Serve static frontend files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./web/dist")))

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
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
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
