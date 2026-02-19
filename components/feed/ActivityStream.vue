<script setup lang="ts">
/**
 * Activity Stream Component
 *
 * Scrollable, paginated stream of posts from the unified feed.
 * Supports four sort modes selectable by the user:
 *   - Curated (default): R62–R66 burn-only dampening pipeline
 *   - Recent: Chronological by first vote
 *   - Top Ranked: Raw linear burn score (satsPositive - satsNegative)
 *   - Controversial: High dissent on both sides
 *
 * R1-safe: Individual vote data is not shown — only post-level aggregate data.
 */
import type { FeedSortMode } from '~/composables/useRankApi'
import { FeedSortLabel } from '~/composables/useRankApi'

const feedStore = useFeedStore()
const { getFeedPosts } = useRankApi()

const seenPostIds = new Set<string>()
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const pageSize = 20
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

const sortOptions: Array<{ label: string; value: FeedSortMode; icon: string; description: string }> = [
  {
    label: FeedSortLabel.curated,
    value: 'curated',
    icon: 'i-lucide-sparkles',
    description: 'Fair-weighted by community burn signal',
  },
  {
    label: FeedSortLabel.recent,
    value: 'recent',
    icon: 'i-lucide-clock',
    description: 'Most recently voted on',
  },
  {
    label: FeedSortLabel.ranking,
    value: 'ranking',
    icon: 'i-lucide-trending-up',
    description: 'Highest total burn score',
  },
  {
    label: FeedSortLabel.controversial,
    value: 'controversial',
    icon: 'i-lucide-scale',
    description: 'High dissent on both sides',
  },
]

// Restore scroll position after posts load
async function restoreScrollPosition() {
  await nextTick()
  setTimeout(() => {
    if (feedStore.lastScrollPosition > 0) {
      window.scrollTo(0, feedStore.lastScrollPosition)
    }
  }, 50)
}

