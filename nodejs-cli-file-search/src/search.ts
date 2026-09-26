import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

export type SearchOptions = {
  root: string
  query: string
  maxResults?: number
  ignoredDirectories?: string[]
}

const defaultIgnored = new Set(['.git', 'node_modules', 'dist', 'coverage'])

export async function searchFiles(options: SearchOptions): Promise<string[]> {
  const root = path.resolve(options.root)
  const query = options.query.trim().toLowerCase()
  const maxResults = options.maxResults ?? 50
  const ignored = new Set(options.ignoredDirectories ?? [...defaultIgnored])
  if (!query) return []

  const results: string[] = []

  const walk = async (directory: string, isRoot: boolean): Promise<void> => {
    if (results.length >= maxResults) return

    let entries: Dirent[]
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (isRoot) throw error
      return
    }

    for (const entry of entries.slice().sort((a, b) => a.name.localeCompare(b.name))) {
      if (results.length >= maxResults) break
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) await walk(entryPath, false)
        continue
      }
      if (entry.isFile() && entry.name.toLowerCase().includes(query)) {
        results.push(entryPath)
      }
    }
  }

  await walk(root, true)
  return results
}
