import { isDryYeastLabel } from './dry-yeast.js'
import { commonFoodForIngredient } from './common-foods.js'

const normalize = value => String(value || '').replace(/œ/gi, 'oe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const stop = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'au', 'aux', 'ton', 'ta', 'choix', 'petit', 'style'])
const aliases = [
  [/\bfarines?\b/, 'farine'], [/\boeufs?\b|\bœufs?\b/, 'oeuf'],
  [/\bbananes?\b/, 'banane'], [/\blaits?\b/, 'lait'],
  [/\bpommes?\b/, 'pomme'],
  [/\bpepites?\b/, 'pepite'], [/\bchocolats?\b/, 'chocolat'],
  [/\bwheys?\b/, 'whey'], [/\bskyrs?\b/, 'skyr']
]
function tokens(value) {
  let text = normalize(value)
  for (const [pattern, replacement] of aliases) text = text.replace(pattern, replacement)
  return text.split(' ').filter(word => word && !stop.has(word))
}
function amount(value) {
  if (value === '½') return .5
  if (value === '⅓') return 1 / 3
  if (value === '⅔') return 2 / 3
  if (value === '¼') return .25
  if (value.includes('/')) { const [a, b] = value.split('/').map(Number); return b ? a / b : null }
  return Number(value.replace(',', '.'))
}
function ingredientLine(line) {
  const clean = line.replace(/^[\s•·●▪◦*\-–]+/, '').replace(/^[^\p{L}\p{N}½⅓⅔¼]+/u, '').replace(/^e\s+(?=\d|[½⅓⅔¼])/i, '').trim()
  const withoutNutrition = clean.replace(/\s+[—–-]\s*\d+(?:[.,]\d+)?\s*kcal(?:\s*\/\s*100\s*g)?.*$/i, '').trim()
  const spray = withoutNutrition.match(/^\d+\s*(?:à|a|-)\s*\d+\s*pschitts?\s*(?:de\s*|d['’])?(.+)$/i)
  if (spray) return { label: spray[1].trim(), grams: null, original: clean, estimated: true, unit: 'pschitt' }
  const sachet = withoutNutrition.match(/^(?:\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|[½⅓⅔¼])\s*sachets?\s*(?:de\s*)?(.+)$/i)
  if (sachet) return { label: sachet[1].trim(), grams: null, original: clean, estimated: true, unit: 'sachet' }
  const match = withoutNutrition.match(/^(\d+\s*\/\s*\d+|[½⅓⅔¼]|\d+(?:[.,]\d+)?)\s*(kg|g|grammes?|ml|cl|litres?|l)?\s*(?:de\s*|d['’])?(.+)$/i)
  if (!match) return null
  const quantity = amount(match[1].replace(/\s/g, ''))
  const unit = normalize(match[2] || '')
  const label = (match[3] || '').replace(/\s+[—–→].*$/, '').replace(/^s\s+kyr\b/i, 'skyr').trim()
  if (!quantity || !label || /^(kcal|proteines|glucides|lipides|minutes?|personnes?)/i.test(label)) return null
  let grams = null
  if (unit === 'g' || unit.startsWith('gramme')) grams = quantity
  else if (unit === 'kg') grams = quantity * 1000
  else if (unit === 'ml') grams = quantity
  else if (unit === 'cl') grams = quantity * 10
  else if (unit === 'l' || unit.startsWith('litre')) grams = quantity * 1000
  else {
    const food = commonFoodForIngredient(label)
    if (food) grams = quantity * food.grams
  }
  return { label, grams: grams ? Math.round(grams * 10) / 10 : null, original: clean, estimated: !unit || ['ml', 'cl', 'l'].includes(unit) || unit.startsWith('litre'), unit }
}
export function parseRecipe(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const hasIngredientHeading = lines.some(line => /\b(?:liste des )?ingredients?\b/i.test(normalize(line)))
  let name = '', portions = 1, mode = '', ingredients = [], instructions = []
  for (const line of lines) {
    const serving = line.match(/\b(?:pour\s+)?(\d+)\s*(?:gaufres?|portions?|personnes?|pains?)\b/i)
    if (serving && portions === 1) portions = Number(serving[1])
    if (/\b(?:liste des )?ingredients?\b/i.test(normalize(line))) {
      mode = 'ingredients'
      const count = line.match(/\((\d+)\s*(?:gaufres?|portions?|personnes?|pains?)\)/i)
      if (count) portions = Number(count[1])
      continue
    }
    if (/^(?:preparation|instructions?|etapes?)\b/.test(normalize(line))) { mode = 'steps'; continue }
    if (/\bvaleurs? nutritionnelles?\b/i.test(normalize(line))) continue
    const titleLine = line.replace(/^[@\s]+/, '').trim()
    if (!name && !mode && /[a-zà-ÿ]/i.test(titleLine) && !/^(#|les |pour |enregistre|\d)/i.test(titleLine) && titleLine.length < 100) name = titleLine.replace(/^[^\p{L}]+/u, '').replace(/\s*[|—–].*$/, '').trim()
    if (mode === 'steps') { if (!/^(@|#|profite|envoie)/i.test(line)) instructions.push(line.replace(/^[\s\d️⃣⃣.]+/u, '').trim()); continue }
    if (hasIngredientHeading && mode !== 'ingredients') continue
    const ingredient = ingredientLine(line)
    if (ingredient) ingredients.push(ingredient)
    else if (mode === 'ingredients' && /^[\s•·●▪◦*\-–]+/.test(line) && /[\p{L}]/u.test(line)) {
      ingredients.push({ label: line.replace(/^[\s•·●▪◦*\-–]+/, '').trim(), grams: null, original: line, estimated: true, unit: '' })
    }
  }
  return { name, portions, ingredients, instructions: instructions.join('\n') }
}
export function matchProduct(label, products) {
  const wanted = tokens(label)
  if (!wanted.length) return null
  const wantedPotato = /\bpommes? de terre\b/.test(normalize(label))
  let best = null, bestScore = 0, tied = false
  for (const product of products) {
    if (isDryYeastLabel(label) && !isDryYeastLabel(product.name)) continue
    if (wanted.includes('pomme') && wantedPotato !== /\bpommes? de terre\b/.test(normalize(product.name))) continue
    const candidate = tokens(`${product.name} ${product.brand || ''}`)
    const overlap = wanted.filter(token => candidate.includes(token)).length
    const score = overlap / wanted.length
    if (score > bestScore) { best = product; bestScore = score; tied = false }
    else if (score === bestScore && score > 0) tied = true
  }
  return bestScore >= .5 && !tied ? best : null
}
