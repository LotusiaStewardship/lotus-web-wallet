<script setup lang="ts">
/**
 * SendFeeSection
 *
 * Fee display with advanced options toggle.
 */
const props = defineProps<{
  /** Estimated fee in satoshis */
  fee: string
  /** Fee rate in sat/byte */
  feeRate: number
  /** Whether advanced options are open */
  advancedOpen?: boolean
}>()

const emit = defineEmits<{
  toggleAdvanced: []
}>()

const { formatXPI } = useAmount()

const feeDisplay = computed(() => formatXPI(props.fee, { showUnit: false }))
</script>

<template>
  <div class="flex items-center justify-between py-3 border-t border-b border-default">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-gauge" class="w-4 h-4 text-muted" />
      <span class="text-sm text-muted">Network Fee:</span>
      <span class="text-sm font-medium">{{ feeDisplay }} XPI</span>
      <span class="text-xs text-muted">({{ feeRate }} sat/byte)</span>
    </div>

    <UButton color="neutral" variant="ghost" size="xs"
      :icon="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-settings'" @click="emit('toggleAdvanced')">
      Advanced
    </UButton>
  </div>
</template>
