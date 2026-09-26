import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { ParserError, wrapParseError } from '../errors.js'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributesGroupName: '$attributes',
  attributeNamePrefix: '',
  textNodeName: '$text',
  alwaysCreateTextNode: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  allowBooleanAttributes: false,
})

export function parseXml(source: string): unknown {
  const validation = XMLValidator.validate(source)

  if (validation !== true) {
    const { msg, line, col } = validation.err
    throw new ParserError(`Failed to parse XML: ${msg} at line ${line}, column ${col}.`, {
      format: 'xml',
    })
  }

  try {
    return xmlParser.parse(source)
  } catch (error) {
    throw wrapParseError('xml', error)
  }
}
