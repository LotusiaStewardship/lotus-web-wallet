<script setup lang="ts">
/**
 * Activity Stream Component
 *
 * Scrollable, paginated stream of recent RANK vote activity.
 * This is the primary feed view — a chronological stream of community curation.
 *
 * R1-safe: Individual votes are shown (who curated what),
 * but aggregate sentiment is never revealed. This lets users see the community
 * in action without being influenced by majority direction.
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1
 */
import type { RankTransaction } from '~/composables/useRankApi'

const { getVoteActivity } = useRankApi()

const votes = ref<RankTransaction[]>([])
const seenTxids = new Set<string>()
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const hasMore = ref(true)
const pageSize = 20

async function fetchVotes(append: boolean = false) {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  error.value = null

  try {
    const result = await getVoteActivity(page.value, pageSize)
    if (!result) {
      error.value = 'Failed to load activity'
      return
    }

    if (append) {
      const newVotes = result.votes.filter((v: RankTransaction) => !seenTxids.has(v.txid))
      newVotes.forEach((v: RankTransaction) => seenTxids.add(v.txid))
      votes.value = [...votes.value, ...newVotes]
    } else {
      seenTxids.clear()
      result.votes.forEach((v: RankTransaction) => seenTxids.add(v.txid))
      // Deduplicate within the page itself
      const unique = result.votes.filter((v: RankTransaction, i: number, arr: RankTransaction[]) =>
        arr.findIndex((a: RankTransaction) => a.txid === v.txid) === i
      )
      votes.value = unique
    }

    hasMore.value = page.value < result.numPages
  } catch (err: any) {
    error.value = err?.message || 'Failed to load activity'
    console.error('[ActivityStream] fetch error:', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value++
  await fetchVotes(true)
}

async function refresh() {
  page.value = 1
  hasMore.value = true
  await fetchVotes(false)
}

onMounted(() => fetchVotes())
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
        <span class="font-semibold">Recent Activity</span>
      </div>
      <button class="text-sm text-primary hover:underline flex items-center gap-1" :disabled="loading" @click="refresh">
        <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <!-- Loading State (initial) -->
    <div v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in 6" :key="i" class="px-4 py-3">
        <div class="flex items-center gap-3 animate-pulse">
          <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          </div>
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
    <div v-else-if="votes.length === 0" class="text-center py-12 text-gray-500">
      <UIcon name="i-lucide-inbox" class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p class="font-medium">No activity yet</p>
      <p class="text-sm text-gray-400 mt-1">Curation activity will appear here as the community engages.</p>
    </div>

    <!-- Activity List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <FeedActivityItem v-for="vote in votes" :key="vote.txid" :vote="vote" />
    </div>

    <!-- Load More -->
    <div v-if="!loading && votes.length > 0 && hasMore" class="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <button class="w-full py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1.5"
        :disabled="loadingMore" @click="loadMore">
        <UIcon v-if="loadingMore" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        <span>{{ loadingMore ? 'Loading...' : 'Load more' }}</span>
      </button>
    </div>

    <!-- End of feed -->
    <div v-if="!loading && votes.length > 0 && !hasMore"
      class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
      <p class="text-xs text-gray-400">You've reached the end of recent activity.</p>
    </div>
  </div>
</template>
