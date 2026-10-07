<script setup>
const props = defineProps({
    modelValue: { type: String, default: '' },
    options: { type: Array, required: true },
    label: { type: String, required: true },
    id: { type: String, required: true },
    placeholder: { type: String, default: 'Choisir' },
    searchPlaceholder: { type: String, default: 'Nom ou marque' },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const trigger = ref(null)
const panel = ref(null)
const searchInput = ref(null)
const closeButton = ref(null)
const viewportStyle = ref({})
const selected = computed(() => props.options.find(item => item.id === props.modelValue))
const optionLabel = item => `${item.name}${item.brand ? ` · ${item.brand}` : ''}`
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim()
const filtered = computed(() => {
    const words = normalize(query.value).split(/\s+/)
    return props.options.filter(item => words.every(word => normalize(optionLabel(item)).includes(word)))
})
watch(query, () => { activeIndex.value = 0 })

function updateViewport() {
    const viewport = window.visualViewport
    viewportStyle.value = viewport ? {
        top: `${viewport.offsetTop}px`,
        left: `${viewport.offsetLeft}px`,
        width: `${viewport.width}px`,
        height: `${viewport.height}px`
    } : {}
}
function stopViewportTracking() {
    window.visualViewport?.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('scroll', updateViewport)
    window.removeEventListener('resize', updateViewport)
}
onBeforeUnmount(stopViewportTracking)

async function open() {
    if (props.disabled) return
    query.value = ''
    activeIndex.value = Math.max(0, props.options.findIndex(item => item.id === props.modelValue))
    updateViewport()
    window.visualViewport?.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    isOpen.value = true
    await nextTick()
    if (window.matchMedia('(pointer: coarse)').matches) panel.value?.focus({ preventScroll: true })
    else searchInput.value?.focus()
}
async function close() {
    stopViewportTracking()
    isOpen.value = false
    await nextTick()
    trigger.value?.focus()
}
function choose(item) {
    emit('update:modelValue', item.id)
    close()
}
function onKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key === 'Tab') {
        event.preventDefault()
        if (document.activeElement === searchInput.value && !event.shiftKey) closeButton.value?.focus()
        else searchInput.value?.focus()
        return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (filtered.value.length) activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + filtered.value.length) % filtered.value.length
        return
    }
    if (event.key === 'Enter' && document.activeElement === searchInput.value && filtered.value[activeIndex.value]) {
        event.preventDefault()
        choose(filtered.value[activeIndex.value])
    }
}
</script>

<template>
    <button :id="id" ref="trigger" type="button" class="search-select-trigger" :disabled="disabled"
        :aria-label="`${label} : ${selected ? optionLabel(selected) : placeholder}`" :aria-required="required"
        aria-haspopup="dialog" :aria-expanded="isOpen" @click="open">
        <span :class="{ 'search-select-placeholder': !selected }">{{ selected ? optionLabel(selected) : placeholder
            }}</span>
        <span class="search-select-chevron" aria-hidden="true">⌄</span>
    </button>
    <Teleport to="body">
        <div v-if="isOpen" class="search-select-backdrop" :style="viewportStyle" @click.self="close">
            <section ref="panel" class="search-select-panel" role="dialog" aria-modal="true" tabindex="-1"
                :aria-labelledby="`${id}-title`" @keydown="onKeydown">
                <div class="search-select-head">
                    <h2 :id="`${id}-title`">{{ label }}</h2><button ref="closeButton" type="button"
                        class="search-select-close" aria-label="Fermer la liste" @click="close">×</button>
                </div>
                <label class="search-select-search-label" :for="`${id}-search`">Rechercher</label>
                <input :id="`${id}-search`" ref="searchInput" v-model="query" type="search" class="search-select-search"
                    :placeholder="searchPlaceholder" autocomplete="off" role="combobox" aria-autocomplete="list"
                    aria-expanded="true" :aria-controls="`${id}-options`"
                    :aria-activedescendant="filtered.length ? `${id}-option-${activeIndex}` : undefined">
                <div :id="`${id}-options`" class="search-select-options" role="listbox" :aria-label="label">
                    <button v-for="(item, index) in filtered" :id="`${id}-option-${index}`" :key="item.id" type="button"
                        role="option" tabindex="-1" class="search-select-option"
                        :class="{ active: index === activeIndex, selected: item.id === modelValue }"
                        :aria-selected="item.id === modelValue" @mouseenter="activeIndex = index" @click="choose(item)">
                        <span>{{ optionLabel(item) }}</span><span v-if="item.id === modelValue"
                            aria-hidden="true">✓</span>
                    </button>
                    <p v-if="!filtered.length" class="search-select-empty" role="status">Aucun résultat.</p>
                </div>
            </section>
        </div>
    </Teleport>
</template>
