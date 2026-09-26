#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { searchFiles } from './search.js'

type CliIo = {
  cwd: () => string
  stdout: (message: string) => void
  stderr: (message: string) => void
}

const defaultCliIo: CliIo = {
  cwd: () => process.cwd(),
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
}

const parsePositiveInteger = (value: string) =>
  /^[1-9][0-9]*$/.test(value) ? Number(value) : Number.NaN

const help = `Usage:
  file-search search <keyword> [--root <directory>] [--max <number>]

Options:
  -r, --root  Directory to search from
  -m, --max   Maximum number of results
`

export async function runCli(argv: string[], io: CliIo = defaultCliIo): Promise<number> {
  let command: string | undefined
  let query: string | undefined
  let root: string
  let maxResults: number

  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        root: { type: 'string', short: 'r', default: io.cwd() },
        max: { type: 'string', short: 'm', default: '50' },
      },
    })
    command = parsed.positionals[0]
    query = parsed.positionals[1]
    root = parsed.values.root ?? io.cwd()
    maxResults = parsePositiveInteger(parsed.values.max ?? '50')
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error))
    return 1
  }

  if (command !== 'search' || !query) {
    io.stdout(help)
    return command ? 1 : 0
  }

  if (!Number.isInteger(maxResults) || maxResults < 1) {
    io.stderr('Error: --max must be a positive integer')
    return 1
  }

  try {
    for (const match of await searchFiles({ root, query, maxResults })) {
      io.stdout(match)
    }
    return 0
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error))
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode
  })
}
