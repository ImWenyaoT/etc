import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from '../src/cli.js'

let tempRoot = ''

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'data-parser-'))
})

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true })
})

async function runCapturedCli(argv: string[]) {
  const stdout: string[] = []
  const stderr: string[] = []
  const exitCode = await runCli(argv, {
    cwd: () => tempRoot,
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
  })
  return { exitCode, stdout, stderr }
}

describe('runCli', () => {
  it('prints help and rejects bad arguments', async () => {
    const help = await runCapturedCli([])
    expect(help.exitCode).toBe(0)
    expect(help.stdout.join('\n')).toContain('data-parser parse <file>')

    for (const argv of [['scan', 'input.json'], ['parse'], ['parse', 'input.json', '--format']]) {
      const result = await runCapturedCli(argv)
      expect(result.exitCode).toBe(1)
      expect(result.stderr[0]).toMatch(/^Error:/)
    }
  })

  it('parses JSON, YAML, and XML by extension or --format', async () => {
    await writeFile(path.join(tempRoot, 'input.json'), '{"name":"Ada","active":true}')
    await writeFile(path.join(tempRoot, 'input.yaml'), 'name: Ada\n')
    await writeFile(path.join(tempRoot, 'input.xml'), '<user id="1">Ada</user>')
    await writeFile(path.join(tempRoot, 'input.txt'), '{"name":"Ada"}')

    const json = await runCapturedCli(['parse', 'input.json'])
    const yaml = await runCapturedCli(['parse', 'input.yaml'])
    const xml = await runCapturedCli(['parse', 'input.xml'])
    const override = await runCapturedCli(['parse', 'input.txt', '-f', 'json'])

    expect(json.exitCode).toBe(0)
    expect(JSON.parse(json.stdout[0] ?? '')).toEqual({ name: 'Ada', active: true })
    expect(JSON.parse(yaml.stdout[0] ?? '')).toEqual({ name: 'Ada' })
    expect(JSON.parse(xml.stdout[0] ?? '')).toEqual({
      user: { $attributes: { id: '1' }, $text: 'Ada' },
    })
    expect(JSON.parse(override.stdout[0] ?? '')).toEqual({ name: 'Ada' })
  })

  it('fails on missing files, directories, bad formats, and invalid data', async () => {
    await mkdir(path.join(tempRoot, 'folder'))
    await writeFile(path.join(tempRoot, 'input.txt'), 'name = "Ada"')
    await writeFile(path.join(tempRoot, 'bad.json'), '{"name":')
    await writeFile(path.join(tempRoot, 'bad.yaml'), 'name: [unterminated')
    await writeFile(path.join(tempRoot, 'bad.xml'), '<root><name>Ada</root>')

    const cases: Array<[string[], string]> = [
      [['parse', 'missing.json'], 'file not found'],
      [['parse', 'folder', '--format', 'json'], 'expected a file'],
      [['parse', 'input.txt'], 'Unsupported file extension'],
      [['parse', 'input.txt', '--format', 'toml'], 'Unsupported format'],
      [['parse', 'bad.json'], 'Failed to parse JSON'],
      [['parse', 'bad.yaml'], 'Failed to parse YAML'],
      [['parse', 'bad.xml'], 'Failed to parse XML'],
    ]

    for (const [argv, message] of cases) {
      const result = await runCapturedCli(argv)
      expect(result.exitCode).toBe(1)
      expect(result.stderr[0]).toContain(message)
    }
  })
})
