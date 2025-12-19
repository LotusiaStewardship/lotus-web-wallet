<script setup lang="ts">
/**
 * Display XPI amount with proper formatting
 * Shows integer and fractional parts separately for visual clarity
 */
const { satsToXPI, xpiToSats } = useAmount()

// Alias for backward compatibility
const toXPI = (sats: string | number) => parseFloat(satsToXPI(BigInt(sats)))
const toSats = (xpi: number) => Number(xpiToSats(xpi))

const props = defineProps<{
  sats: string | number
  showUnit?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

const fractionalSizeClasses = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

const amountIntPart = computed(() => Math.floor(toXPI(props.sats)))
const amountFloatPart = computed(() => {
  const totalSats = Number(props.sats)
  const intSats = toSats(amountIntPart.value)
  return totalSats - intSats
})
</script>

<template>
  <span class="font-mono" :class="sizeClasses[size || 'md']">
    {{ amountIntPart.toLocaleString() }}<span v-if="amountFloatPart > 0" class="text-muted"
      :class="fractionalSizeClasses[size || 'md']">.{{ amountFloatPart.toString().padStart(6, '0') }}</span>
    <span v-if="showUnit !== false" class="text-muted ml-1" :class="fractionalSizeClasses[size || 'md']">XPI</span>
  </span>
</template>
