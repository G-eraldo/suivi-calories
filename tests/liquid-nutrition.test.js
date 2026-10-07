import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'
import { gramsFromQuantity } from '../utils/quantity-units.js'

test('50 cl de lait utilisent cinq fois les valeurs pour 100 ml dans repas et recette', async () => {
  const writes = []
  const db = { prepare(sql) { return { bind(...params) { return {
    async first() {
      if (sql.includes('FROM products')) return { id: 'milk', name: 'Lait', kcal: 47, protein: 3.3, carbs: 4.8, fat: 1.6, fiber: 0.5 }
      return null
    },
    async run() { writes.push({ sql, params }) }
  } } } } }
  const post = (path, body) => createHandler({}).fetch(new Request(`http://localhost/api/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }), { DB: db })
  const milliliters = gramsFromQuantity(50, 'liquid')
  assert.equal(milliliters, 500)

  assert.equal((await post('meals', { date: '2026-10-07', mealType: 'Déjeuner', itemType: 'product', itemId: 'milk', quantity: milliliters })).status, 201)
  assert.deepEqual(writes[0].params.slice(7, 13), [500, 235, 16.5, 24, 8, 2.5])

  assert.equal((await post('recipes', { name: 'Lait chaud', portions: 1, ingredients: [{ productId: 'milk', grams: milliliters }] })).status, 201)
  assert.deepEqual(writes[1].params.slice(5, 10), [235, 16.5, 24, 8, 2.5])
})
