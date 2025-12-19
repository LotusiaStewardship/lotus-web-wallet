<script setup lang="ts">
/**
 * AccountBadge Component
 *
 * Phase 6: Visual badge indicating account type.
 * Shows icon and optional label with appropriate colors.
 */
import { AccountPurpose, ACCOUNT_FRIENDLY_LABELS } from '~/types/accounts'

const props = withDefaults(
  defineProps<{
    /** Account purpose to display */
    purpose: AccountPurpose
    /** Size variant */
    size?: 'xs' | 'sm' | 'md'
    /** Show text label */
    showLabel?: boolean
  }>(),
  {
    size: 'sm',
    showLabel: false,
  },
)

const icon = computed(() => {
  switch (props.purpose) {
    case AccountPurpose.PRIMARY:
      return 'i-lucide-wallet'
    case AccountPurpose.MUSIG2:
      return 'i-lucide-shield'
    case AccountPurpose.SWAP:
      return 'i-lucide-repeat'
    case AccountPurpose.PRIVACY:
      return 'i-lucide-eye-off'
    default:
      return 'i-lucide-circle'
  }
})

const label = computed(() => ACCOUNT_FRIENDLY_LABELS[props.purpose] || 'Unknown')

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-1.5 py-0.5 text-xs gap-1'
    case 'md':
      return 'px-3 py-1.5 text-base gap-2'
    default:
      return 'px-2 py-1 text-sm gap-1.5'
  }
})

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3 h-3'
    case 'md':
      return 'w-5 h-5'
    default:
      return 'w-4 h-4'
  }
})

// Phase 6: Semantic color classes
const colorClasses = computed(() => {
  switch (props.purpose) {
    case AccountPurpose.PRIMARY:
      return 'bg-primary/10 text-primary'
    case AccountPurpose.MUSIG2:
      return 'bg-secondary/10 text-secondary'
    case AccountPurpose.SWAP:
      return 'bg-warning/10 text-warning'
    case AccountPurpose.PRIVACY:
      return 'bg-muted text-muted'
    default:
      return 'bg-neutral/10 text-muted'
  }
})
</script>

<template>
  <div :class="[
    'inline-flex items-center rounded-full font-medium',
    sizeClasses,
    colorClasses,
  ]" :title="label">
    <UIcon :name="icon" :class="iconSizeClasses" />
    <span v-if="showLabel">{{ label }}</span>
  </div>
</template>
