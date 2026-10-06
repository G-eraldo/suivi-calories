import test from 'node:test'
import assert from 'node:assert/strict'
import { dryYeast, isDryYeastLabel } from '../utils/dry-yeast.js'
import { matchProduct } from '../utils/recipe-import.js'

test('la levure boulangère sèche de la recette est reconnue sans confondre la levure fraîche', () => {
  assert.equal(isDryYeastLabel('levure boulangère'), true)
  assert.equal(isDryYeastLabel('levure sèche'), true)
  assert.equal(isDryYeastLabel('levure de boulanger déshydratée'), true)
  assert.equal(isDryYeastLabel('levure boulangère fraîche'), false)
  assert.equal(isDryYeastLabel('levure chimique'), false)
})

test('une recette à la levure boulangère ne sélectionne pas la levure chimique', () => {
  const products = [
    { id: 'chemical', name: 'Levure chimique' },
    { id: 'dry', name: dryYeast.name }
  ]
  assert.equal(matchProduct('levure boulangère', products)?.id, 'dry')
  assert.equal(matchProduct('levure boulangère', [products[0]]), null)
})

test('5 g de levure boulangère déshydratée apportent environ 16 kcal', () => {
  assert.equal(dryYeast.kcal * 5 / 100, 16.25)
  assert.equal(Math.round(dryYeast.kcal * 5 / 100), 16)
})
