const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function starchKind(name) {
  const label = normalize(name)
  if (/\bpates\b/.test(label)) return 'pâtes'
  if (/\briz\b/.test(label)) return 'riz'
  return null
}

export function starchState(name) {
  if (!starchKind(name)) return null
  const label = normalize(name)
  if (/\b(cuit|cuite|cuits|cuites)\b/.test(label)) return 'cooked'
  if (/\b(cru|crue|crus|crues|sec|seche|secs|seches)\b/.test(label)) return 'raw'
  return 'unknown'
}
