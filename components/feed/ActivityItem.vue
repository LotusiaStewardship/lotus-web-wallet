<script setup lang="ts">
/**
 * Activity Item Component
 *
 * Displays a single RANK vote in the activity stream.
 * Shows: voter (truncated scriptPayload), sentiment, target profile/post,
 * burn amount, and relative time.
 *
 * R1-safe: Does NOT reveal aggregate sentiment — only shows individual vote data.
 * This is critical: the activity stream must never leak aggregate direction.
 */
import type { RankTransaction } from '~/composables/useRankApi'
import { PlatformIcon } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'

const props = defineProps<{
  vote: RankTransaction
}>()

const isUpvote = computed(() => props.vote.sentiment === 'positive')

const truncatedVoter = computed(() => {
  const sp = props.vote.scriptPayload
  if (!sp || sp.length < 12) return sp || 'Anonymous'
  return sp.slice(0, 6) + '\u2026' + sp.slice(-4)
})

const burnDisplay = computed(() =>
  formatXPI(props.vote.sats, { minDecimals: 0, maxDecimals: 2 }),
)

const platformIcon = computed(
  () => PlatformIcon[props.vote.platform] || 'i-lucide-globe',
)

const targetLabel = computed(() => {
  if (props.vote.postId) {
    return `${props.vote.profileId}/${props.vote.postId}`
  }
  return props.vote.profileId
})

const feedUrl = computed(() => {
  if (props.vote.postId) {
    return `/feed/${props.vote.platform}/${props.vote.profileId}/${props.vote.postId}`
  }
  return `/feed/${props.vote.platform}/${props.vote.profileId}`
})

const timeAgo = computed(() => {
  const ts = props.vote.timestamp || props.vote.firstSeen
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
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
  <NuxtLink :to="feedUrl"
    class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Sentiment Icon -->
    <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
      :class="isUpvote
        ? 'bg-success-50 dark:bg-success-900/20'
        : 'bg-error-50 dark:bg-error-900/20'">
      <UIcon :name="isUpvote ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'" class="w-4 h-4"
        :class="isUpvote ? 'text-success-500' : 'text-error-500'" />
    </div>

    <!-- Target Avatar -->
    <div class="relative flex-shrink-0">
      <img v-if="avatarUrl && !avatarError" :src="avatarUrl" :alt="vote.profileId"
        class="w-9 h-9 rounded-full object-cover" @error="avatarError = true" />
      <div v-else class="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <span class="text-xs font-bold text-gray-500">{{ vote.profileId.substring(0, 2).toUpperCase() }}</span>
      </div>
      <div
        class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
        <UIcon :name="platformIcon" class="w-2.5 h-2.5 text-gray-500" />
      </div>
    </div>

    <!-- Activity Description -->
    <div class="flex-1 min-w-0">
      <p class="text-sm">
        <span class="font-mono text-xs text-gray-400">{{ truncatedVoter }}</span>
        <span class="text-gray-500"> {{ isUpvote ? 'upvoted' : 'downvoted' }} </span>
        <span class="font-semibold truncate">{{ targetLabel }}</span>
      </p>
      <div class="flex items-center gap-2 mt-0.5">
        <span class="text-xs font-medium" :class="isUpvote ? 'text-success-500' : 'text-error-500'">
          {{ burnDisplay }} XPI burned
        </span>
        <span class="text-xs text-gray-400">{{ timeAgo }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
