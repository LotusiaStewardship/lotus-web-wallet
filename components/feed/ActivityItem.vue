<script setup lang="ts">
/**
 * Activity Item Component
 *
 * Displays a post in the activity stream with full RANK strategy compliance:
 *   - R1 (Vote-to-Reveal): Blind state until user votes, then reveal full sentiment
 *   - R2 (Controversial badge): Shows when controversy score > 0.3
 *   - R4 (Cost symmetry): Equal visual weight for up/down vote buttons
 *   - R38 (Curation language): "Endorsed/Flagged/Noted" instead of up/down
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1, R2, R4
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { PostData } from '~/composables/useRankApi'
import { PlatformURL } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { bucketVoteCount, isControversial } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'
import { useTime } from '~/composables/useTime'

const props = defineProps<{
  post: PostData
}>()

const walletStore = useWalletStore()
const { timeAgo } = useTime()
const walletReady = computed(() => walletStore.isReadyForSigning())

const hasAncestors = computed(() => {
  return props.post.ancestors && props.post.ancestors.length > 0
})

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[props.post.platform]
  if (!urlHelper) return null
  return urlHelper.post(props.post.profileId, props.post.id)
})

/** R1: Determine if the current user has voted on this post */
const hasUserVoted = computed(() => {
  return !!(props.post.postMeta?.hasWalletUpvoted || props.post.postMeta?.hasWalletDownvoted)
})

/** R1: Revealed state shows full sentiment, blind shows only bucketed count */
const isRevealed = computed(() => hasUserVoted.value)

/** R2: Check if post is controversial */
const isControversialFlag = computed(() =>
  isControversial(
    props.post.satsPositive || '0',
    props.post.satsNegative || '0',
    totalVotes.value,
    5, // min votes threshold per R2
  ),
)

/** R1: Bucketed vote count for blind state */
const bucketedVotesDisplay = computed(() => bucketVoteCount(totalVotes.value))

/** Formatted timestamp for display */
const formattedTime = computed(() => {
  const ts = props.post.lastVoted || props.post.timestamp || props.post.firstSeen
  if (!ts) return ''
  return timeAgo(Number(ts))
})

const isTwitterPost = computed(
  () => props.post.platform === 'twitter',
)

const feedUrl = computed(() => {
  return `/feed/${props.post.platform}/${props.post.profileId}/${props.post.id}`
})

const rankingDisplay = computed(() => {
  const val = BigInt(props.post.ranking || '0')
  return formatXPICompact(val.toString())
})

const isPositive = computed(() => BigInt(props.post.ranking || '0') > 0n)
const isNegative = computed(() => BigInt(props.post.ranking || '0') < 0n)

const totalVotes = computed(() => props.post.votesPositive + props.post.votesNegative)

</script>

<template>
  <div class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Ancestor chain: Twitter-style conversation context above the focal post -->
    <template v-if="hasAncestors">
      <FeedAncestorItem font-size="md" v-for="ancestor in props.post.ancestors" :key="ancestor.id" :post="ancestor"
        :show-connector="true" />
      <!-- Connector stub into the focal post below: aligns with ancestor avatar center -->
      <!-- FeedAncestorItem uses size="md" = size-8 = 32px = w-8 -->
      <div class="flex">
        <div class="flex flex-col items-center flex-shrink-0 w-8 pb-2 -mt-4">
          <div class="w-0.5 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
    </template>
    <NuxtLink :to="feedUrl">
      <FeedAuthorDisplay :platform="post.platform" :profile-id="post.profileId" size="xl" :to="feedUrl"
        :time="formattedTime">
        <template #inline>
          <!-- R1: Sentiment badge — revealed state only -->
          <template v-if="isRevealed">
            <UBadge :color="isPositive ? 'success' : isNegative ? 'error' : 'neutral'" size="xs" variant="subtle">
              {{ isPositive ? 'Endorsed' : isNegative ? 'Flagged' : 'Noted' }}
            </UBadge>
            <!-- R2: Controversial flag -->
            <UBadge v-if="isControversialFlag" color="warning" size="xs" variant="subtle">Controversial</UBadge>
          </template>
          <!-- External link for non-Lotusia posts -->
          <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
            class="ml-auto text-gray-400 hover:text-primary transition-colors" @click.stop>
            <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
          </a>
        </template>

        <!-- Post Content (default slot of FeedAuthorDisplay) -->
        <div class="mt-1 mb-3">
          <!-- Lotusia post content has data property -->
          <p v-if="post.data"
            class="text-[15px] leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {{ post.data }}
          </p>
          <!-- Embedded tweet content (Twitter posts only) -->
          <FeedXPostEmbed v-else-if="isTwitterPost" :tweet-id="post.id" :profile-id="post.profileId" />
        </div>
      </FeedAuthorDisplay>
    </NuxtLink>

    <!-- ButtonRow: outside NuxtLink, indented to align with content column -->
    <div class="pl-[52px]">
      <FeedButtonRow :platform="post.platform" :profile-id="post.profileId" :post-id="post.id"
        :post-meta="post.postMeta" :is-revealed="isRevealed" :votes-positive="post.votesPositive"
        :votes-negative="post.votesNegative" :bucketed-votes="bucketedVotesDisplay" :ranking-display="rankingDisplay"
        :compact="true" :disabled="!walletReady" />
    </div>
  </div>
</template>