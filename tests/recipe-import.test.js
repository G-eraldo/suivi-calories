import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRecipe, matchProduct } from '../utils/recipe-import.js'

test('importe la recette de gaufres sans confondre les étapes et les ingrédients', () => {
  const text = `Gaufres Banana Bread Style
Valeurs nutritionnelles pour 5 gaufres
500 kcal | 40 g de protéines
Liste des ingrédients (5 gaufres) :
• 1 œuf
• 50 g de farine de petit épeautre (ou la farine de ton choix)
• 30 g de whey vanille
• 1 banane
• 40 ml de lait de ton choix
• 15 g de pépites de chocolat noir
Préparation :
1 Dans un saladier, écrase la banane.
2 Préchauffe ton gaufrier.`
  const recipe = parseRecipe(text)
  assert.equal(recipe.name, 'Gaufres Banana Bread Style')
  assert.equal(recipe.portions, 5)
  assert.equal(recipe.ingredients.length, 6)
  assert.deepEqual(recipe.ingredients.map(line => line.grams), [50, 50, 30, 120, 40, 15])
  assert.match(recipe.instructions, /Préchauffe ton gaufrier/)
  assert.equal(recipe.ingredients[0].estimated, true)
})

test('réutilise la farine habituelle si elle est la seule farine enregistrée', () => {
  const flour = { id: 'flour', name: 'Farine de blé', brand: 'Chabrior' }
  assert.equal(matchProduct('farine de petit épeautre (ou la farine de ton choix)', [flour])?.id, 'flour')
  assert.equal(matchProduct('whey vanille', [flour]), null)
})

test('lit les cinq ingrédients malgré les erreurs OCR de la capture pita', () => {
  const text = `@ Pains pita – 2 personnes
135 g de ta farine à pizza – 339 kcal/100 g
e 40gdes kyr
e 47mld'eau
e 1a 2 pschitt d'huile d'olive
* 74 sachet de levure boulangère`
  const recipe = parseRecipe(text)
  assert.equal(recipe.name, 'Pains pita')
  assert.equal(recipe.portions, 2)
  assert.deepEqual(recipe.ingredients.map(line => line.label), ['ta farine à pizza', 'skyr', 'eau', "huile d'olive", 'levure boulangère'])
  assert.deepEqual(recipe.ingredients.map(line => line.grams), [135, 40, 47, null, null])
})

test('la fraction de sachet et les sprays restent à peser', () => {
  const recipe = parseRecipe(`Pains pita — 2 personnes
• 1 à 2 pschitt d'huile d'olive
• ⅔ sachet de levure boulangère`)
  assert.equal(recipe.ingredients.length, 2)
  assert.deepEqual(recipe.ingredients.map(line => line.grams), [null, null])
})
