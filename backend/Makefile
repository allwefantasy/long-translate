# Makefile for starting the FastAPI server

# Variables
PYTHON = python3
APP = src/app.py
HOST = 0.0.0.0
PORT = 8999

# Default target
.PHONY: run
run:
	$(PYTHON) $(APP) --host $(HOST) --port $(PORT)

# Run with SSL
.PHONY: run-ssl
run-ssl:
	$(PYTHON) $(APP) --host $(HOST) --port $(PORT) --ssl-keyfile /path/to/key.pem --ssl-certfile /path/to/cert.pem

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  run      - Run the FastAPI server without SSL"
	@echo "  run-ssl  - Run the FastAPI server with SSL (update paths to SSL files)"
	@echo "  help     - Display this help message"
