import bcrypt from 'bcryptjs'
import { createDatabaseClient } from './db/client.js'
import { createPostRepository } from './repositories/posts.js'
import { createUserRepository } from './repositories/users.js'

const client = createDatabaseClient({ filePath: process.env.DATABASE_URL ?? 'data/trumpet.db' })
const users = createUserRepository(client)
const posts = createPostRepository(client)

const seed = async () => {
  users.deleteAll()

  const passwordHash = await bcrypt.hash('password123', 12)
  const mina = await users.create({ handle: 'mina', displayName: 'Mina Chen', passwordHash })
  const leo = await users.create({ handle: 'leo', displayName: 'Leo Park', passwordHash })
  const ava = await users.create({ handle: 'ava', displayName: 'Ava Stone', passwordHash })

  users.follow(mina.id, leo.id)
  users.follow(mina.id, ava.id)
  users.follow(leo.id, mina.id)

  const firstPostId = posts.create({
    authorId: leo.id,
    body: 'Shipping a tiny social app feels like the fastest way to learn product-shaped full stack work.',
  })

  posts.create({
    authorId: mina.id,
    body: 'Trumpet v1 is text-only on purpose: fewer surfaces, better feedback loops.',
  })

  posts.create({
    authorId: ava.id,
    body: 'The best part of a follow graph is how much future product can hang from one small table.',
  })

  posts.create({
    authorId: mina.id,
    body: 'Agreed. Replies are already modeled as posts with parentId.',
    parentId: firstPostId,
  })

  posts.like(mina.id, firstPostId)
  posts.like(ava.id, firstPostId)

  console.log('Seeded users: mina, leo, ava')
  console.log('Password for all seed users: password123')
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    client.sqlite.close()
  })
