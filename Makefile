.PHONY: install dev

install:
	cd frontend && npm install
	cd backend && npm install
	cd solicitud && npm install

dev: install
	npx --yes concurrently -n FRONTEND,BACKEND,SOLICITUDES -c blue,green,yellow "npm --prefix frontend run dev -- --host 0.0.0.0" "npm --prefix backend run dev" "npm --prefix solicitud run dev -- --host 0.0.0.0"
