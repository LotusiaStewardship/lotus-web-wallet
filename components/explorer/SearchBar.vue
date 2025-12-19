<script setup lang="ts">
/**
 * ExplorerSearchBar
 *
 * Search input for blockchain explorer with recent searches.
 */
const model = defineModel<string>()

const emit = defineEmits<{
  search: [query: string]
}>()

const recentSearches = ref<string[]>([])
const showSuggestions = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// Handle form submission
function handleSubmit() {
  if (model.value?.trim()) {
    emit('search', model.value.trim())
    addToRecent(model.value.trim())
    showSuggestions.value = false
  }
}

// Add to recent searches
function addToRecent(query: string) {
  recentSearches.value = [
    query,
    ...recentSearches.value.filter(q => q !== query),
  ].slice(0, 5)
  localStorage.setItem('explorer_recent', JSON.stringify(recentSearches.value))
}

// Select from recent
function selectRecent(query: string) {
  model.value = query
  handleSubmit()
}

// Clear recent searches
function clearRecent() {
  recentSearches.value = []
  localStorage.removeItem('explorer_recent')
}

// Hide suggestions with delay (allows click to register)
function hideSuggestions() {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

// Load recent searches on mount
onMounted(() => {
  const saved = localStorage.getItem('explorer_recent')
  if (saved) {
    try {
      recentSearches.value = JSON.parse(saved)
    } catch {
      // Invalid JSON, ignore
    }
  }
})

// Detect search type for placeholder hint
const searchType = computed(() => {
  const query = model.value?.trim() || ''
  if (!query) return null
  if (/^[0-9]+$/.test(query)) return 'block'
  if (/^[a-f0-9]{64}$/i.test(query)) return 'hash'
  if (query.startsWith('lotus_')) return 'address'
  return null
})

const searchTypeHint = computed(() => {
  switch (searchType.value) {
    case 'block':
      return 'Block height'
    case 'hash':
      return 'Transaction or block hash'
    case 'address':
      return 'Address'
    default:
      return null
  }
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="relative">
    <UInput ref="inputRef" v-model="model" icon="i-lucide-search"
      placeholder="Search by address, transaction, or block..." size="lg" class="w-full" @focus="showSuggestions = true"
      @blur="hideSuggestions">
      <template #trailing>
        <div class="flex items-center gap-2">
          <span v-if="searchTypeHint" class="text-xs text-muted hidden sm:inline">
            {{ searchTypeHint }}
          </span>
          <UButton type="submit" color="primary" size="xs" :disabled="!model?.trim()">
            Search
          </UButton>
        </div>
      </template>
    </UInput>

    <!-- Recent Searches Dropdown -->
    <Transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
      <!-- Phase 6: Semantic color classes -->
      <div v-if="showSuggestions && recentSearches.length && !model"
        class="absolute top-full left-0 right-0 mt-1 bg-background rounded-lg shadow-lg border border-default z-10 overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b border-default">
          <span class="text-xs text-muted">Recent Searches</span>
          <button type="button" class="text-xs text-muted hover:text-foreground" @click="clearRecent">
            Clear
          </button>
        </div>
        <div class="max-h-48 overflow-y-auto">
          <button v-for="search in recentSearches" :key="search" type="button"
            class="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 truncate flex items-center gap-2"
            @mousedown.prevent="selectRecent(search)">
            <UIcon name="i-lucide-history" class="w-4 h-4 text-muted flex-shrink-0" />
            <span class="truncate font-mono">{{ search }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </form>
</template>
