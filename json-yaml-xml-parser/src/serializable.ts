import { ParserError } from './errors.js'
import type { SerializableObject, SerializableValue } from './types.js'

export function toSerializableValue(value: unknown, path = 'value'): SerializableValue {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value
    }

    throw new ParserError(`Non-finite number at ${path} cannot be serialized as JSON.`)
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => toSerializableValue(item, `${path}[${index}]`))
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object') {
    const output: SerializableObject = {}

    for (const [key, childValue] of Object.entries(value)) {
      if (childValue !== undefined) {
        output[key] = toSerializableValue(childValue, `${path}.${key}`)
      }
    }

    return output
  }

  throw new ParserError(`Unsupported value at ${path} cannot be serialized as JSON.`)
}
