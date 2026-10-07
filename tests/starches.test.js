import test from 'node:test'
import assert from 'node:assert/strict'
import { starchKind, starchState } from '../utils/starches.js'

test('repère les pâtes et le riz avec leur état de pesée', () => {
  assert.equal(starchKind('Pâtes complètes crues'), 'pâtes')
  assert.equal(starchState('Pâtes complètes crues'), 'raw')
  assert.equal(starchState('Riz sec'), 'raw')
  assert.equal(starchState('Riz cuit'), 'cooked')
  assert.equal(starchState('Riz basmati'), 'unknown')
  assert.equal(starchState('Sauce tomate'), null)
})
