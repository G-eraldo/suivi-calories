import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNutritionLabel } from '../utils/nutrition-scan.js'

test('lit les valeurs de la farine montrée dans la capture', () => {
  const result = parseNutritionLabel(`Valeurs nutritionnelles pour 100 g
Énergie 1506.0 kj (355.0 kcal)
Matière Grasse 1.3
Dont acides gras saturés 0.3
Glucides 75
Dont sucre 1
Protéines 9.4
Sel 0.01`)
  assert.deepEqual(result.values, { kcal: 355, protein: 9.4, carbs: 75, fat: 1.3, fiber: null })
  assert.equal(result.per100Unit, 'g')
})

test('accepte une valeur sur la ligne après son intitulé sans inventer les données manquantes', () => {
  const result = parseNutritionLabel(`Énergie 250 kcal
Protéines
12,5 g
Glucides 30 g`)
  assert.deepEqual(result.values, { kcal: 250, protein: 12.5, carbs: 30, fat: null, fiber: null })
  assert.equal(result.per100Unit, null)
})

test('lit les fibres séparément des glucides sur une étiquette', () => {
  const result = parseNutritionLabel('Pour 100 g\nGlucides 12,5 g\nFibres alimentaires 4,2 g\nProtéines 3 g')
  assert.equal(result.values.carbs, 12.5)
  assert.equal(result.values.fiber, 4.2)
})

test('reconnaît la base de 100 ml du lait sans confondre avec les grammes des nutriments', () => {
  const result = parseNutritionLabel('Valeurs nutritionnelles pour 100 ml\nÉnergie 47 kcal\nMatières grasses 1,6 g\nGlucides 4,8 g\nProtéines 3,3 g')
  assert.equal(result.per100Unit, 'ml')
  assert.deepEqual(result.values, { kcal: 47, protein: 3.3, carbs: 4.8, fat: 1.6, fiber: null })
})
