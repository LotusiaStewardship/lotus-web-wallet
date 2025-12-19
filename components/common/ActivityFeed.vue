<script setup lang="ts">
/**
 * ActivityFeed
 *
 * Phase 5: Unified activity feed component.
 * Consolidates common/ActivityFeed and p2p/ActivityFeed.
 * Supports both store-based and prop-based event sources.
 */
import { useActivityStore, type ActivityItem } from '~/stores/activity'
import type { P2PActivityEvent } from '~/stores/p2p'

/**
 * P2P event types for comprehensive activity tracking
 */
type P2PEventType =
  | 'peer_joined'
  | 'peer_left'
  | 'peer_connected'
  | 'peer_disconnected'
  | 'signer_discovered'
  | 'signing_request_received'
  | 'signing_request_sent'
  | 'session_started'
  | 'session_completed'
  | 'session_failed'
  | 'info'
  | 'error'

interface Props {
  /** Maximum number of items to display */
  limit?: number
  /** Filter by activity type */
  filter?: 'all' | 'transaction' | 'p2p' | 'musig2'
  /** Show filter chips */
  showFilters?: boolean
  /** Compact mode */
  compact?: boolean
  /** Direct events (bypasses store) - for P2P activity feed */
  events?: P2PActivityEvent[]
  /** Use P2P event styling (for direct events) */
  p2pStyle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  limit: 10,
  filter: 'all',
  showFilters: false,
  compact: false,
  p2pStyle: false,
})

const activityStore = useActivityStore()
const { timeAgo } = useTime()

const selectedFilter = ref(props.filter)

// P2P event configuration
const p2pEventConfig: Record<P2PEventType, { icon: string; color: 'success' | 'error' | 'warning' | 'primary' | 'neutral'; bgClass: string }> = {
  peer_joined: { icon: 'i-lucide-user-plus', color: 'success', bgClass: 'bg-success-100 dark:bg-success-900/30' },
  peer_left: { icon: 'i-lucide-user-minus', color: 'neutral', bgClass: 'bg-neutral-100 dark:bg-neutral-900/30' },
  peer_connected: { icon: 'i-lucide-link', color: 'success', bgClass: 'bg-success-100 dark:bg-success-900/30' },
  peer_disconnected: { icon: 'i-lucide-link-2-off', color: 'neutral', bgClass: 'bg-neutral-100 dark:bg-neutral-900/30' },
  signer_discovered: { icon: 'i-lucide-user-check', color: 'primary', bgClass: 'bg-primary-100 dark:bg-primary-900/30' },
  signing_request_received: { icon: 'i-lucide-inbox', color: 'warning', bgClass: 'bg-warning-100 dark:bg-warning-900/30' },
  signing_request_sent: { icon: 'i-lucide-send', color: 'primary', bgClass: 'bg-primary-100 dark:bg-primary-900/30' },
  session_started: { icon: 'i-lucide-play', color: 'success', bgClass: 'bg-success-100 dark:bg-success-900/30' },
  session_completed: { icon: 'i-lucide-check-circle', color: 'success', bgClass: 'bg-success-100 dark:bg-success-900/30' },
  session_failed: { icon: 'i-lucide-x-circle', color: 'error', bgClass: 'bg-error-100 dark:bg-error-900/30' },
  info: { icon: 'i-lucide-info', color: 'primary', bgClass: 'bg-primary-100 dark:bg-primary-900/30' },
  error: { icon: 'i-lucide-alert-circle', color: 'error', bgClass: 'bg-error-100 dark:bg-error-900/30' },
}

function getP2PEventConfig(type: string) {
  return p2pEventConfig[type as P2PEventType] || { icon: 'i-lucide-activity', color: 'neutral' as const, bgClass: 'bg-neutral-100 dark:bg-neutral-900/30' }
}

// Use direct events if provided, otherwise use store
const useDirectEvents = computed(() => !!props.events)

// Store-based activity items
const storeActivity = computed(() => {
  if (useDirectEvents.value) return []
  const items = activityStore.filteredActivity(selectedFilter.value)
  return items.slice(0, props.limit)
})

// Direct P2P events
const directEvents = computed(() => {
  if (!useDirectEvents.value) return []
  return (props.events || []).slice(0, props.limit)
})

const filterOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'Transactions', value: 'transaction' as const },
  { label: 'P2P', value: 'p2p' as const },
  { label: 'Signing', value: 'musig2' as const },
]

function getActivityRoute(activity: ActivityItem): string | null {
  switch (activity.type) {
    case 'transaction_sent':
    case 'transaction_received':
      return `/explore/explorer/tx/${activity.data.txid}`
    case 'signing_request_received':
    case 'signing_request_sent':
    case 'signing_session_completed':
      return `/people/p2p?tab=sessions`
    case 'peer_connected':
    case 'peer_disconnected':
      return `/people/p2p?tab=overview`
    default:
      return null
  }
}

function getIconColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    primary: 'text-primary',
    neutral: 'text-muted',
  }
  return colorMap[color] || 'text-muted'
}

const hasActivity = computed(() => useDirectEvents.value ? directEvents.value.length > 0 : storeActivity.value.length > 0)
</script>

<template>
  <div class="space-y-3">
    <!-- Filter Chips (only for store mode) -->
    <div v-if="showFilters && !useDirectEvents" class="flex flex-wrap gap-2">
      <UButton v-for="option in filterOptions" :key="option.value"
        :color="selectedFilter === option.value ? 'primary' : 'neutral'"
        :variant="selectedFilter === option.value ? 'solid' : 'outline'" size="xs"
        @click="selectedFilter = option.value">
        {{ option.label }}
        <UBadge v-if="activityStore.activityCounts[option.value] > 0"
          :color="selectedFilter === option.value ? 'neutral' : 'neutral'" variant="subtle" size="xs" class="ml-1">
          {{ activityStore.activityCounts[option.value] }}
        </UBadge>
      </UButton>
    </div>

    <!-- Store-based Activity List -->
    <div v-if="!useDirectEvents && storeActivity.length > 0" class="space-y-2">
      <component :is="getActivityRoute(activity) ? 'NuxtLink' : 'div'" v-for="activity in storeActivity"
        :key="activity.id" :to="getActivityRoute(activity)" :class="[
          'flex items-center gap-3 rounded-lg transition-colors',
          getActivityRoute(activity)
            ? 'hover:bg-muted/50 cursor-pointer'
            : 'bg-muted/20',
          compact ? 'p-2' : 'p-3',
        ]">
        <!-- Icon -->
        <div :class="[
          'flex items-center justify-center rounded-full shrink-0',
          compact ? 'w-8 h-8' : 'w-10 h-10',
          {
            'bg-primary/10 text-primary': activity.color === 'primary',
            'bg-success/10 text-success': activity.color === 'success',
            'bg-warning/10 text-warning': activity.color === 'warning',
            'bg-error/10 text-error': activity.color === 'error',
            'bg-muted/30 text-muted': activity.color === 'neutral',
          },
        ]">
          <UIcon :name="activity.icon" :class="compact ? 'w-4 h-4' : 'w-5 h-5'" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p :class="['font-medium truncate', compact ? 'text-sm' : '']">
            {{ activity.description }}
          </p>
          <p class="text-xs text-muted">
            {{ timeAgo(activity.timestamp) }}
          </p>
        </div>

        <!-- Arrow for clickable items -->
        <UIcon v-if="getActivityRoute(activity)" name="i-lucide-chevron-right" class="w-4 h-4 text-muted shrink-0" />
      </component>
    </div>

    <!-- Direct P2P Events List -->
    <div v-else-if="useDirectEvents && directEvents.length > 0" class="space-y-2">
      <div v-for="event in directEvents" :key="event.id" class="flex items-center gap-3 text-sm">
        <div
          :class="['w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', getP2PEventConfig(event.type).bgClass]">
          <UIcon :name="getP2PEventConfig(event.type).icon"
            :class="['w-3 h-3', getIconColorClass(getP2PEventConfig(event.type).color)]" />
        </div>
        <span class="flex-1 truncate">{{ event.message }}</span>
        <span class="text-xs text-muted flex-shrink-0">
          {{ timeAgo(event.timestamp) }}
        </span>
      </div>
    </div>

    <!-- Phase 6: Empty State using UiAppEmptyState -->
    <UiAppEmptyState v-else icon="i-lucide-activity" title="No activity yet"
      description="Your activity will appear here as you use the wallet" />
  </div>
</template>
