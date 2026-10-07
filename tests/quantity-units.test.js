import test from 'node:test'
import assert from 'node:assert/strict'
import { quantityKind, quantityFromGrams, gramsFromQuantity, quantityText } from '../utils/quantity-units.js'

test('convertit les liquides en cl pour la saisie et la lecture', () => {
  for (const name of ['Eau', 'Lait entier', "Huile d’olive", 'Jus de pomme']) assert.equal(quantityKind(name), 'liquid')
  assert.equal(quantityFromGrams(47, 'liquid'), 4.7)
  assert.equal(gramsFromQuantity(4.7, 'liquid'), 47)
  assert.equal(quantityText(250, 'Lait entier'), '25 cl')
  assert.equal(quantityKind('Yaourt au lait'), 'solid')
})

test('affiche les œufs en pièces et garde leur poids pour le calcul', () => {
  assert.equal(quantityKind('Œuf entier (cru)'), 'egg')
  assert.equal(quantityFromGrams(100, 'egg'), 2)
  assert.equal(gramsFromQuantity(2, 'egg'), 100)
  assert.equal(quantityText(50, 'œuf'), '1 œuf')
  assert.equal(quantityText(100, 'Œufs'), '2 œufs')
  assert.equal(quantityText(75, 'Œuf entier (cru)'), '1.5 œufs')
  assert.equal(quantityText(25, 'Farine'), '25 g')
})
