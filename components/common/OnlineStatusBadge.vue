<script setup lang="ts">
/**
 * OnlineStatusBadge
 *
 * Phase 4: Shared component for consistent online status display.
 * Uses identity store's OnlineStatus type for standardized status representation.
 */
import type { OnlineStatus } from '~/types/contact'

const props = withDefaults(
  defineProps<{
    /** Online status to display */
    status: OnlineStatus
    /** Show text label alongside indicator */
    showLabel?: boolean
    /** Size variant */
    size?: 'xs' | 'sm' | 'md'
  }>(),
  {
    showLabel: false,
    size: 'xs',
  },
)

const config = computed(() => {
  switch (props.status) {
    case 'online':
      return {
        color: 'success' as const,
        icon: 'i-lucide-circle',
        label: 'Online',
      }
    case 'recently_online':
      return {
        color: 'warning' as const,
        icon: 'i-lucide-circle',
        label: 'Recently Online',
      }
    case 'offline':
      return {
        color: 'neutral' as const,
        icon: 'i-lucide-circle',
        label: 'Offline',
      }
    default:
      return {
        color: 'neutral' as const,
        icon: 'i-lucide-help-circle',
        label: 'Unknown',
      }
  }
})
</script>

<template>
  <UBadge v-if="status !== 'unknown'" :color="config.color" variant="subtle" :size="size">
    <UIcon :name="config.icon" class="w-2 h-2 fill-current" />
    <span v-if="showLabel" class="ml-1">{{ config.label }}</span>
  </UBadge>
</template>
