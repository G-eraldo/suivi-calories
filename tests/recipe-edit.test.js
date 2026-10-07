import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'
import { recipeForEditing } from '../utils/recipe-edit.js'

function recipeDb(ownsRecipe = true) {
  const writes = []
  return {
    writes,
    prepare(sql) {
      return { bind(...params) { return {
        async first() {
          if (sql.includes('FROM recipes')) return ownsRecipe ? { id: 'recipe-1' } : null
          if (sql.includes('FROM products') && params[0] === 'oil')
            return { id: 'oil', name: "Huile d'olive", kcal: 899, protein: 0, carbs: 0, fat: 100, fiber: null, basis_unit: 'g' }
          return null
        },
        async run() { writes.push({ sql, params }) }
      } } }
    }
  }
}

async function edit(db, ingredients) {
  return createHandler({}).fetch(new Request('http://localhost/api/recipes/recipe-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Poulet corrigé', portions: 2, instructions: 'Mélanger.', ingredients })
  }), { DB: db })
}

test('modifie une recette existante et recalcule 1 g d’huile sans toucher aux repas passés', async () => {
  const db = recipeDb()
  const response = await edit(db, [{ productId: 'oil', grams: 1 }])
  assert.equal(response.status, 200)
  assert.equal(db.writes.length, 1)
  assert.match(db.writes[0].sql, /^UPDATE recipes SET/)
  assert.deepEqual(db.writes[0].params.slice(0, 2), ['Poulet corrigé', 2])
  assert.deepEqual(db.writes[0].params.slice(3, 8), [4.5, 0, 0, 0.5, null])
  assert.deepEqual(db.writes[0].params.slice(8), ['recipe-1', 'owner'])
  assert.equal(JSON.parse(db.writes[0].params[2]).ingredients[0].grams, 1)
})

test('refuse de modifier une recette absente du compte et une quantité invalide', async () => {
  const missing = recipeDb(false)
  assert.equal((await edit(missing, [{ productId: 'oil', grams: 1 }])).status, 404)
  assert.equal(missing.writes.length, 0)
  const invalid = recipeDb()
  assert.equal((await edit(invalid, [{ productId: 'oil', grams: 0 }])).status, 400)
  assert.equal(invalid.writes.length, 0)
})

test('préremplit la recette et demande une nouvelle quantité quand un liquide passe de ml à g', () => {
  const saved = { name: 'Pâtes', portions: 2, instructions: 'Cuire.', ingredients: [
    { productId: 'oil', name: "Huile d'olive", grams: 10, basisUnit: 'ml' },
    { productId: 'pasta', name: 'Coquillette', grams: 140, basisUnit: 'ml' },
    { productId: null, name: 'Eau', grams: 300, excluded: true }
  ] }
  const products = [{ id: 'oil', name: "Huile d'olive", basis_unit: 'g' }, { id: 'pasta', name: 'Coquillette', basis_unit: 'ml' }]
  const form = recipeForEditing(saved, products)
  assert.equal(form.ingredients[0].grams, '')
  assert.equal(form.ingredients[0].unitChanged, true)
  assert.equal(form.ingredients[1].grams, 140)
  assert.equal(form.ingredients[2].label, 'Eau')
  assert.equal(form.instructions, 'Cuire.')
})
