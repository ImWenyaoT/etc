import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { runMigrations } from './migrate.js'

export interface DatabaseClient {
  sqlite: Database.Database
}

export interface DatabaseOptions {
  filePath?: string
  sqlite?: Database.Database
}

const defaultDbPath = path.resolve(process.cwd(), 'data/trumpet.db')

export const createDatabaseClient = (options: DatabaseOptions = {}): DatabaseClient => {
  // Ensure the parent directory exists BEFORE opening the database file, otherwise
  // better-sqlite3 throws when the target folder (e.g. data/) is missing.
  if (!options.sqlite && options.filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(options.filePath ?? defaultDbPath), { recursive: true })
  }

  const sqlite = options.sqlite ?? new Database(options.filePath ?? defaultDbPath)

  runMigrations(sqlite)

  return {
    sqlite,
  }
}
