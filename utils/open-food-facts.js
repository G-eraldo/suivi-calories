const nutrient = (values, key) => {
  const value = values?.[`${key}_100g`]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function parseOpenFoodFactsProduct(record, code) {
  if (!record || typeof record !== 'object') return null
  const values = record.nutriments || {}
  const quantityUnit = String(record.product_quantity_unit || '').toLowerCase()
  const quantityText = String(record.quantity || '').toLowerCase()
  const liquid = ['ml', 'cl', 'l'].includes(quantityUnit) || (!quantityUnit && /\b(?:ml|cl|l)\b/.test(quantityText))
  return {
    code,
    name: String(record.product_name || '').trim().slice(0, 120),
    brand: String(record.brands || '').trim().slice(0, 120),
    kcal: nutrient(values, 'energy-kcal'),
    protein: nutrient(values, 'proteins'),
    carbs: nutrient(values, 'carbohydrates'),
    fat: nutrient(values, 'fat'),
    fiber: nutrient(values, 'fiber'),
    basisUnit: liquid ? 'ml' : ['g', 'kg'].includes(quantityUnit) || (!quantityUnit && /\b(?:g|kg)\b/.test(quantityText)) ? 'g' : null,
    sourceUrl: `https://world.openfoodfacts.org/product/${code}`
  }
}
