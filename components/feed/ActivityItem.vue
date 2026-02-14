<script setup lang="ts">
/**
 * Activity Item Component
 *
 * Displays a single RANK vote in the activity stream.
 * Target-focused layout: the profile/post being curated is the subject,
 * with sentiment shown as a subtle badge.
 *
 * Design language matches the post/profile detail pages:
 *   - Same avatar + platform overlay pattern
 *   - Profile name as plain text, platform capitalized
 *   - Post ID in mono font
 *   - Sentiment as a compact badge (not colored verb text)
 *
 * R1-safe: Does NOT reveal aggregate sentiment — only shows individual vote data.
 * Individual vote sentiment is an acceptable information channel per R1 spec
 * (echo-chamber-mitigation.md:147).
 *
 * R38-compliant: Uses curation language per psychopolitics-and-digital-power.md:254-270.
 *
 * Vote buttons and metrics are in a bottom action row (standard social media layout).
 * R4: Equal visual weight for up/down buttons.
 * Burn amount shown is the individual voter's burn — R1-safe (not aggregate).
 *
 * Optimistic update: After voting, the button highlights immediately without
 * refreshing the feed (preserves scroll position). Mirrors rank-extension-ts pattern.
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { RankTransaction } from '~/composables/useRankApi'
import { PlatformIcon } from '~/composables/useRankApi'
import { formatXPICompact } from '~/utils/formatting'
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  vote: RankTransaction
}>()

const sentimentType = computed(() => {
  if (props.vote.sentiment === 'positive') return 'positive'
  if (props.vote.sentiment === 'negative') return 'negative'
  return 'neutral'
})

/** Sentiment badge color — matches UBadge color prop */
const sentimentBadgeColor = computed(() => {
  if (sentimentType.value === 'positive') return 'success'
  if (sentimentType.value === 'negative') return 'error'
  return 'neutral'
})

/** Sentiment badge label — R38 curation-aligned language */
const sentimentLabel = computed(() => {
  if (sentimentType.value === 'positive') return 'Endorsed'
  if (sentimentType.value === 'negative') return 'Flagged'
  return 'Noted'
})

const walletStore = useWalletStore()
const { openVoteSlideover } = useOverlays()
const walletReady = computed(() => walletStore.isReadyForSigning())

/** R1-safe: Individual burn amount (this voter's burn, not aggregate) */
const burnDisplay = computed(() => {
  if (!props.vote.sats || props.vote.sats === '0') return null
  return formatXPICompact(props.vote.sats)
})

/** Optimistic local state: tracks the user's vote on this item without feed refresh */
const votedSentiment = ref<'positive' | 'negative' | null>(null)
const voting = ref(false)

async function handleVoteClick(sentiment: 'positive' | 'negative', event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!walletReady.value || voting.value) return

  voting.value = true
  try {
    const result = await openVoteSlideover({
      sentiment,
      platform: props.vote.platform as string,
      profileId: props.vote.profileId,
      postId: props.vote.postId || undefined,
    })

    if (result?.txid) {
      // Optimistic update: highlight the button immediately, no feed refresh
      votedSentiment.value = sentiment
    }
  } finally {
    voting.value = false
  }
}

const platformIcon = computed(
  () => PlatformIcon[props.vote.platform] || 'i-lucide-globe',
)

const isTwitterPost = computed(
  () => props.vote.platform === 'twitter' && !!props.vote.postId,
)

const feedUrl = computed(() => {
  if (props.vote.postId) {
    return `/feed/${props.vote.platform}/${props.vote.profileId}/${props.vote.postId}`
  }
  return `/feed/${props.vote.platform}/${props.vote.profileId}`
})

const timeAgo = computed(() => {
  const ts = props.vote.timestamp || props.vote.firstSeen
  if (!ts) return ''
  const parsed = typeof ts === 'number' ? ts : Number(ts)
  // Handle both Unix seconds and milliseconds
  const ms = parsed > 1e12 ? parsed : parsed * 1000
  if (isNaN(ms)) return ''
  const diff = Date.now() - ms
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
})

const { getAvatar } = useAvatars()
const avatarUrl = ref<string | null>(null)
const avatarError = ref(false)

onMounted(async () => {
  const avatar = await getAvatar(props.vote.platform, props.vote.profileId)
  avatarUrl.value = avatar.src
})
</script>

<template>
  <NuxtLink :to="feedUrl" class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Top row: Avatar + Content -->
    <div class="flex items-center gap-3">
      <!-- Target Avatar (matches [postId].vue:162-172) -->
      <div class="relative flex-shrink-0">
        <img v-if="avatarUrl && !avatarError" :src="avatarUrl" :alt="vote.profileId"
          class="w-10 h-10 rounded-full object-cover" @error="avatarError = true" />
        <div v-else class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span class="text-sm font-bold text-gray-500">{{ vote.profileId.substring(0, 2).toUpperCase() }}</span>
        </div>
        <div
          class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
          <UIcon :name="platformIcon" class="w-2.5 h-2.5 text-gray-500" />
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-md truncate">{{ vote.profileId }}</span>
          <UBadge :color="sentimentBadgeColor" size="sm" variant="subtle">{{ sentimentLabel }}</UBadge>
        </div>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="text-xs text-gray-500 capitalize">{{ vote.platform }}</span>
          <template v-if="timeAgo">
            <span class="text-xs text-gray-300 dark:text-gray-600">&middot;</span>
            <span class="text-xs text-gray-400">{{ timeAgo }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Embedded tweet content (Twitter posts only, matches [postId].vue:198-200) -->
    <div v-if="isTwitterPost" class="mt-2 pl-[52px]">
      <FeedXPostEmbed :tweet-id="vote.postId" :profile-id="vote.profileId" />
    </div>

    <!-- Bottom action row: vote buttons + burn metric (standard social media layout) -->
    <div class="flex items-center gap-4 mt-2 pl-[52px]">
      <!-- R4: Upvote button (equal visual weight) -->
      <button v-if="walletReady" class="flex items-center gap-1 p-1 rounded-md text-xs transition-colors" :class="votedSentiment === 'positive'
        ? 'text-success-500'
        : 'text-gray-400 hover:text-success-500 hover:bg-success-500/10'" :disabled="voting"
        title="Endorse this content" @click="handleVoteClick('positive', $event)">
        <UIcon name="i-lucide-thumbs-up" class="w-3.5 h-3.5" />
        <span v-if="votedSentiment === 'positive'" class="text-[11px]">Voted</span>
      </button>

      <!-- R4: Downvote button (equal visual weight) -->
      <button v-if="walletReady" class="flex items-center gap-1 p-1 rounded-md text-xs transition-colors" :class="votedSentiment === 'negative'
        ? 'text-error-500'
        : 'text-gray-400 hover:text-error-500 hover:bg-error-500/10'" :disabled="voting" title="Flag this content"
        @click="handleVoteClick('negative', $event)">
        <UIcon name="i-lucide-thumbs-down" class="w-3.5 h-3.5" />
        <span v-if="votedSentiment === 'negative'" class="text-[11px]">Voted</span>
      </button>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- R1-safe: Individual burn amount (this voter's burn, not aggregate) -->
      <span v-if="burnDisplay" class="text-[11px] text-gray-400">
        {{ burnDisplay }} XPI
      </span>
    </div>
  </NuxtLink>
</template>
