<script setup>
definePageMeta({ layout: false })
useSeoMeta({ title: 'Mon suivi calories', description: 'Journal personnel de repas, recettes et produits nutritionnels.' })
const today = () => new Date().toLocaleDateString('en-CA')
const date = ref(today())
const tab = ref('journal')
const modal = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const state = ref({ goal: 2000, products: [], recipes: [], meals: [] })
const product = reactive({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' })
const recipe = reactive({ name: '', portions: 1, ingredients: [{ productId: '', grams: 100 }] })
const meal = reactive({ itemType: 'product', itemId: '', mealType: 'Déjeuner', quantity: 100 })
const goal = ref(2000)
const scanBusy = ref(false)
const scanInfo = ref('')
const api = async (path, options = {}) => { const res = await fetch('/api/' + path, { headers: { 'Content-Type': 'application/json' }, ...options }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.'); return data }
async function load() { try { busy.value = true; state.value = await api('state?date=' + encodeURIComponent(date.value)); goal.value = state.value.goal } catch (e) { error.value = e.message } finally { busy.value = false } }
let webMcpLifecycle
onMounted(async () => {
 await load()
 const context = document.modelContext
 if (!context?.registerTool) return
 webMcpLifecycle = new AbortController()
 const register = tool => Promise.resolve(context.registerTool(tool, { signal: webMcpLifecycle.signal })).catch(() => {})
 await register({
  name: 'read_food_journal', title: 'Lire le journal alimentaire', description: 'Lire les produits, recettes et repas de la date affichée.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: () => ({ date: date.value, goal: state.value.goal, totals: totals.value, products: state.value.products, recipes: state.value.recipes, meals: state.value.meals })
 })
 await register({
  name: 'create_product', title: 'Enregistrer un produit', description: 'Enregistrer un produit avec ses valeurs nutritionnelles pour 100 g.',
  inputSchema: { type: 'object', properties: { name: { type: 'string' }, brand: { type: 'string' }, kcal: { type: 'number', minimum: 0 }, protein: { type: 'number', minimum: 0 }, carbs: { type: 'number', minimum: 0 }, fat: { type: 'number', minimum: 0 } }, required: ['name','kcal','protein','carbs','fat'], additionalProperties: false },
  annotations: { readOnlyHint: false },
  async execute(input) { if (!input?.name?.trim() || ['kcal','protein','carbs','fat'].some(k => !Number.isFinite(input[k]) || input[k] < 0)) throw new Error('Valeurs nutritionnelles invalides.'); const result = await api('products', { method: 'POST', body: JSON.stringify(input) }); await load(); return { id: result.id, name: input.name } }
 })
 await register({
  name: 'add_meal', title: 'Ajouter un repas', description: 'Ajouter au journal un produit en grammes ou une recette en portions.',
  inputSchema: { type: 'object', properties: { date: { type: 'string' }, mealType: { type: 'string', enum: ['Petit-déjeuner','Déjeuner','Dîner','Collation'] }, itemType: { type: 'string', enum: ['product','recipe'] }, itemId: { type: 'string' }, quantity: { type: 'number', exclusiveMinimum: 0 } }, required: ['date','mealType','itemType','itemId','quantity'], additionalProperties: false },
  annotations: { readOnlyHint: false },
  async execute(input) { if (!/^\d{4}-\d{2}-\d{2}$/.test(input?.date || '') || !Number.isFinite(input?.quantity) || input.quantity <= 0) throw new Error('Repas invalide.'); const result = await api('meals', { method: 'POST', body: JSON.stringify(input) }); date.value = input.date; await load(); return { id: result.id, date: input.date } }
 })
})
onBeforeUnmount(() => webMcpLifecycle?.abort())
watch(date, load)
const totals = computed(() => state.value.meals.reduce((a, m) => { a.kcal += m.kcal; a.protein += m.protein; a.carbs += m.carbs; a.fat += m.fat; return a }, { kcal: 0, protein: 0, carbs: 0, fat: 0 }))
const pct = computed(() => Math.min(100, Math.round(totals.value.kcal / Math.max(1, state.value.goal) * 100)))
const remaining = computed(() => Math.max(0, Math.round(state.value.goal - totals.value.kcal)))
const items = computed(() => meal.itemType === 'recipe' ? state.value.recipes : state.value.products)
const round = n => Math.round(Number(n) || 0)
const mealIcon = t => ({ 'Petit-déjeuner': '☀️', 'Déjeuner': '🥗', 'Dîner': '🌙', 'Collation': '🍎' })[t] || '🍽️'
function open(name) { error.value = ''; notice.value = ''; modal.value = name; if (name === 'meal') { meal.itemType = 'product'; meal.itemId = ''; meal.mealType = 'Déjeuner'; meal.quantity = 100 } }
function close() { modal.value = ''; error.value = ''; scanInfo.value = '' }
async function send(path, body, method = 'POST') { error.value = ''; try { busy.value = true; await api(path, { method, body: JSON.stringify(body) }); await load(); close(); notice.value = 'Enregistré.'; setTimeout(() => notice.value = '', 3000) } catch (e) { error.value = e.message } finally { busy.value = false } }
async function saveProduct() { await send('products', { ...product, kcal: Number(product.kcal), protein: Number(product.protein), carbs: Number(product.carbs), fat: Number(product.fat) }); if (!error.value) Object.assign(product, { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' }) }
async function saveRecipe() { await send('recipes', { name: recipe.name, portions: Number(recipe.portions), ingredients: recipe.ingredients.map(x => ({ productId: x.productId, grams: Number(x.grams) })) }); if (!error.value) Object.assign(recipe, { name: '', portions: 1, ingredients: [{ productId: '', grams: 100 }] }) }
async function saveMeal() { await send('meals', { ...meal, date: date.value, quantity: Number(meal.quantity) }) }
async function saveGoal() { await send('goal', { goal: Number(goal.value) }) }
async function removeItem(type, id) { if (!confirm('Supprimer cet élément ?')) return; await send(type + '/' + encodeURIComponent(id), {}, 'DELETE') }
function addIngredient() { recipe.ingredients.push({ productId: '', grams: 100 }) }
async function scanPhoto(event) {
 const file = event.target.files?.[0]; if (!file) return
 scanBusy.value = true; error.value = ''; scanInfo.value = 'Lecture de l’étiquette en cours…'
 try {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('fra+eng')
  const result = await worker.recognize(file)
  await worker.terminate()
  const lines = result.data.text.split(/\n/).map(x => x.trim()).filter(Boolean)
  const number = s => { const m = s.replace(',', '.').match(/\b\d+(?:\.\d+)?\b/g); return m ? Number(m[0]) : null }
  const find = re => { const line = lines.find(x => re.test(x)); return line ? number(line.replace(re, '')) : null }
  const kcalLine = lines.find(x => /kcal/i.test(x))
  const kcalMatch = kcalLine?.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*kcal/i)
  const values = { kcal: kcalMatch ? Number(kcalMatch[1]) : null, fat: find(/(?:mati[eè]res? grasses?|lipides?|fat)\s*[:\-]?/i), carbs: find(/(?:glucides?|carbohydrates?)\s*[:\-]?/i), protein: find(/(?:prot[eé]ines?|protein)\s*[:\-]?/i) }
  for (const [key, value] of Object.entries(values)) if (value !== null) product[key] = value
  scanInfo.value = Object.values(values).some(v => v !== null) ? 'Valeurs détectées. Vérifie qu’elles correspondent bien à 100 g avant d’enregistrer.' : 'Lecture terminée, mais aucune valeur fiable trouvée. Saisis les chiffres de l’étiquette.'
 } catch (e) { error.value = 'Lecture impossible. Tu peux saisir les valeurs manuellement.'; scanInfo.value = '' } finally { scanBusy.value = false }
}
</script>
<template>
 <div class="app">
  <aside class="sidebar"><div class="logo"><span class="logo-mark">◡</span> Mon suivi</div><nav class="nav" aria-label="Navigation principale"><button :class="{active:tab==='journal'}" @click="tab='journal'"><span>◫</span> Journal</button><button :class="{active:tab==='products'}" @click="tab='products'"><span>▦</span> Produits</button><button :class="{active:tab==='recipes'}" @click="tab='recipes'"><span>▤</span> Recettes</button></nav><div class="sidebar-foot">Tes repas et tes recettes, au même endroit.</div></aside>
  <header class="mobile-header"><div class="logo"><span class="logo-mark">◡</span> Mon suivi</div><nav class="mobile-nav" aria-label="Navigation principale"><button :class="{active:tab==='journal'}" @click="tab='journal'">Journal</button><button :class="{active:tab==='products'}" @click="tab='products'">Produits</button><button :class="{active:tab==='recipes'}" @click="tab='recipes'">Recettes</button></nav></header>
  <main class="main"><div class="topline"><span class="eyebrow">MON ESPACE PERSONNEL</span><input v-if="tab==='journal'" v-model="date" class="date-control" type="date" aria-label="Date du journal"></div>
   <div v-if="notice" class="success" role="status">{{ notice }}</div><div v-if="error && !modal" class="error" role="alert">{{ error }} <button class="secondary" @click="load">Réessayer</button></div>
   <template v-if="tab==='journal'"><h1 class="heading">Journal alimentaire</h1><p class="sub">Ton suivi du {{ new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) }}</p>
    <div class="dashboard"><div><section class="card summary"><div><h2>Calories consommées</h2><div><span class="big-number">{{ round(totals.kcal) }}</span><span class="unit">kcal</span></div><div class="fine">{{ remaining }} kcal restantes sur {{ state.goal }}</div><button class="summary-goal" @click="open('goal')">Modifier l’objectif</button></div><div class="ring" :style="{'--pct':pct+'%'}"><span>{{ pct }} %<small>de l’objectif</small></span></div></section><div class="macro"><div class="macro-item"><b>{{ round(totals.protein) }} g</b><span>Protéines</span></div><div class="macro-item"><b>{{ round(totals.carbs) }} g</b><span>Glucides</span></div><div class="macro-item"><b>{{ round(totals.fat) }} g</b><span>Lipides</span></div></div></div><aside class="card side-card"><img src="/lunch-bowl.jpg" class="food-img" alt="Bol repas avec légumes, céréales et protéines"><h3 style="margin-top:18px">Ton objectif quotidien</h3><p>Un repère simple pour suivre tes apports jour après jour.</p><button class="secondary" @click="open('goal')">Modifier l’objectif</button></aside></div>
    <div class="section-head"><h2>Repas du jour</h2><button class="primary" @click="open('meal')">Ajouter un repas</button></div><div v-if="busy && !state.meals.length" class="empty">Chargement des repas…</div><div v-else-if="!state.meals.length" class="empty">Aucun repas enregistré pour cette journée. Ajoute ton premier aliment ou une recette.</div><div v-else class="meal-list"><div v-for="m in state.meals" :key="m.id" class="meal"><div class="meal-icon">{{ mealIcon(m.meal_type) }}</div><div class="meal-info"><b>{{ m.item_name }}</b><span>{{ m.meal_type }} · {{ m.item_type==='product' ? round(m.quantity)+' g' : m.quantity+' portion'+(m.quantity>1?'s':'') }}</span></div><div class="meal-cal">{{ round(m.kcal) }} kcal</div><button class="icon-button" :aria-label="'Supprimer '+m.item_name" @click="removeItem('meals',m.id)">×</button></div></div>
   </template>
   <template v-else-if="tab==='products'"><h1 class="heading">Mes produits</h1><p class="sub">Enregistre un produit une fois, puis retrouve-le à chaque repas.</p><div class="toolbar"><span class="eyebrow">{{ state.products.length }} produit{{ state.products.length>1?'s':'' }}</span><button class="primary" @click="open('product')">Ajouter un produit</button></div><div v-if="!state.products.length" class="empty">Aucun produit enregistré. Ajoute une étiquette avec une photo ou saisis les valeurs.</div><div v-else class="library"><article v-for="p in state.products" :key="p.id" class="item-card"><h3>{{ p.name }}</h3><p>{{ p.brand || 'Pour 100 g' }}</p><div class="nutrition"><span><b>{{ round(p.kcal) }}</b> kcal</span><span>P {{ round(p.protein) }} g</span><span>G {{ round(p.carbs) }} g</span><span>L {{ round(p.fat) }} g</span></div><div class="item-actions"><button class="secondary" @click="tab='journal';open('meal');meal.itemId=p.id">Ajouter au journal</button><button class="icon-button" :aria-label="'Supprimer '+p.name" @click="removeItem('products',p.id)">×</button></div></article></div></template>
   <template v-else><h1 class="heading">Mes recettes</h1><p class="sub">Compose tes recettes avec tes produits et calcule les calories par portion.</p><div class="toolbar"><span class="eyebrow">{{ state.recipes.length }} recette{{ state.recipes.length>1?'s':'' }}</span><button class="primary" @click="open('recipe')">Créer une recette</button></div><div v-if="!state.recipes.length" class="empty">Aucune recette enregistrée. Commence par ajouter tes produits, puis crée ta première recette.</div><div v-else class="library"><article v-for="r in state.recipes" :key="r.id" class="item-card"><h3>{{ r.name }}</h3><p>{{ r.portions }} portion{{ r.portions>1?'s':'' }} · valeurs par portion</p><div class="nutrition"><span><b>{{ round(r.kcal) }}</b> kcal</span><span>P {{ round(r.protein) }} g</span><span>G {{ round(r.carbs) }} g</span><span>L {{ round(r.fat) }} g</span></div><div class="item-actions"><button class="secondary" @click="tab='journal';open('meal');meal.itemType='recipe';meal.itemId=r.id;meal.quantity=1">Ajouter au journal</button><button class="icon-button" :aria-label="'Supprimer '+r.name" @click="removeItem('recipes',r.id)">×</button></div></article></div></template>
  </main>
  <div v-if="modal" class="modal-backdrop" @click.self="close"><section class="modal" role="dialog" aria-modal="true" :aria-label="modal"><div class="modal-head"><h2>{{ {product:'Ajouter un produit',recipe:'Créer une recette',meal:'Ajouter un repas',goal:'Objectif quotidien'}[modal] }}</h2><button class="icon-button" aria-label="Fermer" @click="close">×</button></div><div v-if="error" class="error" role="alert">{{ error }}</div>
   <form v-if="modal==='product'" @submit.prevent="saveProduct"><div class="upload"><label for="label-photo"><b>Photo de l’étiquette nutritionnelle</b></label><p class="helper">Une photo nette, avec les valeurs pour 100 g visibles.</p><input id="label-photo" type="file" accept="image/*" capture="environment" :disabled="scanBusy" @change="scanPhoto"><p v-if="scanInfo" class="helper" role="status">{{ scanInfo }}</p></div><div class="field"><label for="p-name">Nom du produit</label><input id="p-name" v-model.trim="product.name" required placeholder="Ex. Yaourt nature"></div><div class="field"><label for="p-brand">Marque (facultatif)</label><input id="p-brand" v-model.trim="product.brand" placeholder="Ex. Ma marque"></div><p class="tip">Renseigne les valeurs pour 100 g. Vérifie les chiffres détectés sur la photo.</p><div class="grid2"><div v-for="f in [{key:'kcal',label:'Calories (kcal)'},{key:'protein',label:'Protéines (g)'},{key:'carbs',label:'Glucides (g)'},{key:'fat',label:'Lipides (g)'}]" :key="f.key" class="field"><label :for="f.key">{{ f.label }}</label><input :id="f.key" v-model="product[f.key]" type="number" min="0" step="0.1" required></div></div><button class="primary full" :disabled="busy||scanBusy">Enregistrer le produit</button></form>
   <form v-else-if="modal==='recipe'" @submit.prevent="saveRecipe"><div class="field"><label for="r-name">Nom de la recette</label><input id="r-name" v-model.trim="recipe.name" required placeholder="Ex. Salade de pâtes"></div><div class="field"><label for="r-portions">Nombre de portions</label><input id="r-portions" v-model="recipe.portions" type="number" min="1" max="100" required></div><label class="eyebrow">INGRÉDIENTS</label><p v-if="!state.products.length" class="tip">Ajoute d’abord un produit pour composer ta recette.</p><div v-for="(line,i) in recipe.ingredients" :key="i" class="ingredient-row"><select v-model="line.productId" required aria-label="Produit"><option value="" disabled>Choisir un produit</option><option v-for="p in state.products" :key="p.id" :value="p.id">{{ p.name }}</option></select><input v-model="line.grams" type="number" min="1" step="1" required aria-label="Grammes"><button type="button" aria-label="Retirer cet ingrédient" :disabled="recipe.ingredients.length===1" @click="recipe.ingredients.splice(i,1)">×</button></div><button type="button" class="secondary" @click="addIngredient">Ajouter un ingrédient</button><button class="primary full" :disabled="busy||!state.products.length">Enregistrer la recette</button></form>
   <form v-else-if="modal==='meal'" @submit.prevent="saveMeal"><div class="field"><label for="m-type">Moment du repas</label><select id="m-type" v-model="meal.mealType"><option>Petit-déjeuner</option><option>Déjeuner</option><option>Dîner</option><option>Collation</option></select></div><div class="field"><label for="m-itemtype">Ajouter</label><select id="m-itemtype" v-model="meal.itemType" @change="meal.itemId='';meal.quantity=meal.itemType==='recipe'?1:100"><option value="product">Un produit</option><option value="recipe">Une recette</option></select></div><div class="field"><label for="m-item">{{ meal.itemType==='recipe'?'Recette':'Produit' }}</label><select id="m-item" v-model="meal.itemId" required><option value="" disabled>Choisir</option><option v-for="it in items" :key="it.id" :value="it.id">{{ it.name }}</option></select></div><p v-if="!items.length" class="tip">Aucun élément disponible. Ajoute d’abord {{ meal.itemType==='recipe'?'une recette':'un produit' }}.</p><div class="field"><label for="m-quantity">{{ meal.itemType==='recipe'?'Portions':'Quantité (g)' }}</label><input id="m-quantity" v-model="meal.quantity" type="number" min="0.1" step="0.1" required></div><button class="primary full" :disabled="busy||!items.length">Ajouter au journal</button></form>
   <form v-else @submit.prevent="saveGoal"><div class="field"><label for="goal">Objectif calorique quotidien (kcal)</label><input id="goal" v-model="goal" type="number" min="500" max="10000" step="1" required></div><p class="helper">Cet objectif sert de repère dans ton journal.</p><button class="primary full" :disabled="busy">Enregistrer l’objectif</button></form>
  </section></div>
 </div>
</template>
