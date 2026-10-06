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
  assert.deepEqual(result.values, { kcal: 355, protein: 9.4, carbs: 75, fat: 1.3 })
  assert.equal(result.hasPer100g, true)
})

test('accepte une valeur sur la ligne après son intitulé sans inventer les données manquantes', () => {
  const result = parseNutritionLabel(`Énergie 250 kcal
Protéines
12,5 g
Glucides 30 g`)
  assert.deepEqual(result.values, { kcal: 250, protein: 12.5, carbs: 30, fat: null })
  assert.equal(result.hasPer100g, false)
})
