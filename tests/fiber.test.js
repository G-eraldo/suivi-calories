import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'

function dbWithProduct(fiber) {
  const writes = []
  return {
    writes,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes('FROM products')) return { id: 'flour', name: 'Farine', kcal: 350, protein: 10, carbs: 70, fat: 1, fiber }
              if (sql.includes('FROM recipes')) return { id: 'recipe', name: 'Gâteau', kcal: 175, protein: 5, carbs: 35, fat: 0.5, fiber }
              return null
            },
            async run() { writes.push({ sql, params }) }
          }
        }
      }
    }
  }
}

async function request(db, method, path, body) {
  return createHandler({}).fetch(new Request(`http://localhost/api/${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }), { DB: db })
}
const post = (db, path, body) => request(db, 'POST', path, body)

test('enregistre des fibres facultatives et refuse une valeur impossible', async () => {
  const db = dbWithProduct(null)
  const product = { name: 'Farine', kcal: 350, protein: 10, carbs: 70, fat: 1 }
  assert.equal((await post(db, 'products', { ...product, fiber: 3.2 })).status, 201)
  assert.equal(db.writes[0].params[8], 3.2)
  assert.equal((await post(db, 'products', product)).status, 201)
  assert.equal(db.writes[1].params[8], null)
  assert.equal((await post(db, 'products', { ...product, fiber: 101 })).status, 400)
  assert.equal(db.writes.length, 2)
})

test('permet de renseigner les fibres d’un produit déjà enregistré', async () => {
  const db = dbWithProduct(null)
  assert.equal((await request(db, 'PATCH', 'products/flour', { fiber: 4.5 })).status, 200)
  assert.match(db.writes[0].sql, /UPDATE products SET fiber/)
  assert.deepEqual(db.writes[0].params, [4.5, 'g', 'flour', 'owner'])
  assert.equal((await request(db, 'PATCH', 'products/flour', { fiber: -1 })).status, 400)
  assert.equal(db.writes.length, 1)
})

test('calcule les fibres des recettes et des repas sans inventer les valeurs absentes', async () => {
  const known = dbWithProduct(3.2)
  const recipe = { name: 'Gâteau', portions: 2, ingredients: [{ productId: 'flour', grams: 100 }] }
  assert.equal((await post(known, 'recipes', recipe)).status, 201)
  assert.equal(known.writes[0].params[9], 1.6)
  assert.equal((await post(known, 'meals', { date: '2026-10-07', mealType: 'Déjeuner', itemType: 'product', itemId: 'flour', quantity: 50 })).status, 201)
  assert.equal(known.writes[1].params[13], 1.6)

  const unknown = dbWithProduct(null)
  assert.equal((await post(unknown, 'recipes', recipe)).status, 201)
  assert.equal(unknown.writes[0].params[9], null)
  assert.equal((await post(unknown, 'meals', { date: '2026-10-07', mealType: 'Déjeuner', itemType: 'product', itemId: 'flour', quantity: 50 })).status, 201)
  assert.equal(unknown.writes[1].params[13], null)
})
