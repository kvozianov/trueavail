PYTHON ?= python3
VENV := backend/.venv
PY := $(abspath $(VENV))/bin/python

.PHONY: venv data test backtest dev dev-backend dev-frontend up down

$(VENV)/bin/python:
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/pip install -r backend/requirements.txt

venv: $(VENV)/bin/python

data: venv  ## regenerate backend/data/samples/*.csv (seed 42)
	cd backend && $(PY) -m scripts.generate_samples

test: venv  ## backend test suite
	cd backend && $(PY) -m pytest -q

backtest: venv  ## rolling-origin backtest on the default synthetic dataset
	cd backend && $(PY) -m scripts.run_backtest

dev-backend: venv
	cd backend && $(PY) -m uvicorn trueavail.api:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:  ## backend :8000 + frontend :3000
	$(MAKE) -j2 dev-backend dev-frontend

up:
	docker compose up --build

down:
	docker compose down
