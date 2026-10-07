import test from 'node:test'
import assert from 'node:assert/strict'
import { commonFoods, commonFoodForIngredient, unitsForGrams } from '../utils/common-foods.js'

test('valeurs par pièce pour un œuf, une banane et une pomme', () => {
  assert.deepEqual(commonFoods.map(food => food.grams), [50, 118, 182])
  assert.deepEqual(commonFoods.map(food => Math.round(food.kcal * food.grams / 100)), [72, 105, 95])
  assert.equal(commonFoodForIngredient('œufs')?.id, 'egg')
  assert.equal(commonFoodForIngredient('banane')?.id, 'banana')
  assert.equal(commonFoodForIngredient('pomme')?.id, 'apple')
  assert.equal(commonFoodForIngredient('pomme de terre'), null)
  assert.equal(unitsForGrams(commonFoods[1], 236), 2)
  assert.equal(unitsForGrams(commonFoods[1], 100), null)
})
