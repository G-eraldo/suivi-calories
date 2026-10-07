<script setup>
import { parseNutritionLabel } from '~/utils/nutrition-scan.js'
import { matchProduct, parseRecipe } from '~/utils/recipe-import.js'
import { vegetables } from '~/utils/vegetables.js'
import { adelieCone, conesForGrams } from '~/utils/ice-cream.js'
import { dryYeast, isDryYeastLabel } from '~/utils/dry-yeast.js'
import { commonFoods, commonFoodForIngredient, unitsForGrams } from '~/utils/common-foods.js'
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
const referenceProducts = [...vegetables, ...commonFoods, dryYeast, adelieCone]
const savedReferenceProduct = reference => state.value.products.some(item => item.name === reference.name && (item.brand || '') === (reference.brand || ''))
const product = reactive({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' })
const selectedVegetable = ref('')
const selectedVegetableSource = computed(() => vegetables.find(item => item.name === selectedVegetable.value)?.fdcId)
const selectedCommonFoodPreset = ref('')
const commonFoodPreset = computed(() => commonFoods.find(item => item.id === selectedCommonFoodPreset.value))
const recipe = reactive({ name: '', portions: 1, instructions: '', ingredients: [{ productId: '', grams: 100, label: '', excluded: false }] })
const importText = ref('')
const importBusy = ref(false)
const importInfo = ref('')
const productForIngredient = ref(-1)
const meal = reactive({ itemType: 'product', itemId: '', mealType: 'Déjeuner', quantity: 100 })
const coneCount = ref(1)
const selectedCommonMeal = ref('egg')
const commonMealCount = ref(1)
const commonMealFood = computed(() => commonFoods.find(item => item.id === selectedCommonMeal.value))
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
    const register = tool => Promise.resolve(context.registerTool(tool, { signal: webMcpLifecycle.signal })).catch(() => { })
    await register({
        name: 'read_food_journal', title: 'Lire le journal alimentaire', description: 'Lire les produits, recettes et repas de la date affichée.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => ({ date: date.value, goal: state.value.goal, totals: totals.value, products: state.value.products, recipes: state.value.recipes, meals: state.value.meals })
    })
    await register({
        name: 'create_product', title: 'Enregistrer un produit', description: 'Enregistrer un produit avec ses valeurs nutritionnelles pour 100 g.',
        inputSchema: { type: 'object', properties: { name: { type: 'string' }, brand: { type: 'string' }, kcal: { type: 'number', minimum: 0 }, protein: { type: 'number', minimum: 0 }, carbs: { type: 'number', minimum: 0 }, fat: { type: 'number', minimum: 0 } }, required: ['name', 'kcal', 'protein', 'carbs', 'fat'], additionalProperties: false },
        annotations: { readOnlyHint: false },
        async execute(input) { if (!input?.name?.trim() || ['kcal', 'protein', 'carbs', 'fat'].some(k => !Number.isFinite(input[k]) || input[k] < 0)) throw new Error('Valeurs nutritionnelles invalides.'); const result = await api('products', { method: 'POST', body: JSON.stringify(input) }); await load(); return { id: result.id, name: input.name } }
    })
    await register({
        name: 'add_meal', title: 'Ajouter un repas', description: 'Ajouter au journal un produit en grammes ou une recette en portions.',
        inputSchema: { type: 'object', properties: { date: { type: 'string' }, mealType: { type: 'string', enum: ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'] }, itemType: { type: 'string', enum: ['product', 'recipe'] }, itemId: { type: 'string' }, quantity: { type: 'number', exclusiveMinimum: 0 } }, required: ['date', 'mealType', 'itemType', 'itemId', 'quantity'], additionalProperties: false },
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
function mealQuantityLabel(entry) {
    if (entry.item_type === 'recipe') return `${entry.quantity} portion${entry.quantity > 1 ? 's' : ''}`
    const cones = entry.item_name === adelieCone.name ? conesForGrams(entry.quantity) : null
    if (cones) return `${cones} cône${cones > 1 ? 's' : ''} (${entry.quantity} g)`
    const food = commonFoods.find(item => item.name === entry.item_name)
    const units = food ? unitsForGrams(food, entry.quantity) : null
    return units ? `${units} ${units > 1 ? food.plural : food.singular} (${entry.quantity} g)` : `${round(entry.quantity)} g`
}
function open(name) { error.value = ''; notice.value = ''; modal.value = name; if (name === 'meal') { meal.itemType = 'product'; meal.itemId = ''; meal.mealType = 'Déjeuner'; meal.quantity = 100; coneCount.value = 1; selectedCommonMeal.value = 'egg'; commonMealCount.value = 1 } }
function close() { modal.value = ''; error.value = ''; scanInfo.value = ''; importInfo.value = ''; productForIngredient.value = -1; selectedVegetable.value = ''; selectedCommonFoodPreset.value = '' }
function applyVegetablePreset() {
    const vegetable = vegetables.find(item => item.name === selectedVegetable.value)
    if (!vegetable) return
    selectedCommonFoodPreset.value = ''
    Object.assign(product, { name: vegetable.name, brand: '', kcal: vegetable.kcal, protein: vegetable.protein, carbs: vegetable.carbs, fat: vegetable.fat })
}
function applyCommonFoodPreset() {
    const food = commonFoodPreset.value
    if (!food) return
    selectedVegetable.value = ''
    Object.assign(product, { name: food.name, brand: food.brand, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat })
}
function applyDryYeastPreset() {
    selectedVegetable.value = ''
    selectedCommonFoodPreset.value = ''
    Object.assign(product, dryYeast)
}
async function send(path, body, method = 'POST') { error.value = ''; try { busy.value = true; await api(path, { method, body: JSON.stringify(body) }); await load(); close(); notice.value = 'Enregistré.'; setTimeout(() => notice.value = '', 3000) } catch (e) { error.value = e.message } finally { busy.value = false } }
async function saveProduct() {
    error.value = ''
    try {
        busy.value = true
        const result = await api('products', { method: 'POST', body: JSON.stringify({ ...product, kcal: Number(product.kcal), protein: Number(product.protein), carbs: Number(product.carbs), fat: Number(product.fat) }) })
        await load()
        if (productForIngredient.value >= 0) {
            recipe.ingredients[productForIngredient.value].productId = result.id
            productForIngredient.value = -1
            modal.value = 'recipe'
        } else close()
        Object.assign(product, { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' })
        selectedVegetable.value = ''
        selectedCommonFoodPreset.value = ''
        notice.value = 'Produit enregistré.'
    } catch (e) { error.value = e.message } finally { busy.value = false }
}
async function addReferenceProduct(reference) {
    if (busy.value || savedReferenceProduct(reference)) return
    error.value = ''
    try {
        busy.value = true
        const { name, brand = '', kcal, protein, carbs, fat } = reference
        await api('products', { method: 'POST', body: JSON.stringify({ name, brand, kcal, protein, carbs, fat }) })
        await load()
        notice.value = `${name} ajouté à mes produits.`
    } catch (e) { error.value = e.message }
    finally { busy.value = false }
}
async function saveRecipe() { await send('recipes', { name: recipe.name, portions: Number(recipe.portions), instructions: recipe.instructions, ingredients: recipe.ingredients.map(x => ({ productId: x.productId, grams: Number(x.grams), label: x.label, excluded: x.excluded === true })) }); if (!error.value) { Object.assign(recipe, { name: '', portions: 1, instructions: '', ingredients: [{ productId: '', grams: 100, label: '', excluded: false }] }); importText.value = '' } }
async function saveMeal() { await send('meals', { ...meal, date: date.value, quantity: Number(meal.quantity) }) }
async function saveReferenceMeal(reference, enteredCount, singular, plural) {
    const count = Number(enteredCount)
    if (!Number.isInteger(count) || count < 1 || count > 99) { error.value = 'Indique un nombre entier entre 1 et 99.'; return }
    error.value = ''
    busy.value = true
    try {
        let savedProduct = state.value.products.find(item => item.name === reference.name && item.brand === reference.brand)
        if (!savedProduct) {
            const { name, brand, kcal, protein, carbs, fat } = reference
            const { id } = await api('products', { method: 'POST', body: JSON.stringify({ name, brand, kcal, protein, carbs, fat }) })
            savedProduct = { id }
        }
        await api('meals', { method: 'POST', body: JSON.stringify({ date: date.value, mealType: meal.mealType, itemType: 'product', itemId: savedProduct.id, quantity: reference.grams * count }) })
        await load()
        close()
        notice.value = `Ajouté au journal : ${count} ${count > 1 ? plural : singular}.`
    } catch (e) { error.value = e.message; await load() }
    finally { busy.value = false }
}
async function saveConeMeal() { await saveReferenceMeal(adelieCone, coneCount.value, 'cône', 'cônes') }
async function saveCommonFoodMeal() {
    const food = commonMealFood.value
    if (food) await saveReferenceMeal(food, commonMealCount.value, food.singular, food.plural)
}
async function saveGoal() { await send('goal', { goal: Number(goal.value) }) }
async function removeItem(type, id) { if (!confirm('Supprimer cet élément ?')) return; await send(type + '/' + encodeURIComponent(id), {}, 'DELETE') }
function addIngredient() { recipe.ingredients.push({ productId: '', grams: 100, label: '', excluded: false }) }
function createIngredientProduct(index) {
    productForIngredient.value = index
    selectedVegetable.value = ''
    selectedCommonFoodPreset.value = ''
    Object.assign(product, { name: recipe.ingredients[index].label || '', brand: '', kcal: '', protein: '', carbs: '', fat: '' })
    const food = commonFoodForIngredient(recipe.ingredients[index].label)
    if (food) { selectedCommonFoodPreset.value = food.id; applyCommonFoodPreset() }
    else if (isDryYeastLabel(recipe.ingredients[index].label)) applyDryYeastPreset()
    error.value = ''
    modal.value = 'product'
}
function importRecipe() {
    const parsed = parseRecipe(importText.value)
    if (!parsed.ingredients.length) { importInfo.value = 'Aucun ingrédient reconnu. Colle une liste avec les quantités, une ligne par ingrédient.'; return }
    if (parsed.name && !recipe.name) recipe.name = parsed.name
    recipe.portions = parsed.portions
    if (parsed.instructions) recipe.instructions = parsed.instructions
    recipe.ingredients = parsed.ingredients.map(line => {
        const excluded = /^eau(?:\b|\s)/i.test(line.label.trim())
        return { productId: excluded ? '' : matchProduct(line.label, state.value.products)?.id || '', grams: line.grams || '', label: line.label, original: line.original, estimated: line.estimated, excluded }
    })
    importInfo.value = `${parsed.ingredients.length} ingrédient${parsed.ingredients.length > 1 ? 's' : ''} détecté${parsed.ingredients.length > 1 ? 's' : ''}. Vérifie les produits et les poids avant d’enregistrer.`
}
async function readRecipePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    importBusy.value = true; error.value = ''; importInfo.value = 'Lecture de la capture en cours…'
    let worker
    try {
        const { createWorker } = await import('tesseract.js')
        worker = await createWorker('fra+eng')
        const result = await worker.recognize(file)
        importText.value = result.data.text
        importRecipe()
    } catch { error.value = 'Lecture impossible. Colle le texte de la recette à la place.'; importInfo.value = '' }
    finally { await worker?.terminate(); importBusy.value = false; event.target.value = '' }
}
async function scanPhoto(event) {
    const file = event.target.files?.[0]; if (!file) return
    scanBusy.value = true; error.value = ''; scanInfo.value = 'Lecture de l’étiquette en cours…'
    let worker
    try {
        const { createWorker } = await import('tesseract.js')
        worker = await createWorker('fra+eng')
        const result = await worker.recognize(file)
        const { values, hasPer100g } = parseNutritionLabel(result.data.text)
        for (const [key, value] of Object.entries(values)) if (value !== null) product[key] = value
        const count = Object.values(values).filter(v => v !== null).length
        scanInfo.value = count ? `${count} valeur${count > 1 ? 's' : ''} détectée${count > 1 ? 's' : ''}. ${hasPer100g ? 'Vérifie les chiffres avant d’enregistrer.' : 'Vérifie surtout que les chiffres sont donnés pour 100 g ou 100 ml.'}` : 'Aucune valeur reconnue. Essaie une photo plus nette du tableau nutritionnel ou saisis les chiffres.'
    } catch (e) { error.value = 'Lecture impossible. Tu peux saisir les valeurs manuellement.'; scanInfo.value = '' }
    finally { await worker?.terminate(); scanBusy.value = false; event.target.value = '' }
}
</script>
<template>
    <div class="app">
        <aside class="sidebar">
            <div class="logo"><span class="logo-mark">◡</span> Mon suivi</div>
            <nav class="nav" aria-label="Navigation principale"><button :class="{ active: tab === 'journal' }"
                    @click="tab = 'journal'"><span>◫</span> Journal</button><button :class="{ active: tab === 'products' }"
                    @click="tab = 'products'"><span>▦</span> Produits</button><button :class="{ active: tab === 'recipes' }"
                    @click="tab = 'recipes'"><span>▤</span> Recettes</button></nav>
            <div class="sidebar-foot">Tes repas et tes recettes, au même endroit.</div>
        </aside>
        <header class="mobile-header">
            <div class="logo"><span class="logo-mark">◡</span> Mon suivi</div>
            <nav class="mobile-nav" aria-label="Navigation principale"><button :class="{ active: tab === 'journal' }"
                    @click="tab = 'journal'">Journal</button><button :class="{ active: tab === 'products' }"
                    @click="tab = 'products'">Produits</button><button :class="{ active: tab === 'recipes' }"
                    @click="tab = 'recipes'">Recettes</button></nav>
        </header>
        <main class="main">
            <div class="topline"><span class="eyebrow">MON ESPACE PERSONNEL</span><input v-if="tab === 'journal'"
                    v-model="date" class="date-control" type="date" aria-label="Date du journal"></div>
            <div v-if="notice" class="success" role="status">{{ notice }}</div>
            <div v-if="error && !modal" class="error" role="alert">{{ error }} <button class="secondary"
                    @click="load">Réessayer</button></div>
            <template v-if="tab === 'journal'">
                <h1 class="heading">Journal alimentaire</h1>
                <p class="sub">Ton suivi du {{ new
                    Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long',year:'numeric'}) }}
                </p>
                <div class="dashboard">
                    <div>
                        <section class="card summary">
                            <div>
                                <h2>Calories consommées</h2>
                                <div><span class="big-number">{{ round(totals.kcal) }}</span><span
                                        class="unit">kcal</span></div>
                                <div class="fine">{{ remaining }} kcal restantes sur {{ state.goal }}</div><button
                                    class="summary-goal" @click="open('goal')">Modifier l’objectif</button>
                            </div>
                            <div class="ring" :style="{ '--pct': pct + '%' }"><span>{{ pct }} %<small>de
                                        l’objectif</small></span></div>
                        </section>
                        <div class="macro">
                            <div class="macro-item"><b>{{ round(totals.protein) }} g</b><span>Protéines</span></div>
                            <div class="macro-item"><b>{{ round(totals.carbs) }} g</b><span>Glucides</span></div>
                            <div class="macro-item"><b>{{ round(totals.fat) }} g</b><span>Lipides</span></div>
                        </div>
                    </div>
                    <aside class="card side-card"><img src="/lunch-bowl.jpg" class="food-img"
                            alt="Bol repas avec légumes, céréales et protéines">
                        <h3 style="margin-top:18px">Ton objectif quotidien</h3>
                        <p>Un repère simple pour suivre tes apports jour après jour.</p><button class="secondary"
                            @click="open('goal')">Modifier l’objectif</button>
                    </aside>
                </div>
                <div class="section-head">
                    <h2>Repas du jour</h2><button class="primary" @click="open('meal')">Ajouter un repas</button>
                </div>
                <div v-if="busy && !state.meals.length" class="empty">Chargement des repas…</div>
                <div v-else-if="!state.meals.length" class="empty">Aucun repas enregistré pour cette journée. Ajoute ton
                    premier aliment ou une recette.</div>
                <div v-else class="meal-list">
                    <div v-for="m in state.meals" :key="m.id" class="meal">
                        <div class="meal-icon">{{ mealIcon(m.meal_type) }}</div>
                        <div class="meal-info"><b>{{ m.item_name }}</b><span>{{ m.meal_type }} · {{ mealQuantityLabel(m) }}</span></div>
                        <div class="meal-cal">{{ round(m.kcal) }} kcal</div><button class="icon-button"
                            :aria-label="'Supprimer ' + m.item_name" @click="removeItem('meals', m.id)">×</button>
                    </div>
                </div>
            </template>
            <template v-else-if="tab === 'products'">
                <h1 class="heading">Mes produits</h1>
                <p class="sub">Enregistre un produit une fois, puis retrouve-le à chaque repas.</p>
                <div v-if="error" class="error" role="alert">{{ error }}</div>
                <div class="toolbar"><span class="eyebrow">{{ state.products.length }} produit{{
                    state.products.length>1?'s':'' }}</span><button class="primary" @click="open('product')">Ajouter
                        un produit</button></div>
                <div v-if="!state.products.length" class="empty">Aucun produit enregistré. Ajoute une étiquette avec une
                    photo ou saisis les valeurs.</div>
                <div v-else class="library">
                    <article v-for="p in state.products" :key="p.id" class="item-card">
                        <h3>{{ p.name }}</h3>
                        <p>{{ p.brand || 'Pour 100 g' }}</p>
                        <div class="nutrition"><span><b>{{ round(p.kcal) }}</b> kcal</span><span>P {{ round(p.protein)
                                }} g</span><span>G {{ round(p.carbs) }} g</span><span>L {{ round(p.fat) }} g</span>
                        </div>
                        <div class="item-actions"><button class="secondary"
                                @click="tab = 'journal'; open('meal'); meal.itemId = p.id">Ajouter au journal</button><button
                                class="icon-button" :aria-label="'Supprimer ' + p.name"
                                @click="removeItem('products', p.id)">×</button></div>
                    </article>
                </div>
                <section class="reference-section" aria-labelledby="reference-products-title">
                    <h2 id="reference-products-title">Aliments préremplis</h2>
                    <p class="sub">Valeurs pour 100 g. Ajoute ceux que tu utilises à Mes produits pour les retrouver dans tes repas et recettes. L’eau peut rester un ingrédient sans calories dans une recette.</p>
                    <div class="library">
                        <article v-for="reference in referenceProducts" :key="reference.name" class="item-card">
                            <h3>{{ reference.name }}</h3>
                            <p>{{ reference.brand || 'Aliment courant' }} · pour 100 g</p>
                            <div class="nutrition"><span><b>{{ reference.kcal }}</b> kcal</span><span>P {{ reference.protein }} g</span><span>G {{ reference.carbs }} g</span><span>L {{ reference.fat }} g</span></div>
                            <p v-if="reference.grams" class="reference-serving">1 {{ reference.singular || 'cône' }} ≈ {{ reference.grams }} g · {{ round(reference.kcal * reference.grams / 100) }} kcal</p>
                            <p v-else-if="reference.name === dryYeast.name" class="reference-serving">5 g ≈ {{ round(reference.kcal * 5 / 100) }} kcal</p>
                            <div class="item-actions"><button class="secondary" :disabled="busy || savedReferenceProduct(reference)" @click="addReferenceProduct(reference)">{{ savedReferenceProduct(reference) ? 'Déjà dans Mes produits' : 'Ajouter à Mes produits' }}</button></div>
                        </article>
                    </div>
                </section>
            </template>
            <template v-else>
                <h1 class="heading">Mes recettes</h1>
                <p class="sub">Importe une recette ou compose-la avec tes produits habituels. Les calories sont
                    calculées à partir de leurs valeurs.</p>
                <div class="toolbar"><span class="eyebrow">{{ state.recipes.length }} recette{{
                    state.recipes.length>1?'s':'' }}</span><button class="primary" @click="open('recipe')">Créer une
                        recette</button></div>
                <div v-if="!state.recipes.length" class="empty">Aucune recette enregistrée. Ajoute tes produits, puis
                    importe une capture ou crée ta première recette.</div>
                <div v-else class="library">
                    <article v-for="r in state.recipes" :key="r.id" class="item-card">
                        <h3>{{ r.name }}</h3>
                        <p>{{ r.portions }} portion{{ r.portions > 1 ? 's' : '' }} · valeurs par portion</p>
                        <div class="nutrition"><span><b>{{ round(r.kcal) }}</b> kcal</span><span>P {{ round(r.protein)
                                }} g</span><span>G {{ round(r.carbs) }} g</span><span>L {{ round(r.fat) }} g</span>
                        </div>
                        <details v-if="r.ingredients?.length || r.instructions" class="recipe-details">
                            <summary>Voir la recette</summary>
                            <ul>
                                <li v-for="(line, i) in r.ingredients" :key="i">{{ line.grams }} g de {{ line.name }}{{ line.excluded ? ' · non comptabilisé' : '' }}
                                </li>
                            </ul>
                            <p v-if="r.instructions" class="recipe-steps">{{ r.instructions }}</p>
                        </details>
                        <div class="item-actions"><button class="secondary"
                                @click="tab = 'journal'; open('meal'); meal.itemType = 'recipe'; meal.itemId = r.id; meal.quantity = 1">Ajouter
                                au journal</button><button class="icon-button" :aria-label="'Supprimer ' + r.name"
                                @click="removeItem('recipes', r.id)">×</button></div>
                    </article>
                </div>
            </template>
        </main>
        <div v-if="modal" class="modal-backdrop" @click.self="close">
            <section class="modal" role="dialog" aria-modal="true" :aria-label="modal">
                <div class="modal-head">
                    <h2>{{ { product: 'Ajouter un produit', recipe: 'Créer une recette', meal: 'Ajouter un repas', goal: 'Objectif quotidien' }[modal] }}</h2><button class="icon-button" aria-label="Fermer"
                        @click="close">×</button>
                </div>
                <div v-if="error" class="error" role="alert">{{ error }}</div>
                <form v-if="modal === 'product'" @submit.prevent="saveProduct">
                    <div class="upload"><b>Lire une étiquette nutritionnelle</b>
                        <p class="helper">Choisis une image ou prends une photo nette du tableau pour 100 g.</p>
                        <div class="upload-choices"><label class="secondary upload-button" for="label-import">Importer
                                une
                                image</label><input id="label-import" type="file" accept="image/*" :disabled="scanBusy"
                                @change="scanPhoto"><label class="secondary upload-button" for="label-camera">Prendre
                                une
                                photo</label><input id="label-camera" type="file" accept="image/*" capture="environment"
                                :disabled="scanBusy" @change="scanPhoto"></div>
                        <p v-if="scanInfo" class="helper" role="status">{{ scanInfo }}</p>
                    </div>
                    <div class="field"><label for="p-vegetable">Légume courant (facultatif)</label><select id="p-vegetable"
                            v-model="selectedVegetable" @change="applyVegetablePreset">
                            <option value="">Choisir un légume</option>
                            <option v-for="vegetable in vegetables" :key="vegetable.fdcId" :value="vegetable.name">{{ vegetable.name }}</option>
                        </select><p class="helper">Valeurs moyennes pour 100 g de légume cru. Les glucides USDA incluent les fibres. Vérifie le poids et adapte les chiffres si besoin. Source : <a :href="selectedVegetableSource ? `https://fdc.nal.usda.gov/food-details/${selectedVegetableSource}/nutrients` : 'https://fdc.nal.usda.gov/'" target="_blank" rel="noopener noreferrer">USDA FoodData Central</a>.</p></div>
                    <div class="field"><label for="p-common-food">Œuf ou fruit courant (facultatif)</label><select id="p-common-food"
                            v-model="selectedCommonFoodPreset" @change="applyCommonFoodPreset">
                            <option value="">Choisir un aliment</option>
                            <option v-for="food in commonFoods" :key="food.id" :value="food.id">{{ food.name }}</option>
                        </select><p v-if="commonFoodPreset" class="helper">Valeurs pour 100 g d’aliment cru, partie comestible. 1 {{ commonFoodPreset.singular }} ≈ {{ commonFoodPreset.grams }} g et {{ round(commonFoodPreset.kcal * commonFoodPreset.grams / 100) }} kcal. Poids moyen à ajuster si besoin. <a :href="`https://fdc.nal.usda.gov/food-details/${commonFoodPreset.fdcId}/nutrients`" target="_blank" rel="noopener noreferrer">Source USDA</a>.</p></div>
                    <div class="upload"><b>Levure boulangère déshydratée</b>
                        <p class="helper">Valeur de référence : 325 kcal/100 g, soit environ 16 kcal pour 5 g. Les glucides USDA incluent les fibres. <a href="https://fdc.nal.usda.gov/food-details/175043/nutrients" target="_blank" rel="noopener noreferrer">Source USDA</a>.</p>
                        <button type="button" class="secondary" @click="applyDryYeastPreset">Remplir avec ces valeurs</button>
                    </div>
                    <div class="field"><label for="p-name">Nom du produit</label><input id="p-name"
                            v-model.trim="product.name" required placeholder="Ex. Farine de blé"></div>
                    <div class="field"><label for="p-brand">Marque (facultatif)</label><input id="p-brand"
                            v-model.trim="product.brand" placeholder="Ex. Chabrior"></div>
                    <p class="tip">Les valeurs détectées remplissent le formulaire. Vérifie le nom, les chiffres et la
                        base «
                        pour 100 g » avant d’enregistrer.</p>
                    <div class="grid2">
                        <div v-for="f in [{ key: 'kcal', label: 'Calories (kcal)' }, { key: 'protein', label: 'Protéines (g)' }, { key: 'carbs', label: 'Glucides (g)' }, { key: 'fat', label: 'Lipides (g)' }]"
                            :key="f.key" class="field"><label :for="f.key">{{ f.label }}</label><input :id="f.key"
                                v-model="product[f.key]" type="number" min="0" step="0.01" required></div>
                    </div><button class="primary full" :disabled="busy || scanBusy">Enregistrer le produit</button>
                </form>
                <form v-else-if="modal === 'recipe'" @submit.prevent="saveRecipe">
                    <div class="recipe-import"><b>Importer une recette</b>
                        <p class="helper">Colle la légende Instagram ou ajoute une capture où la liste des ingrédients
                            est
                            lisible.</p>
                        <div class="field"><label for="r-import">Texte de la recette</label><textarea id="r-import"
                                v-model="importText" rows="5"
                                placeholder="Nom, ingrédients avec quantités et préparation…"></textarea></div>
                        <div class="import-actions"><button type="button" class="secondary"
                                :disabled="importBusy || !importText.trim()" @click="importRecipe">Analyser le
                                texte</button><label class="secondary upload-button" for="recipe-photo">{{ importBusy ? 'Lecture en cours…' : 'Ajouter une capture' }}</label><input id="recipe-photo" type="file"
                                accept="image/*" :disabled="importBusy" @change="readRecipePhoto"></div>
                        <p v-if="importInfo" class="helper" role="status">{{ importInfo }}</p>
                    </div>
                    <div class="field"><label for="r-name">Nom de la recette</label><input id="r-name"
                            v-model.trim="recipe.name" required placeholder="Ex. Gaufres banane"></div>
                    <div class="field"><label for="r-portions">Nombre de portions</label><input id="r-portions"
                            v-model="recipe.portions" type="number" min="1" max="100" required></div><label
                        class="eyebrow">INGRÉDIENTS</label>
                    <p v-if="!state.products.length" class="tip">Ajoute d’abord un produit pour composer ta recette.</p>
                    <div v-for="(line, i) in recipe.ingredients" :key="i" class="ingredient-block">
                        <div v-if="line.label" class="source-ingredient">{{ line.original || line.label }} <span
                                v-if="line.estimated">· poids estimé ou à préciser</span></div>
                        <div class="ingredient-row"><select v-model="line.productId" :required="!line.excluded" :disabled="line.excluded"
                                :aria-label="'Produit pour ' + (line.label || 'ingrédient ' + (i + 1))">
                                <option value="" disabled>Choisir un produit</option>
                                <option v-for="p in state.products" :key="p.id" :value="p.id">{{ p.name }}{{ p.brand ? ' · ' + p.brand : '' }}</option>
                            </select><input v-model="line.grams" type="number" min="0.1" step="0.1" required
                                :aria-label="'Grammes pour ' + (line.label || 'ingrédient ' + (i + 1))" placeholder="g"><button
                                type="button" aria-label="Retirer cet ingrédient"
                                :disabled="recipe.ingredients.length === 1"
                                @click="recipe.ingredients.splice(i, 1)">×</button></div><button
                            v-if="line.label && !line.productId && !line.excluded" type="button" class="link-button"
                            @click="createIngredientProduct(i)">Créer « {{ line.label }} » comme produit</button>
                        <label class="ingredient-exclude"><input v-model="line.excluded" type="checkbox" @change="line.productId = ''">Ne pas comptabiliser cet ingrédient (sans produit)</label>
                        <div v-if="line.excluded" class="field"><label :for="'r-excluded-' + i">Nom de l’ingrédient</label><input
                                :id="'r-excluded-' + i" v-model.trim="line.label" required placeholder="Ex. Eau ou levure boulangère"></div>
                    </div><button type="button" class="secondary" @click="addIngredient">Ajouter un ingrédient</button>
                    <div class="field"><label for="r-instructions">Préparation (facultatif)</label><textarea
                            id="r-instructions" v-model="recipe.instructions" rows="5"
                            placeholder="Étapes de préparation…"></textarea></div>
                    <p class="tip">Le calcul utilise seulement les ingrédients associés à un produit. Les ingrédients marqués « Ne pas comptabiliser » restent dans la recette, sans calories ajoutées.</p><button class="primary full"
                        :disabled="busy || importBusy || !state.products.length">Enregistrer la recette</button>
                </form>
                <form v-else-if="modal === 'meal'" @submit.prevent="saveMeal">
                    <div class="field"><label for="m-type">Moment du repas</label><select id="m-type"
                            v-model="meal.mealType">
                            <option>Petit-déjeuner</option>
                            <option>Déjeuner</option>
                            <option>Dîner</option>
                            <option>Collation</option>
                        </select></div>
                    <div class="upload"><b>Cônes Adélie vanille nougatine</b>
                        <p class="helper">1 cône = 68,5 g, soit environ 195 kcal d’après l’étiquette du paquet.</p>
                        <div class="field"><label for="m-cones">Nombre de cônes</label><input id="m-cones" v-model="coneCount"
                                type="number" min="1" max="99" step="1"></div>
                        <button type="button" class="secondary" :disabled="busy" @click="saveConeMeal">Ajouter ces cônes au journal</button>
                    </div>
                    <div class="upload"><b>Ajouter un œuf ou un fruit</b>
                        <div class="field"><label for="m-common-food">Aliment</label><select id="m-common-food" v-model="selectedCommonMeal">
                                <option v-for="food in commonFoods" :key="food.id" :value="food.id">{{ food.name }}</option>
                            </select></div>
                        <p v-if="commonMealFood" class="helper">1 {{ commonMealFood.singular }} ≈ {{ commonMealFood.grams }} g de partie comestible, soit {{ round(commonMealFood.kcal * commonMealFood.grams / 100) }} kcal. Pour un autre poids, utilise le champ en grammes ci-dessous.</p>
                        <div class="field"><label for="m-common-count">Nombre de pièces</label><input id="m-common-count"
                                v-model="commonMealCount" type="number" min="1" max="99" step="1"></div>
                        <button type="button" class="secondary" :disabled="busy" @click="saveCommonFoodMeal">Ajouter au journal</button>
                    </div>
                    <div class="field"><label for="m-itemtype">Ajouter</label><select id="m-itemtype"
                            v-model="meal.itemType"
                            @change="meal.itemId = ''; meal.quantity = meal.itemType === 'recipe' ? 1 : 100">
                            <option value="product">Un produit</option>
                            <option value="recipe">Une recette</option>
                        </select></div>
                    <div class="field"><label for="m-item">{{ meal.itemType === 'recipe' ? 'Recette' : 'Produit'
                            }}</label><select id="m-item" v-model="meal.itemId" required>
                            <option value="" disabled>Choisir</option>
                            <option v-for="it in items" :key="it.id" :value="it.id">{{ it.name }}</option>
                        </select></div>
                    <p v-if="!items.length" class="tip">Aucun élément disponible. Ajoute d’abord {{
                        meal.itemType === 'recipe' ?'une recette':'un produit' }}.</p>
                    <div class="field"><label for="m-quantity">{{ meal.itemType === 'recipe' ? 'Portions' : 'Quantité (g)'
                            }}</label><input id="m-quantity" v-model="meal.quantity" type="number" min="0.1" step="0.1"
                            required></div><button class="primary full" :disabled="busy || !items.length">Ajouter au
                        journal</button>
                </form>
                <form v-else @submit.prevent="saveGoal">
                    <div class="field"><label for="goal">Objectif calorique quotidien (kcal)</label><input id="goal"
                            v-model="goal" type="number" min="500" max="10000" step="1" required></div>
                    <p class="helper">Cet objectif sert de repère dans ton journal.</p><button class="primary full"
                        :disabled="busy">Enregistrer l’objectif</button>
                </form>
            </section>
        </div>
    </div>
</template>
