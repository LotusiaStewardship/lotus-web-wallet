<script setup lang="ts">
/**
 * Post Detail Page
 *
 * Shows full ranking data for a specific post including:
 * - Ranking score and sentiment breakdown
 * - Vote button for authenticated users
 * - Link to parent profile
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { PostData } from '~/composables/useRankApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'
import { isControversial as checkControversial, bucketVoteCount } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Post',
})

const route = useRoute()
const walletStore = useWalletStore()
const { getPostRanking } = useRankApi()
const { getAvatar } = useAvatars()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)
const postId = computed(() => route.params.postId as string)

const post = ref<PostData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const avatarUrl = ref<string | null>(null)
const avatarError = ref(false)

// R1 Vote-to-Reveal: derived from postMeta returned by the backend
// When wallet is initialized, we pass scriptPayload to the API and check postMeta
const hasVoted = ref(false)

const bucketedVotes = computed(() => bucketVoteCount(totalVotes.value))

const platformIcon = computed(() => PlatformIcon[platform.value] || 'i-lucide-globe')

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[platform.value]
  if (!urlHelper) return null
  return urlHelper.post(profileId.value, postId.value)
})

const rankingDisplay = computed(() => {
  if (!post.value) return '0'
  return formatXPI(post.value.ranking, { minDecimals: 0, maxDecimals: 2 })
})

const isPositive = computed(() => post.value && BigInt(post.value.ranking) > 0n)
const isNegative = computed(() => post.value && BigInt(post.value.ranking) < 0n)

const totalVotes = computed(() => {
  if (!post.value) return 0
  return post.value.votesPositive + post.value.votesNegative
})

const sentimentRatio = computed(() => {
  if (!post.value || totalVotes.value === 0) return 50
  return Math.round((post.value.votesPositive / totalVotes.value) * 100)
})

const isControversial = computed(() => {
  if (!post.value) return false
  return checkControversial(post.value.satsPositive, post.value.satsNegative, totalVotes.value)
})

const satsPositiveDisplay = computed(() => {
  if (!post.value) return '0'
  return formatXPI(post.value.satsPositive, { minDecimals: 0, maxDecimals: 2 })
})

const satsNegativeDisplay = computed(() => {
  if (!post.value) return '0'
  return formatXPI(post.value.satsNegative, { minDecimals: 0, maxDecimals: 2 })
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // Pass scriptPayload to get postMeta (R1 Vote-to-Reveal)
    const voterScript = walletStore.initialized ? walletStore.scriptPayload : undefined
    const [postData, avatar] = await Promise.all([
      getPostRanking(
        platform.value as ScriptChunkPlatformUTF8,
        profileId.value,
        postId.value,
        voterScript || undefined,
      ),
      getAvatar(platform.value, profileId.value),
    ])
    post.value = postData
    avatarUrl.value = avatar.src
    if (!post.value) {
      error.value = 'Post not found'
    } else {
      // R1: Determine hasVoted from postMeta returned by the API
      const meta = post.value.postMeta
      if (!walletStore.initialized) {
        // No wallet = can't vote, show blind state
        hasVoted.value = false
      } else if (meta) {
        hasVoted.value = meta.hasWalletUpvoted || meta.hasWalletDownvoted
      } else {
        // No meta returned = wallet hasn't voted on this post
        hasVoted.value = false
      }
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to load post'
  } finally {
    loading.value = false
  }
}

function handleVoted(txid: string, sentiment?: 'positive' | 'negative') {
  // R1: Reveal sentiment after voting
  hasVoted.value = true
  // Optimistic update: increment local vote count immediately (no fetchData refresh)
  if (post.value && sentiment) {
    if (sentiment === 'positive') {
      post.value = { ...post.value, votesPositive: post.value.votesPositive + 1 }
    } else {
      post.value = { ...post.value, votesNegative: post.value.votesNegative + 1 }
    }
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <!-- Back Button -->
    <NuxtLink :to="`/feed/${platform}/${profileId}`"
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to {{ profileId }}
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading"
      class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 animate-pulse">
      <div class="space-y-4">
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <p class="text-gray-500">{{ error }}</p>
      <button class="mt-3 text-primary hover:underline text-sm" @click="fetchData">Try again</button>
    </div>

    <!-- Post Detail -->
    <template v-else-if="post">
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <!-- Post Header -->
        <div class="flex items-center gap-3 mb-3">
          <div class="relative flex-shrink-0">
            <img v-if="avatarUrl && !avatarError" :src="avatarUrl" :alt="profileId"
              class="w-10 h-10 rounded-full object-cover" @error="avatarError = true" />
            <div v-else class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span class="text-sm font-bold text-gray-500">{{ profileId.substring(0, 2).toUpperCase() }}</span>
            </div>
            <div
              class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
              <UIcon :name="platformIcon" class="w-2.5 h-2.5 text-gray-500" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <NuxtLink :to="`/feed/${platform}/${profileId}`" class="font-semibold hover:text-primary transition-colors">
              {{ profileId }}
            </NuxtLink>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-sm text-gray-500 capitalize">{{ platform }}</span>
              <span class="text-gray-300 dark:text-gray-600">·</span>
              <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
                class="text-sm text-primary hover:underline flex items-center gap-1">
                View on {{ platform }}
                <UIcon name="i-lucide-external-link" class="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <!-- Post ID + Badges -->
        <div class="flex items-center gap-2 mb-4 pl-[52px]">
          <span class="text-xs text-gray-400 font-mono truncate">Post {{ postId }}</span>
          <UBadge v-if="isControversial" color="warning" size="xs" variant="subtle">
            Controversial
          </UBadge>
        </div>

        <!-- Embedded X Post (Twitter only) -->
        <div v-if="platform === 'twitter'" class="mb-4">
          <FeedXPostEmbed :tweet-id="postId" :profile-id="profileId" />
        </div>

        <!-- R1 Vote-to-Reveal: Pre-vote blind state -->
        <Transition name="fade" mode="out-in">
          <div v-if="!hasVoted" key="blind" class="text-center py-4 mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div class="text-lg font-medium text-gray-600 dark:text-gray-400">{{ bucketedVotes }}</div>
            <p class="text-sm text-gray-400 mt-1">Vote to reveal community sentiment</p>
          </div>

          <!-- R1 Vote-to-Reveal: Post-vote revealed state (animated) -->
          <div v-else key="revealed">
            <!-- Ranking Score (Hero) -->
            <div class="text-center py-3 mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div class="text-3xl font-mono font-bold"
                :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
                {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
              </div>
              <div class="text-sm text-gray-500">XPI sentiment</div>
            </div>

            <!-- Sentiment Breakdown -->
            <div class="grid grid-cols-3 gap-2 mb-3">
              <div class="text-center p-2.5 rounded-lg bg-success-50 dark:bg-success-900/10">
                <div class="text-base font-bold text-success-600 dark:text-success-400">{{ post.votesPositive }}</div>
                <div class="text-[11px] text-success-500">Upvotes</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ satsPositiveDisplay }} XPI</div>
              </div>
              <div class="text-center p-2.5 rounded-lg bg-error-50 dark:bg-error-900/10">
                <div class="text-base font-bold text-error-600 dark:text-error-400">{{ post.votesNegative }}</div>
                <div class="text-[11px] text-error-500">Downvotes</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ satsNegativeDisplay }} XPI</div>
              </div>
              <div class="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div class="text-base font-bold">{{ totalVotes }}</div>
                <div class="text-[11px] text-gray-500">Total Votes</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ sentimentRatio }}% positive</div>
              </div>
            </div>

            <!-- Sentiment Bar -->
            <div class="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full bg-success-500 rounded-full transition-all" :style="{ width: `${sentimentRatio}%` }" />
            </div>
          </div>
        </Transition>

        <!-- Vote Button -->
        <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <FeedVoteButton :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId" :post-id="postId"
            :disabled="!walletStore.initialized" @voted="handleVoted" />
          <p v-if="!walletStore.initialized" class="text-xs text-gray-400 mt-2">
            Create or import a wallet to vote
          </p>
        </div>
      </div>

      <!-- Comment Thread -->
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <FeedCommentThread :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId" :post-id="postId"
          :has-voted="hasVoted" @commented="fetchData" />
      </div>
    </template>
  </div>
</template>
