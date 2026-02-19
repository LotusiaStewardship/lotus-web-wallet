<script setup lang="ts">
/**
 * Post Detail Page
 *
 * Shows full ranking data for a specific post including:
 * - Post content (Lotusia text or embedded X post)
 * - Controversy details (R2) with explanation when applicable
 * - Ranking score and sentiment breakdown (R1 gated)
 * - Vote button for authenticated users
 * - 1st-class RNKC comment section
 *
 * Strategy compliance:
 *   R1: Vote-to-Reveal — sentiment data hidden until user votes
 *   R2: Controversial flag — promoted to body section with explanation
 *   R3: Autonomy-supportive framing — burn shown as informational
 *   R4: Cost symmetry — equal visual weight for up/down
 *   R6: Burn-weighted comment sorting (via CommentThread)
 *   R38: Curation language — "Endorsed/Flagged" not "upvoted/downvoted"
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { PostData } from '~/composables/useRankApi'
import { PlatformURL } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { isControversial as checkControversial, controversyScore, bucketVoteCount } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import { useTime } from '~/composables/useTime'

definePageMeta({
  title: 'Post',
})

const route = useRoute()
const walletStore = useWalletStore()
const { getPostRanking } = useRankApi()
const { timeAgo } = useTime()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)
const postId = computed(() => route.params.postId as string)

const post = ref<PostData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const { useResolve } = useFeedIdentity()
const authorIdentity = useResolve(platform, profileId)

// R1 Vote-to-Reveal: derived from postMeta returned by the backend
// When wallet is initialized, we pass scriptPayload to the API and check postMeta
const hasVoted = ref(false)

const bucketedVotes = computed(() => bucketVoteCount(totalVotes.value))

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[platform.value]
  if (!urlHelper) return null
  return urlHelper.post(profileId.value, postId.value)
})

const rankingDisplay = computed(() => {
  if (!post.value) return '0'
  return formatXPICompact(post.value.ranking)
})

/** Formatted timestamp for display */
const formattedTime = computed(() => {
  if (!post.value) return ''
  const ts = post.value?.lastVoted || post.value?.timestamp || post.value?.firstSeen
  if (!ts) return ''
  return timeAgo(Number(ts))
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

// R2: Controversy score for detailed display (0-1 scale)
const controvScore = computed(() => {
  if (!post.value) return 0
  return controversyScore(post.value.satsPositive, post.value.satsNegative)
})


// R38: Aggregate sentiment label
const sentimentLabel = computed(() => {
  if (isPositive.value) return 'Endorsed'
  if (isNegative.value) return 'Flagged'
  return 'Noted'
})

const sentimentColor = computed(() => {
  if (isPositive.value) return 'success'
  if (isNegative.value) return 'error'
  return 'neutral'
})

// Comment count from post data
const commentCount = computed(() => {
  if (!post.value?.comments) return 0
  return post.value.comments.length
})

// Ancestor chain: ordered genesis → immediate parent
// Only present when this post is a RNKC reply (inReplyToPostId set)
const ancestors = computed(() => post.value?.ancestors ?? [])
const hasAncestors = computed(() => ancestors.value.length > 0)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // Fetch post data first (works without wallet, just won't have postMeta)
    const postData = await getPostRanking(
      platform.value as ScriptChunkPlatformUTF8,
      profileId.value,
      postId.value,
      undefined, // Don't pass scriptPayload yet - fetch public data first
    )
    post.value = postData

    if (!post.value) {
      error.value = 'Post not found'
      loading.value = false
      return
    }

    // Wait for wallet to be initialized before fetching authenticated data
    await walletStore.waitForInitialization()

    // Now re-fetch with scriptPayload to get postMeta for R1 vote-to-reveal
    const voterScript = walletStore.scriptPayload
    if (voterScript) {
      const postWithMeta = await getPostRanking(
        platform.value as ScriptChunkPlatformUTF8,
        profileId.value,
        postId.value,
        voterScript,
      )
      if (postWithMeta) {
        post.value = postWithMeta
      }
    }

    // R1: Determine hasVoted from postMeta returned by the API
    const meta = post.value?.postMeta
    if (!walletStore.scriptPayload) {
      // No wallet = can't vote, show blind state
      hasVoted.value = false
    } else if (meta) {
      hasVoted.value = meta.hasWalletUpvoted || meta.hasWalletDownvoted
    } else {
      // No meta returned = wallet hasn't voted on this post
      hasVoted.value = false
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
    <UButton variant="link" color="neutral" size="sm" icon="i-lucide-arrow-left" :to="`/feed/${platform}/${profileId}`">
      Back to {{ authorIdentity.displayName }}
    </UButton>

    <!-- Loading -->
    <UCard v-if="loading">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <USkeleton class="h-12 w-12 rounded-full" />
          <div class="space-y-2 flex-1">
            <USkeleton class="h-5 w-1/3" />
            <USkeleton class="h-3 w-1/4" />
          </div>
        </div>
        <USkeleton class="h-24 w-full" />
        <USkeleton class="h-16 w-full" />
      </div>
    </UCard>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <p class="text-gray-500">{{ error }}</p>
      <UButton variant="link" size="sm" class="mt-3" @click="fetchData">Try again</UButton>
    </div>

    <!-- Post Detail -->
    <template v-else-if="post">

      <UCard class="relative">
        <!-- Ancestor chain: Twitter-style conversation context above the focal post -->
        <template v-if="hasAncestors">
          <FeedAncestorItem v-for="ancestor in ancestors" :key="ancestor.id" :post="ancestor" :show-connector="true" />
          <!-- Connector stub into the focal post below: aligns with ancestor avatar center -->
          <!-- UAvatar size="md" = size-8 = 32px = w-8 -->
          <div class="flex">
            <div class="flex flex-col items-center flex-shrink-0 w-8 pb-1">
              <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
        </template>

        <!-- Post Header: External link button -->
        <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
          class="text-sm text-primary hover:underline absolute top-4 right-4">
          <UIcon name="i-lucide-external-link" class="w-5 h-5" />
        </a>

        <!-- Post Header: Author info -->
        <!-- size="md" matches AncestorItem so the thread connector aligns -->
        <div class="mb-2">
          <FeedAuthorDisplay :platform="platform" :profile-id="profileId" size="md"
            :to="`/feed/${platform}/${profileId}`" :time="formattedTime" />
        </div>

        <!-- Post Content -->
        <div class="mb-3">
          <p v-if="platform === 'lotusia'"
            class="text-md leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line">{{
              post.data }}</p>
          <!-- Embedded X Post (Twitter only) -->
          <FeedXPostEmbed v-else-if="platform === 'twitter'" :tweet-id="postId" :profile-id="profileId" />
        </div>

        <!-- Post ID (subtle metadata) -->
        <!-- <div class="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <span class="font-mono truncate">Post {{ postId }}</span>
        </div> -->

        <!-- R2: Controversial Callout (visible regardless of vote status — binary flag, not directional) -->
        <div v-if="isControversial"
          class="mb-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30">
          <div class="flex items-start gap-2.5">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-warning-700 dark:text-warning-400">Controversial Post</div>
              <p class="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
                This post has significant engagement from both supporters and critics.
                <!-- R1: Only show the detailed ratio post-vote to avoid leaking directional sentiment -->
                <template v-if="hasVoted">
                  The minority position represents {{ Math.round(controvScore * 100) }}% of the majority burn weight,
                  indicating genuine disagreement rather than one-sided consensus.
                </template>
                <template v-else>
                  Vote to see the full sentiment breakdown.
                </template>
              </p>
            </div>
          </div>
        </div>

        <!-- R1 Vote-to-Reveal: Pre-vote blind state -->
        <Transition name="fade" mode="out-in">
          <div v-if="!hasVoted" key="blind"
            class="flex items-center justify-center gap-2 py-3 mb-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <UIcon name="i-lucide-eye-off" class="w-5 h-5 text-gray-400" />
            <span class="text-sm font-medium text-gray-500">{{ bucketedVotes }}</span>
            <span class="text-xs text-gray-400">&middot; Vote to reveal community sentiment</span>
          </div>

          <!-- R1 Vote-to-Reveal: Post-vote revealed state -->
          <div v-else key="revealed" class="space-y-2 mb-3">
            <!-- Compact ranking + breakdown row -->
            <div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <!-- Ranking Score -->
              <div class="text-xl font-mono font-bold"
                :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
                {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
              </div>
              <span class="text-xs text-gray-400">XPI</span>

              <div class="w-px h-6 bg-gray-200 dark:bg-gray-700" />

              <!-- Inline breakdown -->
              <div class="flex items-center gap-3 text-xs">
                <span class="text-success-600 dark:text-success-400 font-semibold">{{ post.votesPositive }}
                  Endorsed</span>
                <span class="text-error-600 dark:text-error-400 font-semibold">{{ post.votesNegative }} Flagged</span>
                <span class="text-gray-500">{{ totalVotes }} votes</span>
              </div>
            </div>

            <!-- Sentiment Bar -->
            <div class="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                :class="sentimentRatio >= 50 ? 'bg-success-500' : 'bg-error-500'"
                :style="{ width: `${sentimentRatio}%` }" />
            </div>
          </div>
        </Transition>

        <!-- Vote Button -->
        <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <FeedVoteButton :post-meta="post?.postMeta" :platform="(platform as ScriptChunkPlatformUTF8)"
            :profile-id="profileId" :post-id="postId" :disabled="!walletStore.initialized" @voted="handleVoted" />
          <!-- R1: Post-vote sentiment badge (R38 curation language) -->
          <!-- <UBadge v-if="hasVoted" :color="sentimentColor" size="md" variant="subtle">
            You {{ sentimentLabel }}
          </UBadge> -->
          <p v-if="!walletStore.initialized" class="text-xs text-gray-400 mt-2">
            Create or import a wallet to vote
          </p>
        </div>
      </UCard>

      <!-- 1st-Class Comments Section -->
      <div>
        <div class="flex items-center gap-2 mb-2 px-1">
          <UIcon name="i-lucide-message-circle" class="w-5 h-5 text-gray-500" />
          <h2 class="font-semibold text-gray-700 dark:text-gray-300">Discussion</h2>
          <UBadge v-if="commentCount > 0" color="neutral" size="xs">{{ commentCount }}</UBadge>
        </div>
        <UCard>
          <FeedCommentThread :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId" :post-id="postId"
            :has-voted="hasVoted" @commented="fetchData" />
        </UCard>
      </div>
    </template>
  </div>
</template>
