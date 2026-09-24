# ==============================================================================
# OPEN CAF - DEVELOPER AUTOMATION MAKEFILE
# ==============================================================================

.PHONY: help dev down build logs test test-backend test-frontend seed demo clean

help:
	@echo "Open CAF Development Commands:"
	@echo "  make dev          - Start all containers in background and follow logs"
	@echo "  make down         - Stop and remove all containers"
	@echo "  make build        - Rebuild all container images"
	@echo "  make logs         - Tail logs from all containers"
	@echo "  make test         - Run backend and frontend test suites"
	@echo "  make seed         - Seed official NCSC CAF v4.0 framework into DB"
	@echo "  make demo         - Load Borsetshire Council realistic demo dataset"
	@echo "  make clean        - Remove volumes and temporary test caches"

dev:
	docker compose up -d --build
	@echo "Services started:"
	@echo "  - Frontend: http://localhost:3000"
	@echo "  - Backend:  http://localhost:8000/docs"
	@echo "  - MinIO:    http://localhost:9001"
	docker compose logs -f

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

test: test-backend test-frontend

test-backend:
	docker compose exec backend pytest -v

test-frontend:
	docker compose exec frontend npm test

seed:
	docker compose exec backend python -m app.cli.seed_caf

demo:
	docker compose exec backend python -m app.cli.load_demo

clean:
	docker compose down -v
	rm -rf backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/.next frontend/node_modules
