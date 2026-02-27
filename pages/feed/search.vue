<script setup lang="ts">
/**
 * Feed Search Page
 *
 * Search for profiles across platforms.
 * Results link to profile detail pages.
 * 
 * Enhanced: Supports contact name lookup and conversion to scriptPayload.
 */
import type { ProfileListItem } from '~/composables/useRankApi'

definePageMeta({
  title: 'Search',
})

const { searchProfiles } = useRankApi()
const { $explorer } = useNuxtApp()
const peopleStore = usePeopleStore()

const query = ref('')
const results = ref<ProfileListItem[]>([])
const loading = ref(false)
const searched = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Convert contact name to scriptPayload for API search
 * Returns null if no contact found or conversion fails
 */
function nameToScriptPayload(contactName: string): string | null {
  const contact = peopleStore.getByName(contactName)
  if (!contact) return null

  try {
    const { scriptPayload } = $explorer.getScriptFromAddress(contact.address)
    return scriptPayload
  } catch (error) {
    console.error('[FeedSearch] Failed to convert address to scriptPayload:', error)
    return null
  }
}

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
    const searchPromises: Promise<ProfileListItem[]>[] = []

    // Always search for the original query
    searchPromises.push(searchProfiles(q))

    // Check if query matches a contact name exactly
    const contact = peopleStore.getByName(q)
    if (contact) {
      // Convert contact address to scriptPayload for API search
      const scriptPayload = nameToScriptPayload(q)
      if (scriptPayload) {
        searchPromises.push(searchProfiles(scriptPayload))
        console.log(`[FeedSearch] Found contact "${q}" -> also searching by scriptPayload: ${scriptPayload}`)
      }
    } else {
      // Check for partial name matches (if exactly one match, use it)
      const partialMatches = peopleStore.findByName(q)
      if (partialMatches.length === 1) {
        const scriptPayload = nameToScriptPayload(partialMatches[0].name)
        if (scriptPayload) {
          searchPromises.push(searchProfiles(scriptPayload))
          console.log(`[FeedSearch] Found single partial match "${partialMatches[0].name}" -> also searching by scriptPayload: ${scriptPayload}`)
        }
      } else if (partialMatches.length > 1) {
        console.log(`[FeedSearch] Found ${partialMatches.length} partial matches for "${q}", using original query only`)
      }
    }

    // Execute all searches in parallel and combine results
    const searchResults = await Promise.all(searchPromises)

    // Combine and deduplicate results by id, tracking contact results
    const combinedResults = new Map<string, ProfileListItem>()
    const contactResultIds = new Set<string>()

    for (let i = 0; i < searchResults.length; i++) {
      const resultsArray = searchResults[i]
      const isContactSearch = i > 0 // First search is always original query, subsequent are contact searches

      for (const result of resultsArray) {
        if (!combinedResults.has(result.id)) {
          combinedResults.set(result.id, result)
          if (isContactSearch) {
            contactResultIds.add(result.id)
          }
        }
      }
    }

    // Convert to array and sort: contact results first, then others
    const allResults = Array.from(combinedResults.values())
    const sortedResults = allResults.sort((a, b) => {
      const aIsContact = contactResultIds.has(a.id)
      const bIsContact = contactResultIds.has(b.id)

      // If both are contacts or both are not contacts, maintain original order
      if (aIsContact === bIsContact) return 0

      // Contacts come first
      return aIsContact ? -1 : 1
    })

    results.value = sortedResults

    console.log(`[FeedSearch] Combined ${searchPromises.length} searches into ${results.value.length} unique results (${contactResultIds.size} contacts first)`)
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
    <UButton variant="link" color="neutral" size="sm" icon="i-lucide-arrow-left" to="/feed">
      Back to Feed
    </UButton>

    <!-- Search Input -->
    <UInput class="relative w-full" v-model="query" icon="i-lucide-search"
      placeholder="Search profiles or contact names..." size="lg" :loading="loading" autofocus @input="handleInput"
      @keydown.enter="performSearch" />

    <!-- Results -->
    <div v-if="loading && results.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <USkeleton class="h-10 w-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-3 w-1/4" />
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
