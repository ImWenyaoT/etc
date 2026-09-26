import { describe, expect, it } from 'vitest'
import {
  createPostBodySchema,
  followParamsSchema,
  handleSchema,
  loginBodySchema,
  postParamsSchema,
  registerBodySchema,
  userParamsSchema,
} from './index.js'

describe('shared schemas', () => {
  it('normalizes valid handles and rejects unsafe ones', () => {
    expect(handleSchema.parse('mina_123')).toBe('mina_123')
    expect(() => handleSchema.parse('Mina')).toThrow()
    expect(() => handleSchema.parse('Mi Na')).toThrow()
    expect(() => handleSchema.parse('ab')).toThrow()
    expect(() => handleSchema.parse('x'.repeat(21))).toThrow()
    expect(() => handleSchema.parse('name-with-dash')).toThrow()
  })

  it('validates registration and login bodies', () => {
    expect(
      registerBodySchema.parse({
        handle: 'mina',
        displayName: 'Mina Chen',
        password: 'password123',
      }).handle,
    ).toBe('mina')

    expect(
      loginBodySchema.parse({
        handle: 'mina',
        password: 'password123',
      }).handle,
    ).toBe('mina')
  })

  it('trims posts and enforces text limits', () => {
    expect(createPostBodySchema.parse({ body: '  hello  ' }).body).toBe('hello')
    expect(createPostBodySchema.parse({ body: 'reply', parentId: null }).parentId).toBeNull()
    expect(() => createPostBodySchema.parse({ body: '' })).toThrow()
    expect(() => createPostBodySchema.parse({ body: '   ' })).toThrow()
    expect(() => createPostBodySchema.parse({ body: 'x'.repeat(281) })).toThrow()
    expect(() => createPostBodySchema.parse({ body: 'reply', parentId: 'not-a-uuid' })).toThrow()
  })

  it('validates UUID route params and profile handles', () => {
    const id = '7cb2c370-ad6b-4385-9b68-d0c5f30580c9'

    expect(followParamsSchema.parse({ id }).id).toBe(id)
    expect(postParamsSchema.parse({ id }).id).toBe(id)
    expect(userParamsSchema.parse({ handle: 'leo' }).handle).toBe('leo')
    expect(() => followParamsSchema.parse({ id: 'nope' })).toThrow()
    expect(() => postParamsSchema.parse({ id: 'nope' })).toThrow()
    expect(() => userParamsSchema.parse({ handle: 'Nope' })).toThrow()
  })
})
