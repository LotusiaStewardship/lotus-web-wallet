<script setup lang="ts">
/**
 * AmountDisplay
 *
 * XPI amount formatting with optional sign and color.
 */
import { formatXPI } from '~/utils/formatting'

const props = defineProps<{
  /** Amount in satoshis */
  sats: string | number | bigint
  /** Show + or - sign */
  showSign?: boolean
  /** Color based on positive/negative */
  colorize?: boolean
  /** Show XPI symbol */
  showSymbol?: boolean
  /** Use compact format for large numbers */
  compact?: boolean
  /** Use monospace font */
  mono?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

const amount = computed(() => {
  const value = typeof props.sats === 'bigint' ? props.sats : BigInt(props.sats)
  return value
})

const isPositive = computed(() => amount.value > 0n)
const isNegative = computed(() => amount.value < 0n)

const displayAmount = computed(() => {
  const absAmount = amount.value < 0n ? -amount.value : amount.value
  const formatted = formatXPI(absAmount, {
    showSymbol: props.showSymbol,
    minDecimals: 2,
    maxDecimals: 6,
  })

  if (props.showSign) {
    if (isPositive.value) return `+${formatted}`
    if (isNegative.value) return `-${formatted}`
  }

  return formatted
})

const colorClass = computed(() => {
  if (!props.colorize) return ''
  if (isPositive.value) return 'text-success'
  if (isNegative.value) return 'text-error'
  return ''
})

const sizeClass = computed(() => sizeClasses[props.size || 'md'])
</script>

<template>
  <span :class="[
    sizeClass,
    colorClass,
    { 'font-mono': mono },
  ]">
    {{ displayAmount }}
  </span>
</template>
