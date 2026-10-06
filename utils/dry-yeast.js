// USDA FoodData Central, SR Legacy: leavening agents, yeast, baker's, active dry (FDC 175043).
// Values per 100 g. USDA carbohydrates include fiber.
export const dryYeast = {
  name: 'Levure boulangère déshydratée',
  brand: '',
  kcal: 325,
  protein: 40.44,
  carbs: 41.22,
  fat: 7.61
}

export function isDryYeastLabel(label) {
  const name = String(label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return (/levure(?:\s+de)?\s+boulang/.test(name) || /levure\s+seche/.test(name) || /levure\s+deshydratee/.test(name)) && !/fraiche/.test(name)
}
