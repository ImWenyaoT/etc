import { parseJson } from './adapters/json.js'
import { parseXml } from './adapters/xml.js'
import { parseYaml } from './adapters/yaml.js'
import { detectFormat, isDataFormat } from './detect.js'
import { ParserError } from './errors.js'
import { toSerializableValue } from './serializable.js'
import type { DataFormat, ParseOptions, ParseResult, SerializableValue } from './types.js'

export { detectFormat, isDataFormat, ParserError }
export type { DataFormat, ParseOptions, ParseResult, SerializableValue }

export function parseDocument(source: string, options: ParseOptions = {}): ParseResult {
  const format = detectFormat(options.sourcePath, options.format)
  const rawData = parseByFormat(source, format)

  return {
    format,
    data: toSerializableValue(rawData),
    ...(options.sourcePath ? { sourcePath: options.sourcePath } : {}),
  }
}

export function parseData(source: string, options: ParseOptions = {}): SerializableValue {
  return parseDocument(source, options).data
}

const formatParsers = {
  json: parseJson,
  yaml: parseYaml,
  xml: parseXml,
} satisfies Record<DataFormat, (source: string) => unknown>

function parseByFormat(source: string, format: DataFormat): unknown {
  if (hasFormatParser(format)) return formatParsers[format](source)
  return rejectUnsupportedFormat(format)
}

function hasFormatParser(format: DataFormat): format is keyof typeof formatParsers {
  return Object.hasOwn(formatParsers, format)
}

function rejectUnsupportedFormat(format: never): never {
  throw new ParserError(`Unsupported format "${format}".`)
}
