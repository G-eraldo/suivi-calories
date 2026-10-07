import { quantityKind } from './quantity-units.js'

export function recipeForEditing(saved, products) {
  return {
    name: saved.name,
    portions: saved.portions,
    instructions: saved.instructions || '',
    ingredients: saved.ingredients.map(line => {
      if (line.excluded) return { productId: '', grams: line.grams, label: line.name, excluded: true }
      const product = products.find(item => item.id === line.productId)
      const previousUnit = quantityKind(line.name) === 'liquid' ? (line.basisUnit || 'ml') : 'g'
      const currentUnit = product && quantityKind(product.name) === 'liquid' ? product.basis_unit : 'g'
      const unitChanged = Boolean(product && previousUnit !== currentUnit)
      return {
        productId: product?.id || '',
        grams: unitChanged ? '' : line.grams,
        label: product ? '' : line.name,
        excluded: false,
        unitChanged,
        previousUnit
      }
    })
  }
}
