<script setup lang="ts">
/**
 * Explorer Page (Catch-all)
 *
 * Handles all explorer routes:
 * - /explore (home)
 * - /explore/tx/[txid]
 * - /explore/address/[address]
 * - /explore/block/[height]
 */

definePageMeta({
  title: 'Explorer',
})

const route = useRoute()

const searchQuery = ref('')
const searchError = ref('')

const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s : s ? [s] : []
})

const routeType = computed(() => {
  if (slug.value.length === 0) return 'home'
  if (slug.value[0] === 'tx' && slug.value[1]) return 'tx'
  if (slug.value[0] === 'address' && slug.value[1]) return 'address'
  if (slug.value[0] === 'block' && slug.value[1]) return 'block'
  return 'notfound'
})

const routeParam = computed(() => slug.value[1] || '')

const blockHeight = computed(() => {
  const h = parseInt(routeParam.value)
  return isNaN(h) ? 0 : h
})

function handleSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  searchError.value = ''

  // Detect type and navigate
  if (query.startsWith('lotus_') || query.startsWith('lotusT')) {
    navigateTo(`/explore/address/${query}`)
  } else if (query.length === 64 && /^[a-fA-F0-9]+$/.test(query)) {
    // 64 hex chars = txid or block hash
    navigateTo(`/explore/tx/${query}`)
  } else if (/^\d+$/.test(query)) {
    navigateTo(`/explore/block/${query}`)
  } else {
    searchError.value = 'Invalid search. Enter an address, transaction ID, or block height.'
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchError.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search Header -->
    <div class="flex items-center gap-2">
      <UButton v-if="routeType !== 'home'" variant="ghost" icon="i-lucide-arrow-left" @click="navigateTo('/explore')" />
      <h1 class="text-xl font-bold">Explorer</h1>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <UInput class="w-full" v-model="searchQuery" icon="i-lucide-search"
        placeholder="Search address, transaction, or block..." size="lg" :color="searchError ? 'error' : undefined"
        @keyup.enter="handleSearch" />
      <UButton v-if="searchQuery" class="absolute right-2 top-1/2 -translate-y-1/2" variant="ghost" size="xs"
        icon="i-lucide-x" @click="clearSearch" />
    </div>
    <p v-if="searchError" class="text-sm text-error">{{ searchError }}</p>

    <!-- Home View -->
    <template v-if="routeType === 'home'">
      <ExplorerHome />
    </template>

    <!-- Transaction View -->
    <template v-else-if="routeType === 'tx'">
      <ExplorerTransactionDetail :txid="routeParam" />
    </template>

    <!-- Address View -->
    <template v-else-if="routeType === 'address'">
      <ExplorerAddressDetail :address="routeParam" />
    </template>

    <!-- Block View -->
    <template v-else-if="routeType === 'block'">
      <ExplorerBlockDetail :height="blockHeight" />
    </template>

    <!-- Not Found -->
    <template v-else>
      <div class="text-center py-12">
        <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 class="text-lg font-medium">Not Found</h2>
        <p class="text-gray-500 text-sm">The requested resource was not found.</p>
      </div>
    </template>
  </div>
</template>
