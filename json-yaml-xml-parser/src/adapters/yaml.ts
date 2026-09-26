import YAML from 'yaml'
import { wrapParseError } from '../errors.js'

export function parseYaml(source: string): unknown {
  try {
    return YAML.parse(source)
  } catch (error) {
    throw wrapParseError('yaml', error)
  }
}
