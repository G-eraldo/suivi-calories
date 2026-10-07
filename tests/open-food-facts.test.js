import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../server/worker.js'
import { parseOpenFoodFactsProduct } from '../utils/open-food-facts.js'

test('importe les nutriments normalisés sans transformer les données absentes en zéro', () => {
  const product = parseOpenFoodFactsProduct({
    product_name: 'Jus de pomme', brands: 'Exemple', product_quantity_unit: 'ml',
    nutriments: { 'energy-kcal_100g': 46, proteins_100g: 0, carbohydrates_100g: 11.2, fat_100g: 0.1 }
  }, '12345678')
  assert.deepEqual({ name: product.name, brand: product.brand, basisUnit: product.basisUnit, kcal: product.kcal, protein: product.protein, fiber: product.fiber },
    { name: 'Jus de pomme', brand: 'Exemple', basisUnit: 'ml', kcal: 46, protein: 0, fiber: null })
  assert.equal(parseOpenFoodFactsProduct({ product_name: 'Biscuit', nutriments: { 'energy-kcal_100g': -5 } }, '12345678').kcal, null)
  assert.equal(parseOpenFoodFactsProduct({ product_name: 'Soda', quantity: '330 ml' }, '12345678').basisUnit, 'ml')
})

test('la recherche valide le code et identifie Miamétrie auprès de la source', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return new Response(JSON.stringify({ product: { product_name: 'Biscuit', brands: 'Maison', product_quantity_unit: 'g', nutriments: { 'energy-kcal_100g': 400, proteins_100g: 7, carbohydrates_100g: 65, fat_100g: 12 } } }), { status: 200 })
  }
  try {
    const handler = createHandler({})
    const bad = await handler.fetch(new Request('http://localhost/api/barcode?code=not-a-code'), { DB: {} })
    assert.equal(bad.status, 400)
    const response = await handler.fetch(new Request('http://localhost/api/barcode?code=3017620422003'), { DB: {} })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).product.kcal, 400)
    assert.equal(requests.length, 1)
    assert.match(requests[0].url, /\/api\/v3\/product\/3017620422003/)
    assert.match(requests[0].options.headers['User-Agent'], /^Miametrie\/1\.0/)
  } finally { globalThis.fetch = originalFetch }
})
