.PHONY: install run dev build backend deploy-preview deploy

install:
	npm install

run:
	npm run dev:frontend

dev: run

build:
	npm run build

backend:
	python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8000

deploy-preview: build
	npx vercel

deploy: build
	npx vercel --prod
