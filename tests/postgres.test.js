import test from 'node:test'
import assert from 'node:assert/strict'
import { createD1Adapter } from '../server/postgres.js'

test('l’adaptateur conserve les paramètres et cible le schéma privé', async () => {
  const calls = []
  const pool = { async query(sql, values) { calls.push({ sql, values }); return { rows: [{ id: 'p1' }], rowCount: 1 } } }
  const db = createD1Adapter(pool)

  assert.deepEqual(await db.prepare('SELECT id FROM products WHERE owner_id = ? AND id = ?').bind('owner', 'p1').first(), { id: 'p1' })
  await db.prepare('INSERT INTO recipes (id,owner_id) VALUES (?,?)').bind('r1', 'owner').run()
  await db.prepare('DELETE FROM meals WHERE id = ? AND owner_id = ?').bind('m1', 'owner').run()

  assert.deepEqual(calls.map(call => call.sql), [
    'SELECT id FROM miametrie.products WHERE owner_id = $1 AND id = $2',
    'INSERT INTO miametrie.recipes (id,owner_id) VALUES ($1,$2)',
    'DELETE FROM miametrie.meals WHERE id = $1 AND owner_id = $2'
  ])
  assert.deepEqual(calls[0].values, ['owner', 'p1'])
})
