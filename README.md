# PoE Armory - Path of Exile Character Tracker

A full-stack application to import, snapshot, and track Path of Exile 1 character builds over time. View equipment, gems, skill tree allocations, masteries, ascendancy points, and character info — inspired by poe.ninja's build display.

## Tech Stack

**Backend:** Go (CGo), SQLite, Gorilla Mux, Cobra CLI, Viper config
**Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
**Infrastructure:** Docker, Air (hot reload), Make

## Quick Start

### Prerequisites

- Go 1.23+
- Node.js 20+
- GCC (for CGo/SQLite)

### Development

```bash
# Install Air for hot reloading
make install-tools

# Run both backend and frontend with hot reload
make dev
```

The API server runs on `http://localhost:8080` and the frontend dev server on `http://localhost:5173`.

### Configuration

Copy and edit `config.yaml`:

```yaml
server:
  port: 8080
poe:
  poesessid: "your-session-id-here"
```

Or use environment variables:

```bash
export POE_ARMORY_POE_POESESSID=your_session_id
```

### Docker

```bash
# Build and run
make docker-up

# Or manually
docker build -t poe-armory .
docker run -p 8080:8080 -v poe-data:/app/data poe-armory
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/characters` | List all characters |
| GET | `/api/v1/characters/:id` | Get character details |
| POST | `/api/v1/characters/import` | Import characters from PoE API |
| DELETE | `/api/v1/characters/:id` | Delete a character |
| POST | `/api/v1/characters/:id/snapshot` | Create a point-in-time snapshot |
| GET | `/api/v1/characters/:id/snapshots` | List all snapshots |
| GET | `/api/v1/characters/:id/snapshots/latest` | Get latest snapshot |
| GET | `/api/v1/snapshots/:id` | Get snapshot with full data |

## Architecture (DDD)

```
internal/
├── domain/           # Core business logic (no external deps)
│   ├── model/        # Entities and value objects
│   ├── repository/   # Repository interfaces
│   └── service/      # Domain services
├── application/      # Application orchestration
├── infrastructure/   # External implementations
│   ├── database/     # SQLite repos
│   ├── poe_client/   # PoE API client
│   └── config/       # Viper configuration
└── interfaces/       # HTTP handlers and middleware
    └── http/
```

## Make Targets

| Target | Description |
|--------|-------------|
| `make dev` | Run backend + frontend with hot reload |
| `make build` | Build Go binary |
| `make build-web` | Build frontend |
| `make run` | Build and run server |
| `make test` | Run Go tests |
| `make docker-up` | Docker compose up |
| `make clean` | Clean build artifacts |
