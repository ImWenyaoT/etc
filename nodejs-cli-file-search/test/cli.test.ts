import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from '../src/index.js'

let tempRoot = ''

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'file-search-cli-'))
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
  it('prints help and rejects bad args', async () => {
    const help = await runCapturedCli([])
    expect(help.exitCode).toBe(0)
    expect(help.stdout.join('\n')).toContain('file-search search <keyword>')

    for (const argv of [
      ['scan', 'alpha'],
      ['search'],
      ['search', 'alpha', '--max', '0'],
      ['search', 'alpha', '--max=-1'],
      ['search', 'alpha', '--root'],
      ['search', 'alpha', '--json'],
    ]) {
      const result = await runCapturedCli(argv)
      expect(result.exitCode).toBe(1)
    }
  })

  it('searches with long/short flags and default max', async () => {
    await mkdir(path.join(tempRoot, 'src'))
    await writeFile(path.join(tempRoot, 'src', 'alpha.ts'), '')
    await writeFile(path.join(tempRoot, 'src', 'alphabet.ts'), '')
    await Promise.all(
      Array.from({ length: 55 }, (_, index) =>
        writeFile(path.join(tempRoot, `match-${String(index).padStart(2, '0')}.txt`), ''),
      ),
    )

    const found = await runCapturedCli(['search', 'alpha', '--root', tempRoot, '--max', '5'])
    expect(found.exitCode).toBe(0)
    expect(found.stdout[0]).toBe(path.join(tempRoot, 'src', 'alpha.ts'))

    const short = await runCapturedCli(['search', 'alpha', '-r', tempRoot, '-m', '1'])
    expect(short.stdout).toHaveLength(1)

    const capped = await runCapturedCli(['search', 'match'])
    expect(capped.stdout).toHaveLength(50)
  })

  it('returns empty matches and reports search errors', async () => {
    await writeFile(path.join(tempRoot, 'alpha.ts'), '')

    for (const query of ['beta', '   ']) {
      const result = await runCapturedCli(['search', query])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toEqual([])
    }

    const missing = await runCapturedCli([
      'search',
      'alpha',
      '--root',
      path.join(tempRoot, 'missing'),
    ])
    expect(missing.exitCode).toBe(1)
    expect(missing.stderr.join('\n')).toContain('ENOENT')
  })
})
