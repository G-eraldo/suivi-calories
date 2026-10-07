const mealOrder = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation']

export function groupMeals(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const type = entry.meal_type
    if (!groups.has(type)) groups.set(type, { type, entries: [], kcal: 0 })
    const group = groups.get(type)
    group.entries.push(entry)
    group.kcal += Number(entry.kcal) || 0
  }
  const position = type => { const index = mealOrder.indexOf(type); return index < 0 ? mealOrder.length : index }
  return [...groups.values()].sort((a, b) => position(a.type) - position(b.type))
}
