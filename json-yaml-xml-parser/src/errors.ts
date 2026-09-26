import type { DataFormat } from './types.js'

export type ParserErrorOptions = {
  format?: DataFormat
  cause?: unknown
}

export class ParserError extends Error {
  format?: DataFormat

  constructor(message: string, options: ParserErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ParserError'
    this.format = options.format
  }
}

export function wrapParseError(format: DataFormat, error: unknown): ParserError {
  const detail = error instanceof Error ? error.message : String(error)
  return new ParserError(`Failed to parse ${format.toUpperCase()}: ${detail}`, {
    format,
    cause: error,
  })
}
