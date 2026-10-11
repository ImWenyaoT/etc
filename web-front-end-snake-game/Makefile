.PHONY: test build dev
test:
	go test -race ./...
build:
	mkdir -p bin
	go build -o bin/server ./cmd/server
	cd web && npm ci && npm run build
dev:
	go run ./cmd/server
