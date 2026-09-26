import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { searchFiles } from '../src/search.js'

let tempRoot = ''

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'file-search-'))
})

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true })
})

async function createFile(relativePath: string): Promise<string> {
  const filePath = path.join(tempRoot, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, '')
  return filePath
}

describe('searchFiles', () => {
  it('matches filenames case-insensitively in nested dirs and returns absolute paths', async () => {
    await createFile('notes/ProjectPlan.md')
    await createFile('notes/todo.txt')
    await createFile('src/features/searchService.ts')

    const byName = await searchFiles({ root: tempRoot, query: '  plan  ' })
    const nested = await searchFiles({ root: tempRoot, query: 'service' })

    expect(byName.map((result) => path.basename(result))).toEqual(['ProjectPlan.md'])
    expect(nested).toEqual([path.join(tempRoot, 'src', 'features', 'searchService.ts')])
    expect(nested.every((result) => path.isAbsolute(result))).toBe(true)
  })

  it('returns deterministic order and respects maxResults', async () => {
    await createFile('zeta-match.txt')
    await createFile('alpha/deep-match.txt')
    await createFile('beta-match.txt')
    await Promise.all(
      Array.from({ length: 55 }, (_, index) =>
        createFile(`match-${String(index).padStart(2, '0')}.txt`),
      ),
    )

    expect(await searchFiles({ root: tempRoot, query: 'deep-match' })).toEqual([
      path.join(tempRoot, 'alpha', 'deep-match.txt'),
    ])
    expect(await searchFiles({ root: tempRoot, query: 'beta-match', maxResults: 1 })).toHaveLength(
      1,
    )

    const capped = await searchFiles({ root: tempRoot, query: 'match-' })
    expect(capped).toHaveLength(50)
  })

  it('skips directories, blank queries, and default ignore folders', async () => {
    await mkdir(path.join(tempRoot, 'alpha-directory'), { recursive: true })
    await createFile('.git/match.txt')
    await createFile('node_modules/match.txt')
    await createFile('src/match.txt')
    await createFile('.env.local')

    expect(await searchFiles({ root: tempRoot, query: '   ' })).toEqual([])
    expect(await searchFiles({ root: tempRoot, query: 'alpha' })).toEqual([])
    expect(await searchFiles({ root: tempRoot, query: 'match' })).toEqual([
      path.join(tempRoot, 'src', 'match.txt'),
    ])
    expect(await searchFiles({ root: tempRoot, query: 'env' })).toEqual([
      path.join(tempRoot, '.env.local'),
    ])
  })

  it('honors custom ignore lists and skips unreadable dirs', async () => {
    await createFile('vendor/match.txt')
    await createFile('src/match.txt')
    await createFile('readable/alpha.txt')
    await createFile('locked/alpha.txt')
    const lockedDir = path.join(tempRoot, 'locked')
    await chmod(lockedDir, 0o000)

    try {
      expect(
        await searchFiles({ root: tempRoot, query: 'match', ignoredDirectories: ['vendor'] }),
      ).toEqual([path.join(tempRoot, 'src', 'match.txt')])

      const results = await searchFiles({ root: tempRoot, query: 'alpha' })
      expect(results).toContain(path.join(tempRoot, 'readable', 'alpha.txt'))
      expect(results).not.toContain(path.join(lockedDir, 'alpha.txt'))
    } finally {
      await chmod(lockedDir, 0o755)
    }
  })

  it('rejects a missing root directory', async () => {
    await expect(
      searchFiles({ root: path.join(tempRoot, 'missing'), query: 'alpha' }),
    ).rejects.toThrow()
  })
})
