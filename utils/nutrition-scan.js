const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const firstNumber = value => {
  const match = value.match(/\d+(?:[.,]\d+)?/)
  return match ? Number(match[0].replace(',', '.')) : null
}

export function parseNutritionLabel(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const values = { kcal: null, protein: null, carbs: null, fat: null, fiber: null }
  const energy = lines.join(' ').match(/(\d+(?:[.,]\d+)?)\s*kcal\b/i)
  if (energy) values.kcal = Number(energy[1].replace(',', '.'))
  const fields = {
    fat: /\b(?:matieres? grasses?|lipides?|fat)\b/i,
    carbs: /\b(?:glucides?|carbohydrates?|carbs?)\b/i,
    protein: /\b(?:proteines?|proteins?)\b/i,
    fiber: /\b(?:fibres? alimentaires?|fibres?|dietary fiber|fibre)\b/i
  }
  for (const [key, pattern] of Object.entries(fields)) {
    const index = lines.findIndex(line => pattern.test(normalized(line)))
    if (index < 0) continue
    const line = normalized(lines[index])
    const afterLabel = line.slice(line.search(pattern)).replace(pattern, '')
    values[key] = firstNumber(afterLabel)
    if (values[key] === null && index + 1 < lines.length) values[key] = firstNumber(lines[index + 1])
  }
  const per100Unit = normalized(text).match(/\b(?:pour|per|par)\s*100\s*(g|ml)\b/i)?.[1] || null
  return { values, per100Unit }
}
