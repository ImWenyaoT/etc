import { describe, expect, it } from 'vitest'
import { detectFormat, isDataFormat, parseData, parseDocument, ParserError } from '../src/index.js'
import { toSerializableValue } from '../src/serializable.js'

describe('detectFormat', () => {
  it('detects extensions and honors explicit overrides', () => {
    expect(detectFormat('config.json')).toBe('json')
    expect(detectFormat('config.yaml')).toBe('yaml')
    expect(detectFormat('config.yml')).toBe('yaml')
    expect(detectFormat('config.xml')).toBe('xml')
    expect(detectFormat('CONFIG.JSON')).toBe('json')
    expect(detectFormat('config.txt', 'JSON')).toBe('json')
    expect(detectFormat(undefined, 'yaml')).toBe('yaml')
  })

  it('rejects missing paths, unknown extensions, and bad overrides', () => {
    expect(() => detectFormat()).toThrow('Unable to detect format')
    expect(() => detectFormat('config.toml')).toThrow(ParserError)
    expect(() => detectFormat('Dockerfile')).toThrow('Unsupported file extension "(none)"')
    expect(() => detectFormat('config.json', 'toml')).toThrow(ParserError)
  })
})

describe('isDataFormat', () => {
  it('accepts known formats case-insensitively and rejects others', () => {
    expect(isDataFormat('json')).toBe(true)
    expect(isDataFormat('YAML')).toBe(true)
    expect(isDataFormat('Xml')).toBe(true)
    expect(isDataFormat('toml')).toBe(false)
    expect(isDataFormat('')).toBe(false)
  })
})

describe('parseData', () => {
  it('parses JSON and wraps parse failures', () => {
    expect(parseData('{"name":"Ada","scores":[1,2],"active":true}', { format: 'json' })).toEqual({
      name: 'Ada',
      scores: [1, 2],
      active: true,
    })
    expect(parseData('"ready"', { format: 'json' })).toBe('ready')
    expect(parseData('{"from":"path"}', { sourcePath: 'input.json' })).toEqual({ from: 'path' })
    expect(() => parseData('{"name":', { format: 'json' })).toThrow('Failed to parse JSON')

    try {
      parseData('{"name":', { format: 'json' })
      expect.unreachable('parsing invalid JSON should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ParserError)
      expect((error as ParserError).format).toBe('json')
      expect((error as ParserError).cause).toBeInstanceOf(SyntaxError)
    }
  })

  it('parses YAML and wraps parse failures', () => {
    expect(parseData('name: Ada\nitems:\n  - json\n  - yaml\n', { format: 'yaml' })).toEqual({
      name: 'Ada',
      items: ['json', 'yaml'],
    })
    expect(parseData('enabled: true\n', { sourcePath: 'config.yml' })).toEqual({ enabled: true })
    expect(() => parseData('name: [unterminated', { format: 'yaml' })).toThrow(
      'Failed to parse YAML',
    )
  })

  it('parses XML attributes, text, repeats, and declarations', () => {
    expect(
      parseData('<user id="1"><name>Ada</name><role>admin</role></user>', { format: 'xml' }),
    ).toEqual({
      user: {
        $attributes: { id: '1' },
        name: { $text: 'Ada' },
        role: { $text: 'admin' },
      },
    })
    expect(parseData('<user id="1" role="admin">Ada</user>', { format: 'xml' })).toEqual({
      user: { $attributes: { id: '1', role: 'admin' }, $text: 'Ada' },
    })
    expect(parseData('<tags><tag>json</tag><tag>yaml</tag></tags>', { format: 'xml' })).toEqual({
      tags: { tag: [{ $text: 'json' }, { $text: 'yaml' }] },
    })
    expect(
      parseData('<?xml version="1.0"?><root><name>Ada</name></root>', { format: 'xml' }),
    ).toEqual({ root: { name: { $text: 'Ada' } } })
    expect(parseData('<root>ok</root>', { sourcePath: 'input.xml' })).toEqual({
      root: { $text: 'ok' },
    })
    expect(() => parseData('<user><name>Ada</user>', { format: 'xml' })).toThrow(
      'Failed to parse XML',
    )
  })
})

describe('parseDocument', () => {
  it('returns metadata and lets explicit format override extension', () => {
    expect(parseDocument('{"ok":true}', { sourcePath: 'input.json' })).toEqual({
      format: 'json',
      data: { ok: true },
      sourcePath: 'input.json',
    })
    expect(parseDocument('name: Ada\n', { sourcePath: 'input.json', format: 'yaml' })).toEqual({
      format: 'yaml',
      data: { name: 'Ada' },
      sourcePath: 'input.json',
    })
  })
})

describe('toSerializableValue', () => {
  it('normalizes undefined/Date and rejects unsupported values', () => {
    expect(toSerializableValue({ keep: 'yes', drop: undefined })).toEqual({ keep: 'yes' })
    expect(toSerializableValue(['a', undefined, 'c'])).toEqual(['a', null, 'c'])
    expect(toSerializableValue({ createdAt: new Date('2026-06-17T00:00:00.000Z') })).toEqual({
      createdAt: '2026-06-17T00:00:00.000Z',
    })
    expect(() => toSerializableValue(Number.NaN)).toThrow('Non-finite number')
    expect(() => toSerializableValue(Symbol('bad'))).toThrow('Unsupported value')
    expect(() => toSerializableValue(1n)).toThrow('Unsupported value')
  })
})
