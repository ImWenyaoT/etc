#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { parseDocument, ParserError } from './index.js'

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

const help = `Usage:
  data-parser parse <file> [--format json|yaml|xml]

Options:
  -f, --format  Override format detection
  -h, --help    Print help
`

const asMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const formatCliError = (error: unknown, sourcePath: string) => {
  if (error instanceof ParserError) return `Error: ${error.message}`
  if (error instanceof Error && 'code' in error) {
    const code = String(error.code)
    if (code === 'ENOENT') return `Error: file not found: ${sourcePath}`
    if (code === 'EISDIR') return `Error: expected a file but received a directory: ${sourcePath}`
  }
  return `Error: ${asMessage(error)}`
}

export async function runCli(argv: string[], io: CliIo = defaultCliIo): Promise<number> {
  let command: string | undefined
  let filePath: string | undefined
  let format: string | undefined
  let showHelp = false

  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        format: { type: 'string', short: 'f' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    })
    command = parsed.positionals[0]
    filePath = parsed.positionals[1]
    format = parsed.values.format
    showHelp = parsed.values.help ?? false
  } catch (error) {
    io.stderr(`Error: ${asMessage(error)}`)
    return 1
  }

  if (showHelp || !command) {
    io.stdout(help)
    return 0
  }
  if (command !== 'parse') {
    io.stderr(`Error: unknown command "${command}"`)
    io.stdout(help)
    return 1
  }
  if (!filePath) {
    io.stderr('Error: missing file path')
    io.stdout(help)
    return 1
  }

  const sourcePath = path.resolve(io.cwd(), filePath)
  try {
    const source = await readFile(sourcePath, 'utf8')
    const result = parseDocument(source, { sourcePath, format })
    io.stdout(JSON.stringify(result.data, null, 2))
    return 0
  } catch (error) {
    io.stderr(formatCliError(error, sourcePath))
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode
  })
}