async function fetchPosts(append: boolean = false) {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  error.value = null

  try {
    const result = await getFeedPosts({
      sortBy: feedStore.sortMode,
      page: feedStore.page,
      pageSize,
    })
    if (!result) {
      error.value = 'Failed to load feed'
      return
    }

    if (append) {
      const newPosts = result.posts.filter((p) => !seenPostIds.has(`${p.platform}-${p.profileId}-${p.id}`))
      newPosts.forEach(p => seenPostIds.add(`${p.platform}-${p.profileId}-${p.id}`))
      feedStore.posts.push(...newPosts)
    } else {
      seenPostIds.clear()
      result.posts.forEach(p => seenPostIds.add(`${p.platform}-${p.profileId}-${p.id}`))
      const unique = result.posts.filter((p, i, arr) =>
        arr.findIndex((a) => a.platform === p.platform && a.profileId === p.profileId && a.id === p.id) === i
      )
      feedStore.posts = unique
    }

    feedStore.hasMore = result.pagination.hasNext

    if (!append && feedStore.lastScrollPosition > 0) {
      await restoreScrollPosition()
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to load feed'
    console.error('[ActivityStream] fetch error:', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !feedStore.hasMore) return
  feedStore.page++
  await fetchPosts(true)
}

async function refresh() {
  feedStore.page = 1
  feedStore.hasMore = true
  seenPostIds.clear()
  await fetchPosts(false)
}

async function setSortMode(mode: FeedSortMode) {
  if (feedStore.sortMode === mode) return
  feedStore.sortMode = mode
  feedStore.reset()
  seenPostIds.clear()
  await fetchPosts(false)
}

function saveScrollPosition() {
  feedStore.saveScrollPosition(window.scrollY)
}

onMounted(() => {
  if (feedStore.posts.length === 0) {
    fetchPosts()
  } else {
    feedStore.posts.forEach(p => seenPostIds.add(`${p.platform}-${p.profileId}-${p.id}`))
    restoreScrollPosition()
  }
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  saveScrollPosition()
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">

      <!-- Sort mode dropdown trigger (left side) -->
      <div ref="dropdownRef" class="relative">
        <button class="flex items-center gap-1.5 group select-none" :disabled="loading" @click.stop="toggleDropdown">
          <UIcon :name="sortOptions.find(o => o.value === feedStore.sortMode)?.icon ?? 'i-lucide-activity'"
            class="w-5 h-5 text-primary flex-shrink-0" />
          <span class="font-semibold group-hover:text-primary transition-colors">
            {{sortOptions.find(o => o.value === feedStore.sortMode)?.label ?? 'Feed'}}
          </span>
          <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-gray-400 transition-transform duration-150"
            :class="dropdownOpen ? 'rotate-180' : ''" />
        </button>

        <!-- Dropdown panel -->
        <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="dropdownOpen"
            class="absolute left-0 top-full mt-2 w-64 z-50 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
            <button v-for="opt in sortOptions" :key="opt.value"
              class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              :class="feedStore.sortMode === opt.value ? 'bg-primary/5 dark:bg-primary/10' : ''"
              @click.stop="setSortMode(opt.value); dropdownOpen = false">
              <UIcon :name="opt.icon" class="w-4 h-4 mt-0.5 flex-shrink-0"
                :class="feedStore.sortMode === opt.value ? 'text-primary' : 'text-gray-400'" />
              <div class="min-w-0">
                <div class="text-sm font-medium leading-tight"
                  :class="feedStore.sortMode === opt.value ? 'text-primary' : 'text-gray-900 dark:text-gray-100'">
                  {{ opt.label }}
                </div>
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                  {{ opt.description }}
                </div>
              </div>
              <UIcon v-if="feedStore.sortMode === opt.value" name="i-lucide-check"
                class="w-3.5 h-3.5 text-primary ml-auto mt-0.5 flex-shrink-0" />
            </button>
          </div>
        </Transition>
      </div>

      <!-- Refresh button (right side) -->
      <button class="text-sm text-primary hover:underline flex items-center gap-1" :disabled="loading" @click="refresh">
        <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <!-- Loading State (initial) -->
    <div v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in 6" :key="i" class="px-4 py-3">
        <!-- Match ActivityItem layout: Top row with avatar + content -->
        <div class="flex items-center gap-3 pb-2">
          <!-- Avatar skeleton -->
          <div class="relative flex-shrink-0">
            <USkeleton class="w-10 h-10 rounded-full" />
            <div
              class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
              <USkeleton class="w-2.5 h-2.5" />
            </div>
          </div>

          <!-- Content skeleton -->
          <div class="flex-1 min-w-0 space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <USkeleton class="h-5 w-24" />
              <USkeleton class="h-5 w-16" />
            </div>
            <div class="flex items-center gap-1.5">
              <USkeleton class="h-3 w-12" />
              <USkeleton class="h-3 w-16" />
            </div>
          </div>
        </div>

        <!-- Post content skeleton -->
        <div class="mb-2 space-y-1">
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-3/4" />
        </div>

        <!-- Bottom action row skeleton -->
        <div class="flex items-center gap-4 mt-2">
          <USkeleton class="h-7 w-16 rounded-md" />
          <USkeleton class="h-7 w-16 rounded-md" />
          <div class="flex-1" />
          <USkeleton class="h-3 w-20" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">{{ error }}</p>
      <button class="mt-2 text-sm text-primary hover:underline" @click="refresh">
        Try again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="feedStore.posts.length === 0" class="text-center py-12 text-gray-500">
      <UIcon name="i-lucide-inbox" class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p class="font-medium">No posts yet</p>
      <p class="text-sm text-gray-400 mt-1">Curated posts will appear here as the community engages.</p>
    </div>

    <!-- Post List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <FeedActivityItem v-for="post in feedStore.posts" :key="`${post.platform}-${post.profileId}-${post.id}`"
        :post="post" />
    </div>

    <!-- Load More -->
    <div v-if="!loading && feedStore.posts.length > 0 && feedStore.hasMore"
      class="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <button class="w-full py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1.5"
        :disabled="loadingMore" @click="loadMore">
        <UIcon v-if="loadingMore" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        <span>{{ loadingMore ? 'Loading...' : 'Load more' }}</span>
      </button>
    </div>

    <!-- End of feed -->
    <div v-if="!loading && feedStore.posts.length > 0 && !feedStore.hasMore"
      class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
      <p class="text-xs text-gray-400">You've reached the end of the feed.</p>
    </div>
  </div>
</template>
