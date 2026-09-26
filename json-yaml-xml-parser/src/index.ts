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

function parseByFormat(source: string, format: DataFormat): unknown {
  switch (format) {
    case 'json':
      return parseJson(source)
    case 'yaml':
      return parseYaml(source)
    case 'xml':
      return parseXml(source)
    default:
      throw new ParserError(`Unsupported format "${format}".`)
  }
}
