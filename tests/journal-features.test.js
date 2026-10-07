import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'

function mockDb(meal = null, history = []) {
  const writes = []
  return {
    writes,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() { return sql.includes('FROM meals') ? meal : null },
            async all() { return { results: history } },
            async run() { writes.push({ sql, params }) }
          }
        }
      }
    }
  }
}

const handler = createHandler({})
const request = (db, method, path, body) => handler.fetch(new Request(`http://localhost/api/${path}`, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined
}), { DB: db })

const meal = { id: 'm1', item_type: 'product', item_id: 'p1', item_name: 'Lait', meal_type: 'Déjeuner', quantity: 500, kcal: 235, protein: 16.5, carbs: 24, fat: 8, fiber: null }

test('corriger un repas conserve ses valeurs historiques et permet de le déplacer', async () => {
  const db = mockDb(meal)
  const response = await request(db, 'PATCH', 'meals/m1', { date: '2026-10-06', mealType: 'Dîner', quantity: 250 })
  assert.equal(response.status, 200)
  assert.deepEqual(db.writes[0].params, ['2026-10-06', 'Dîner', 250, 117.5, 8.25, 12, 4, null, 'm1', 'owner'])
  assert.equal((await request(db, 'PATCH', 'meals/m1', { date: '2026-10-06', mealType: 'Dîner', quantity: -1 })).status, 400)
  assert.equal(db.writes.length, 1)
})

test('dupliquer un repas reprend son instantané, même sans consulter le produit', async () => {
  const db = mockDb(meal)
  const response = await request(db, 'POST', 'meals/m1/duplicate', { date: '2026-10-07', mealType: 'Petit-déjeuner' })
  assert.equal(response.status, 201)
  assert.deepEqual(db.writes[0].params.slice(2, 13), ['2026-10-07', 'Petit-déjeuner', 'product', 'p1', 'Lait', 500, 235, 16.5, 24, 8, null])
})

test('un repas absent du compte ne peut pas être corrigé ou dupliqué', async () => {
  const db = mockDb()
  assert.equal((await request(db, 'PATCH', 'meals/other', { date: '2026-10-07', mealType: 'Dîner', quantity: 100 })).status, 404)
  assert.equal((await request(db, 'POST', 'meals/other/duplicate', { date: '2026-10-07', mealType: 'Dîner' })).status, 404)
  assert.equal(db.writes.length, 0)
})

test('les raccourcis groupent les repas identiques et les bilans bornent les dates', async () => {
  const db = mockDb(null, [
    { ...meal, eaten_on: '2026-10-07' },
    { ...meal, id: 'm2', eaten_on: '2026-10-06' },
    { ...meal, id: 'm3', quantity: 250, eaten_on: '2026-10-05' }
  ])
  const recent = await (await request(db, 'GET', 'recent-meals')).json()
  assert.equal(recent.recent.length, 2)
  assert.equal(recent.frequent[0].count, 2)
  const trends = await (await request(db, 'GET', 'trends?end=2026-10-07&days=7')).json()
  assert.equal(trends.start, '2026-10-01')
  assert.equal(trends.end, '2026-10-07')
  assert.equal((await request(db, 'GET', 'trends?end=2026-10-07&days=365')).status, 400)
})
