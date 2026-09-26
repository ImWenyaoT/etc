import { wrapParseError } from '../errors.js'

export function parseJson(source: string): unknown {
  try {
    return JSON.parse(source)
  } catch (error) {
    throw wrapParseError('json', error)
  }
}
