<script setup lang="ts">
/**
 * SignerCard Component
 *
 * Displays a MuSig2 signer advertisement card.
 * Updated to use the new UI-friendly types.
 */
import type { UISignerAdvertisement } from '~/composables/useMuSig2'

const props = defineProps<{
  signer: UISignerAdvertisement
  compact?: boolean
}>()

const emit = defineEmits<{
  request: [signer: UISignerAdvertisement]
  details: [signer: UISignerAdvertisement]
}>()

// Format timestamp
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

// Display name
const displayName = computed(() => {
  return props.signer.nickname || 'Anonymous'
})

// Fee display
const feeDisplay = computed(() => {
  const fee = props.signer.fee
  return fee ? `${fee} XPI` : 'Free'
})
</script>

<template>
  <UCard class="hover:ring-2 hover:ring-success/50 transition-all cursor-pointer" @click="emit('details', signer)">
    <div :class="compact ? 'flex items-center gap-3' : 'flex items-start gap-4'">
      <!-- Signer Icon -->
      <div class="rounded-lg flex items-center justify-center flex-shrink-0 bg-success-100 dark:bg-success-900/20"
        :class="[
          compact ? 'w-10 h-10' : 'w-12 h-12',
        ]">
        <UIcon name="i-lucide-pen-tool" :class="[
          compact ? 'w-5 h-5' : 'w-6 h-6',
          'text-success-500'
        ]" />
      </div>

      <!-- Signer Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 :class="compact ? 'text-sm font-medium' : 'font-semibold'" class="truncate">
            {{ displayName }}
          </h3>
          <UBadge v-if="signer.reputation > 0" color="warning" variant="subtle" size="xs">
            ⭐ {{ signer.reputation }}
          </UBadge>
        </div>

        <!-- Transaction Types -->
        <div v-if="signer.transactionTypes?.length && !compact" class="flex flex-wrap gap-1 mb-2">
          <UBadge v-for="txType in signer.transactionTypes.slice(0, 3)" :key="txType" color="success" variant="subtle"
            size="xs">
            {{ txType }}
          </UBadge>
          <UBadge v-if="signer.transactionTypes.length > 3" color="neutral" variant="subtle" size="xs">
            +{{ signer.transactionTypes.length - 3 }}
          </UBadge>
        </div>

        <!-- Meta -->
        <div class="flex items-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-1">
            Fee: {{ feeDisplay }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-clock" class="w-3 h-3" />
            {{ formatTime(signer.createdAt) }}
          </span>
          <span v-if="!compact" class="flex items-center gap-1 truncate">
            <UIcon name="i-lucide-fingerprint" class="w-3 h-3" />
            {{ signer.peerId.slice(0, 12) }}...
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!compact" class="flex flex-col gap-2">
        <UButton color="success" size="sm" icon="i-lucide-pen-tool" @click.stop="emit('request', signer)">
          Request
        </UButton>
      </div>

      <!-- Compact action -->
      <UButton v-else color="neutral" variant="ghost" size="sm" icon="i-lucide-chevron-right"
        @click.stop="emit('details', signer)" />
    </div>
  </UCard>
</template>
