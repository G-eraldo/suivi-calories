import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'
import { recipeForEditing } from '../utils/recipe-edit.js'

function recipeDb(owner = 'owner', fiber = 2) {
  const writes = []
  return {
    writes,
    prepare(sql) {
      return { bind(...params) { return {
        async first() {
          if (sql.includes('FROM recipes') && params[0] === 'dough' && params[1] === owner)
            return { id: 'dough', name: 'Pâte à pizza', kcal: 300, protein: 10, carbs: 50, fat: 5, fiber }
          if (sql.includes('FROM recipes') && params[0] === 'pizza' && params[1] === 'owner') return { id: 'pizza' }
          if (sql.includes('FROM products') && params[0] === 'cheese')
            return { id: 'cheese', name: 'Fromage', kcal: 400, protein: 20, carbs: 0, fat: 35, fiber: 0, basis_unit: 'g' }
          return null
        },
        async run() { writes.push({ sql, params }) }
      } } }
    }
  }
}

async function save(db, ingredients, method = 'POST') {
  const path = method === 'PATCH' ? '/api/recipes/pizza' : '/api/recipes'
  return createHandler({}).fetch(new Request(`http://localhost${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pizza', portions: 2, ingredients })
  }), { DB: db })
}

test('additionne une sous-recette en portions et un produit, puis la conserve à l’édition', async () => {
  const db = recipeDb()
  const response = await save(db, [{ recipeId: 'dough', portions: 1.5 }, { productId: 'cheese', grams: 100 }])
  assert.equal(response.status, 201)
  const params = db.writes[0].params
  assert.deepEqual(params.slice(5, 10), [425, 17.5, 37.5, 21.3, 1.5])
  const lines = JSON.parse(params[4]).ingredients
  assert.deepEqual(lines[0], { recipeId: 'dough', name: 'Pâte à pizza', portions: 1.5 })
  assert.equal(recipeForEditing({ name: 'Pizza', portions: 2, ingredients: lines }, []).ingredients[0].recipeId, 'dough')
})

test('refuse une sous-recette absente du compte, une quantité invalide et une référence à elle-même', async () => {
  const foreign = recipeDb('another-owner')
  assert.equal((await save(foreign, [{ recipeId: 'dough', portions: 1 }])).status, 400)
  assert.equal(foreign.writes.length, 0)
  const invalid = recipeDb()
  assert.equal((await save(invalid, [{ recipeId: 'dough', portions: 0 }])).status, 400)
  assert.equal((await save(invalid, [{ recipeId: 'pizza', portions: 1 }], 'PATCH')).status, 400)
  assert.equal(invalid.writes.length, 0)
})

test('garde les fibres inconnues de la sous-recette', async () => {
  const db = recipeDb('owner', null)
  assert.equal((await save(db, [{ recipeId: 'dough', portions: 1 }])).status, 201)
  assert.equal(db.writes[0].params[9], null)
})
