<script setup lang="ts">
/**
 * ConfirmationBadge
 *
 * Badge showing transaction confirmation status.
 */
import { CONFIRMED_THRESHOLD, SECURE_THRESHOLD } from '~/utils/constants'

const props = defineProps<{
  /** Number of confirmations */
  confirmations: number
  /** Show confirmation count */
  showCount?: boolean
}>()

const status = computed(() => {
  if (props.confirmations === 0) {
    return { label: 'Pending', color: 'warning' as const, icon: 'i-lucide-clock' }
  }
  if (props.confirmations < SECURE_THRESHOLD) {
    return { label: 'Confirming', color: 'primary' as const, icon: 'i-lucide-loader-2' }
  }
  return { label: 'Confirmed', color: 'success' as const, icon: 'i-lucide-check-circle' }
})

const displayLabel = computed(() => {
  if (props.showCount && props.confirmations > 0) {
    return `${props.confirmations} conf${props.confirmations === 1 ? '' : 's'}`
  }
  return status.value.label
})
</script>

<template>
  <UBadge :color="status.color" variant="subtle" size="sm">
    <UIcon :name="status.icon" :class="[
      'w-3 h-3 mr-1',
      status.color === 'primary' && 'animate-spin',
    ]" />
    {{ displayLabel }}
  </UBadge>
</template>
