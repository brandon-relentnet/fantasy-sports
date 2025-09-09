BACKEND_DIR=backend
FRONTEND_HTTPS_CMD=node server.js

.PHONY: dev backend frontend backend-build backend-start backend-watch install

dev:
	@echo "Starting backend (watch+run) and frontend (HTTPS)";
	$(MAKE) -j 3 backend-watch backend frontend

install:
	@echo "Installing frontend and backend dependencies";
	npm install;
	cd $(BACKEND_DIR) && npm install

backend:
	cd $(BACKEND_DIR) && npm run start

frontend:
	$(FRONTEND_HTTPS_CMD)

backend-build:
	cd $(BACKEND_DIR) && npm run build

backend-start:
	cd $(BACKEND_DIR) && npm run start

backend-watch:
	cd $(BACKEND_DIR) && npm run dev:watch
