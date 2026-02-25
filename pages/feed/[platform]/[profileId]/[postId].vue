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
import type { ScriptChunkPlatformUTF8, ScriptChunkSentimentUTF8 } from 'xpi-ts/lib/rank'
import type { PostData } from '~/composables/useRankApi'
import { useRankApi } from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Post',
})

const route = useRoute()
const walletStore = useWalletStore()
const { getPostRanking } = useRankApi()
const { pollAfterVote } = usePostVotePolling()

const platform = computed(() => route.params.platform as ScriptChunkPlatformUTF8)
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

// Comment count from post data
const commentCount = computed(() => {
  if (!post.value?.comments) return 0
  return post.value.comments.length
})

// Ancestor chain: ordered genesis → immediate parent
// Only present when this post is a RNKC reply (inReplyToPostId set)
const ancestors = computed(() => post.value?.ancestors ?? [])
const hasAncestors = computed(() => ancestors.value.length > 0)

// Profile-level comment detection: has inReplyToProfileId but null inReplyToPostId
const isProfileComment = computed(() => {
  return !!(post.value?.inReplyToProfileId && !post.value?.inReplyToPostId)
})

// Profile ancestor data for profile-level comments
// Use API-provided ancestorProfile data when available
const profileAncestor = computed(() => {
  if (!isProfileComment.value || !post.value) return null

  // Use API-provided ancestor profile data if available
  if (post.value.ancestorProfile) {
    return {
      platform: post.value.ancestorProfile.platform,
      id: post.value.ancestorProfile.id,
      ranking: post.value.ancestorProfile.ranking,
      satsPositive: post.value.ancestorProfile.satsPositive,
      satsNegative: post.value.ancestorProfile.satsNegative,
      votesPositive: post.value.ancestorProfile.votesPositive,
      votesNegative: post.value.ancestorProfile.votesNegative,
      voters: [],
      profileMeta: post.value.ancestorProfile.profileMeta,
    }
  }

  // Fallback to stub if API data not available (shouldn't happen with updated backend)
  return {
    platform: post.value.inReplyToPlatform!,
    id: post.value.inReplyToProfileId!,
    ranking: '0',
    satsPositive: '0',
    satsNegative: '0',
    votesPositive: 0,
    votesNegative: 0,
    voters: [],
  }
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    /* // Fetch post data first (works without wallet, just won't have postMeta)
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
    } */

    // Wait for wallet to be initialized before fetching authenticated data
    await walletStore.waitForInitialization()

    // Fetch with scriptPayload to get postMeta for R1 vote-to-reveal
    const postWithMeta = await getPostRanking(
      platform.value as ScriptChunkPlatformUTF8,
      profileId.value,
      postId.value,
      walletStore.scriptPayload,
    )
    if (postWithMeta) {
      post.value = postWithMeta
    }

    // R1: Determine hasVoted from postMeta returned by the API
    // Also check if user is the author (RNKC: posting is inherently an upvote)
    const meta = post.value?.postMeta
    const isAuthor = authorIdentity.value.isOwn
    if (!walletStore.scriptPayload) {
      // No wallet = can't vote, show blind state
      hasVoted.value = false
    } else if (meta) {
      hasVoted.value = meta.hasWalletUpvoted || meta.hasWalletDownvoted || isAuthor
    } else {
      // No meta returned = wallet hasn't voted on this post
      hasVoted.value = isAuthor
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to load post'
  } finally {
    loading.value = false
  }
}

async function handleVoted(txid: string, sentiment?: ScriptChunkSentimentUTF8) {
  // R1: Reveal sentiment after voting
  hasVoted.value = true

  // Optimistic update: increment local vote count immediately
  if (post.value && sentiment) {
    post.value = {
      ...post.value,
      votesPositive: sentiment === 'positive' ? post.value.votesPositive + 1 : post.value.votesPositive,
      votesNegative: sentiment === 'negative' ? post.value.votesNegative + 1 : post.value.votesNegative,
    }
  }

  // Poll API to verify vote was indexed and get updated counts
  // This handles blockchain propagation delays (5-30s typical)
  // Only poll for positive/negative votes (neutral votes don't need verification)
  if (sentiment && sentiment !== 'neutral') {
    const result = await pollAfterVote({
      platform: platform.value,
      profileId: profileId.value,
      postId: postId.value,
      txid,
      sentiment,
      scriptPayload: walletStore.scriptPayload,
    })

    // Update with confirmed data from API
    if (result.confirmed && post.value) {
      post.value = {
        ...post.value,
        votesPositive: result.votesPositive ?? post.value.votesPositive,
        votesNegative: result.votesNegative ?? post.value.votesNegative,
        ranking: result.ranking ?? post.value.ranking,
      }
    } else if (!result.confirmed) {
      console.warn('[PostPage] Vote not confirmed after polling, keeping optimistic update')
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
        <!-- Profile-level comment: show ProfileCard as ancestor -->
        <template v-if="isProfileComment && profileAncestor">
          <div class="pb-3">
            <FeedProfileCard :profile="profileAncestor" :profile-meta="profileAncestor.profileMeta ?? undefined"
              compact />
          </div>
          <!-- Connector stub into the focal post below -->
          <div class="flex">
            <div class="flex flex-col items-center flex-shrink-0 w-10 pb-2">
              <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
        </template>
        <!-- Post-level comment: show post ancestors -->
        <template v-else-if="hasAncestors">
          <FeedPostCard v-for="ancestor in ancestors" :key="ancestor.id" :post="ancestor" :ancestor="true"
            :show-connector="true" />
          <!-- Connector stub into the focal post below: aligns with ancestor avatar center -->
          <!-- UAvatar size="md" = size-8 = 32px = w-8 -->
          <div class="flex">
            <div class="flex flex-col items-center flex-shrink-0 w-10 pb-2 -mt-4">
              <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
        </template>

        <!-- Post Detail: Use FeedPostCard with detail mode -->
        <FeedPostCard v-if="post" :votes="post.ranks" :post="post" :platform="platform" :profile-id="profileId"
          :detail="true" @voted="handleVoted" />
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
            :has-voted="hasVoted" :comments="post?.comments" @commented="fetchData" />
        </UCard>
      </div>
    </template>
  </div>
</template>
