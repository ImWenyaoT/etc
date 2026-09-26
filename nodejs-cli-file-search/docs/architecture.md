# Architecture

- `searchFiles` walks directories depth-first, matches basenames case-insensitively, returns absolute paths.
- Unreadable nested directories are skipped; root failures propagate.
- CLI (`runCli`) parses argv via `node:util.parseArgs`, injects IO for tests.
- Lint/format: `oxlint` + `oxfmt`.
