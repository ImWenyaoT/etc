#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
for project in nodejs-cli-file-search json-yaml-xml-parser random-red-black-tree-sort web-front-end-snake-game trumpet-twitter; do
  (cd "$project"
   export GOWORK=off
   go vet ./...
   go test -race ./...
   go build ./...
   cd web
   npm ci --no-audit --no-fund
   npm test
   npm run build)
done
