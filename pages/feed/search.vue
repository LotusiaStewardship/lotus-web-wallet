<script setup lang="ts">
/**
 * Feed Search Page
 *
 * Search for profiles across platforms.
 * Results link to profile detail pages.
 */
import type { ProfileListItem } from '~/composables/useRankApi'

definePageMeta({
  title: 'Search',
})

const { searchProfiles } = useRankApi()

const query = ref('')
const results = ref<ProfileListItem[]>([])
const loading = ref(false)
const searched = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleInput() {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (query.value.trim().length < 2) {
    results.value = []
    searched.value = false
    return
  }

  debounceTimer = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  const q = query.value.trim()
  if (q.length < 2) return

  loading.value = true
  searched.value = true
  try {
    results.value = await searchProfiles(q)
  } catch (err) {
    console.error('[FeedSearch] search error:', err)
    results.value = []
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Back Button -->
    <NuxtLink to="/feed"
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Feed
    </NuxtLink>

    <!-- Search Input -->
    <div class="relative">
      <UIcon name="i-lucide-search"
        class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input v-model="query" type="text" placeholder="Search profiles..."
        class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        autofocus @input="handleInput" @keydown.enter="performSearch" />
      <UIcon v-if="loading" name="i-lucide-loader-2"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
    </div>

    <!-- Results -->
    <div v-if="loading && results.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="results.length > 0" class="space-y-2">
      <FeedProfileCard v-for="profile in results" :key="`${profile.platform}-${profile.id}`" :profile="profile" />
    </div>

    <div v-else-if="searched && !loading" class="text-center py-12">
      <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500">No profiles found for "{{ query }}"</p>
      <p class="text-sm text-gray-400 mt-1">Try a different search term</p>
    </div>

    <div v-else class="text-center py-12">
      <UIcon name="i-lucide-search" class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      <p class="text-gray-500">Search for ranked profiles</p>
      <p class="text-sm text-gray-400 mt-1">Enter at least 2 characters</p>
    </div>
  </div>
</template>
