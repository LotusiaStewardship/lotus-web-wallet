import type { PostData, FeedSortMode } from '~/composables/useRankApi'

/**
 * Feed Store - In-Memory State Only
 *
 * This store maintains feed state in memory during navigation.
 * Data does NOT persist to localStorage or survive page refresh.
 * Feed will refresh from API on browser refresh as intended.
 */
export const useFeedStore = defineStore('feed', () => {
  // State - in-memory only (no localStorage persistence)
  const posts = ref<PostData[]>([])
  const page = ref(1)
  const hasMore = ref(true)
  const lastScrollPosition = ref(0)
  /** Active sort mode — 'curated' is the default (R62–R66 dampening pipeline) */
  const sortMode = ref<FeedSortMode>('curated')

  // Check if we have cached posts (in-memory only)
  const hasCachedPosts = computed(() => posts.value.length > 0)

  // Reset feed state (useful for explicit refresh or sort mode change)
  function reset() {
    posts.value = []
    page.value = 1
    hasMore.value = true
    lastScrollPosition.value = 0
  }

  // Save scroll position
  function saveScrollPosition(y: number) {
    lastScrollPosition.value = y
  }

  return {
    posts,
    page,
    hasMore,
    lastScrollPosition,
    sortMode,
    hasCachedPosts,
    reset,
    saveScrollPosition,
  }
})
