import test from 'node:test'
import assert from 'node:assert/strict'
import { adelieCone, gramsForCones, conesForGrams } from '../utils/ice-cream.js'

test('un cône du paquet de 411 g pour 6 pèse 68,5 g et apporte environ 195 kcal', () => {
  assert.equal(gramsForCones(1), 68.5)
  assert.equal(Math.round(adelieCone.kcal * gramsForCones(1) / 100), 195)
  assert.equal(conesForGrams(68.5), 1)
  assert.equal(conesForGrams(137), 2)
  assert.equal(conesForGrams(100), null)
})
