<script setup lang="ts">
/**
 * SocialProfileCard
 *
 * Card displaying a social profile with voting actions.
 */
const props = defineProps<{
  /** Profile data */
  profile: {
    id: string
    platform: string
    profileId: string
    displayName: string
    avatarUrl?: string
    rank: number
    rankChange?: number
    totalVotes: number
    positiveVotes: bigint | string
    negativeVotes: bigint | string
  }
  /** Rank position (1, 2, 3...) */
  rank?: number
  /** Compact display mode */
  compact?: boolean
}>()

const emit = defineEmits<{
  vote: [type: 'up' | 'down']
  view: []
}>()

const { formatXPI } = useAmount()

// Calculate positive percentage
const positivePercent = computed(() => {
  const positive = typeof props.profile.positiveVotes === 'string'
    ? BigInt(props.profile.positiveVotes)
    : props.profile.positiveVotes
  const negative = typeof props.profile.negativeVotes === 'string'
    ? BigInt(props.profile.negativeVotes)
    : props.profile.negativeVotes
  const total = positive + negative
  if (total === 0n) return 0
  return Number((positive * 100n) / total)
})

const percentColor = computed(() => {
  if (positivePercent.value >= 75) return 'success'
  if (positivePercent.value >= 50) return 'warning'
  return 'error'
})

const changeColor = computed(() => {
  const change = props.profile.rankChange || 0
  if (change > 0) return 'text-success'
  if (change < 0) return 'text-error'
  return 'text-muted'
})

const changeIcon = computed(() => {
  const change = props.profile.rankChange || 0
  if (change > 0) return '▲'
  if (change < 0) return '▼'
  return '–'
})

const platformIcon = computed(() => {
  const icons: Record<string, string> = {
    twitter: 'i-lucide-twitter',
    youtube: 'i-lucide-youtube',
    twitch: 'i-lucide-twitch',
    github: 'i-lucide-github',
    instagram: 'i-lucide-instagram',
  }
  return icons[props.profile.platform] || 'i-lucide-user'
})
</script>

<template>
  <div class="px-4 py-4 hover:bg-muted/50 transition-colors">
    <div class="flex items-start gap-3">
      <!-- Rank Number -->
      <div v-if="rank"
        class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
        <span class="text-sm font-bold text-primary">{{ rank }}</span>
      </div>

      <!-- Avatar -->
      <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.displayName"
          class="w-full h-full object-cover" />
        <UIcon v-else :name="platformIcon" class="w-6 h-6 text-muted" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium truncate">{{ profile.displayName }}</p>
          <UIcon :name="platformIcon" class="w-4 h-4 text-muted flex-shrink-0" />
          <span v-if="profile.rankChange !== undefined" :class="[changeColor, 'text-sm flex-shrink-0']">
            {{ changeIcon }}
            {{ Math.abs(profile.rankChange).toFixed(1) }}%
          </span>
        </div>

        <div class="flex items-center gap-3 text-sm text-muted flex-wrap">
          <span>Rank: {{ profile.rank.toFixed(1) }}</span>
          <span>{{ profile.totalVotes.toLocaleString() }} votes</span>
          <UBadge :color="percentColor" variant="subtle" size="xs">
            {{ positivePercent }}% positive
          </UBadge>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <UButton color="success" variant="ghost" size="sm" icon="i-lucide-thumbs-up" title="Upvote"
          @click.stop="emit('vote', 'up')" />
        <UButton color="error" variant="ghost" size="sm" icon="i-lucide-thumbs-down" title="Downvote"
          @click.stop="emit('vote', 'down')" />
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-chevron-right" title="View profile"
          @click.stop="emit('view')" />
      </div>
    </div>
  </div>
</template>
