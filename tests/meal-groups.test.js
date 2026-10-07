import test from 'node:test'
import assert from 'node:assert/strict'
import { groupMeals } from '../utils/meal-groups.js'

test('les aliments du même moment partagent une carte et gardent leurs actions individuelles', () => {
  const lunch1 = { id: 'pomme', meal_type: 'Déjeuner', kcal: 52 }
  const breakfast = { id: 'gaufres', meal_type: 'Petit-déjeuner', kcal: 163 }
  const lunch2 = { id: 'pâté', meal_type: 'Déjeuner', kcal: 629 }
  const groups = groupMeals([lunch1, breakfast, lunch2])

  assert.deepEqual(groups.map(group => group.type), ['Petit-déjeuner', 'Déjeuner'])
  assert.deepEqual(groups[1].entries, [lunch1, lunch2])
  assert.equal(groups[1].kcal, 681)
  assert.equal(groups[0].kcal, 163)
})
