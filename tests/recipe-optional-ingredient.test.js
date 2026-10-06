import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'
import { dryYeast } from '../utils/dry-yeast.js'

function recipeDb() {
  const writes = []
  return {
    writes,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes('FROM products') && params[0] === 'flour')
                return { id: 'flour', name: 'Farine', kcal: 350, protein: 10, carbs: 70, fat: 1 }
              if (sql.includes('FROM products') && params[0] === 'yeast')
                return { id: 'yeast', ...dryYeast }
              return null
            },
            async run() { writes.push({ sql, params }) }
          }
        }
      }
    }
  }
}

async function postRecipe(db, ingredients) {
  return createHandler({}).fetch(new Request('http://localhost/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pita', portions: 2, ingredients })
  }), { DB: db })
}

test('conserve eau et levure sans produit et calcule seulement la farine', async () => {
  const db = recipeDb()
  const response = await postRecipe(db, [
    { productId: 'flour', grams: 100 },
    { productId: '', label: 'eau', grams: 47, excluded: true },
    { productId: '', label: 'levure boulangère', grams: 5, excluded: true }
  ])
  assert.equal(response.status, 201)
  assert.equal(db.writes.length, 1)
  const saved = JSON.parse(db.writes[0].params[4]).ingredients
  assert.deepEqual(saved.map(line => [line.name, line.grams, Boolean(line.excluded)]), [
    ['Farine', 100, false], ['eau', 47, true], ['levure boulangère', 5, true]
  ])
  assert.deepEqual(db.writes[0].params.slice(5, 9), [175, 5, 35, 0.5])
})

test('refuse un ingrédient sans produit qui n’est pas explicitement exclu', async () => {
  const db = recipeDb()
  const response = await postRecipe(db, [
    { productId: 'flour', grams: 100 },
    { productId: '', label: 'levure boulangère', grams: 5, excluded: false }
  ])
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /Choisis un produit ou coche/)
  assert.equal(db.writes.length, 0)
})

test('compte 5 g de levure sèche et ignore seulement l’eau', async () => {
  const db = recipeDb()
  const response = await postRecipe(db, [
    { productId: 'flour', grams: 100 },
    { productId: '', label: 'eau', grams: 47, excluded: true },
    { productId: 'yeast', grams: 5 }
  ])
  assert.equal(response.status, 201)
  const write = db.writes[0].params
  assert.equal(write[5], 183.1)
  assert.equal(JSON.parse(write[4]).ingredients[2].name, dryYeast.name)
})
