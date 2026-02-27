<script setup lang="ts">
/**
 * Top Posts Component
 *
 * Ranked post list with burn amounts and timespan selector.
 * Fetches data from rank-backend-ts trending endpoints.
 */
import type { PostData, Timespan } from '~/composables/useRankApi'
import { controversyScore } from '~/utils/feed'

const props = withDefaults(defineProps<{
  /** Title for the section */
  title?: string
  /** Show most controversial instead of top-ranked (R2) */
  controversial?: boolean
  /** Maximum items to display */
  limit?: number
}>(), {
  title: 'Trending Posts',
  controversial: false,
  limit: 10,
})

const { getFeedTrending } = useRankApi()
const { pollAfterVote } = usePostVotePolling()
const walletStore = useWalletStore()

const windowHours = ref<number>(24)
const posts = ref<PostData[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const windowOptions: Array<{ label: string; value: number }> = [
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
]

async function fetchPosts() {
  loading.value = true
  error.value = null
  try {
    const result = await getFeedTrending(windowHours.value, 50)
    if (props.controversial) {
      // R2: Sort by burn-weighted controversy score, filter to min 5 votes
      posts.value = result
        .filter(p => (p.votesPositive + p.votesNegative) >= 5)
        .sort((a, b) => {
          const scoreA = controversyScore(a.satsPositive || '0', a.satsNegative || '0')
          const scoreB = controversyScore(b.satsPositive || '0', b.satsNegative || '0')
          return scoreB - scoreA
        })
        .slice(0, props.limit)
    } else {
      posts.value = result.slice(0, props.limit)
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to load posts'
    console.error('[TopPosts] fetch error:', err)
  } finally {
    loading.value = false
  }
}

function changeWindow(hours: number) {
  windowHours.value = hours
  fetchPosts()
}

async function handlePostVoted(txid: string, sentiment?: 'positive' | 'negative', postId?: string, platform?: string, profileId?: string) {
  if (!sentiment || !postId || !platform || !profileId) return

  // Find the post in the array
  const postIndex = posts.value.findIndex(p => p.id === postId && p.platform === platform && p.profileId === profileId)
  if (postIndex === -1) return

  // Optimistic update
  const post = posts.value[postIndex]
  posts.value[postIndex] = {
    ...post,
    votesPositive: sentiment === 'positive' ? post.votesPositive + 1 : post.votesPositive,
    votesNegative: sentiment === 'negative' ? post.votesNegative + 1 : post.votesNegative,
  }

  // Poll for verification (sentiment is always 'positive' or 'negative' here)
  const result = await pollAfterVote({
    platform: platform as any,
    profileId,
    postId,
    txid,
    sentiment,
    scriptPayload: walletStore.scriptPayload,
  })

  // Update with confirmed data
  if (result.confirmed) {
    const currentPost = posts.value[postIndex]
    posts.value[postIndex] = {
      ...currentPost,
      votesPositive: result.votesPositive ?? currentPost.votesPositive,
      votesNegative: result.votesNegative ?? currentPost.votesNegative,
      ranking: result.ranking ?? currentPost.ranking,
    }
  }
}

onMounted(fetchPosts)
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon :name="controversial ? 'i-lucide-scale' : 'i-lucide-trending-up'" class="w-5 h-5 text-primary" />
        <span class="font-semibold">{{ title }}</span>
      </div>
      <UButton class="text-sm text-primary" variant="link" size="xs" to="/feed">
        View All
      </UButton>
    </div>

    <!-- Window Selector -->
    <div class="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800/50">
      <UButton v-for="opt in windowOptions" :key="opt.value" size="xs"
        :variant="windowHours === opt.value ? 'soft' : 'ghost'"
        :color="windowHours === opt.value ? 'primary' : 'neutral'" @click="changeWindow(opt.value)">
        {{ opt.label }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in 5" :key="i" class="p-4">
        <div class="flex items-center gap-3">
          <USkeleton class="h-7 w-7 rounded-full" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-1/2" />
            <USkeleton class="h-3 w-1/4" />
          </div>
          <USkeleton class="h-8 w-16" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">{{ error }}</p>
      <UButton variant="link" size="xs" class="mt-2" @click="fetchPosts">
        Try again
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-else-if="posts.length === 0" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No ranked posts yet</p>
    </div>

    <!-- Post List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="(post, index) in posts" :key="`${post.platform}-${post.profileId}-${post.id}`">
        <FeedPostCard :post="post" :rank="index + 1"
          @voted="(txid, sentiment) => handlePostVoted(txid, sentiment, post.id, post.platform, post.profileId)" />
      </div>
    </div>
  </div>
</template>
