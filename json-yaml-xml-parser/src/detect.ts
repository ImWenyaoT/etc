import path from 'node:path'
import { ParserError } from './errors.js'
import type { DataFormat } from './types.js'

const extensionFormats: Record<string, DataFormat> = {
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
}

const supportedFormats: DataFormat[] = ['json', 'yaml', 'xml']

export function isDataFormat(value: string): value is DataFormat {
  return supportedFormats.includes(value.toLowerCase() as DataFormat)
}

export function detectFormat(filePath?: string, explicitFormat?: DataFormat | string): DataFormat {
  if (explicitFormat) {
    const normalized = explicitFormat.toLowerCase()

    if (isDataFormat(normalized)) {
      return normalized
    }

    throw new ParserError(`Unsupported format "${explicitFormat}". Expected json, yaml, or xml.`)
  }

  if (!filePath) {
    throw new ParserError('Unable to detect format without a file path. Pass a format explicitly.')
  }

  const extension = path.extname(filePath).toLowerCase()
  const format = extensionFormats[extension]

  if (format) {
    return format
  }

  throw new ParserError(
    `Unsupported file extension "${extension || '(none)'}". Expected .json, .yaml, .yml, or .xml.`,
  )
}
