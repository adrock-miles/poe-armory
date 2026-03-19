.PHONY: all build run dev dev-api dev-web install-tools migrate docker docker-up docker-down clean lint test

# Default target
all: build

# Install development tools
install-tools:
	go install github.com/air-verse/air@latest

# Build the Go backend
build:
	CGO_ENABLED=1 go build -tags sqlite_fts5 -o ./tmp/poe-armory .

# Build the frontend
build-web:
	cd web && npm ci && npm run build

# Build everything
build-all: build-web build

# Run the server
run: build
	./tmp/poe-armory serve

# Run database migrations
migrate:
	go run . migrate

# Development: hot-reload backend with Air
dev-api:
	air

# Development: run React dev server
dev-web:
	cd web && npm run dev

# Development: run both backend and frontend concurrently
dev:
	@echo "Starting PoE Armory in development mode..."
	@echo "API server: http://localhost:8080"
	@echo "Frontend:   http://localhost:5173"
	@$(MAKE) -j2 dev-api dev-web

# Run tests
test:
	CGO_ENABLED=1 go test -tags sqlite_fts5 ./...

# Lint
lint:
	golangci-lint run ./...

# Docker build
docker:
	docker build -t poe-armory .

# Docker compose up
docker-up:
	docker compose up --build -d

# Docker compose down
docker-down:
	docker compose down

# Clean build artifacts
clean:
	rm -rf tmp/ data/ web/dist web/node_modules
