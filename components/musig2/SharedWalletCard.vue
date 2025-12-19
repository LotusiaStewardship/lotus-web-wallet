<script setup lang="ts">
/**
 * SharedWalletCard
 *
 * Card displaying a shared multi-signature wallet.
 */
const props = defineProps<{
  /** Wallet data */
  wallet: {
    id: string
    name: string
    description?: string
    participants: Array<{
      peerId: string
      publicKeyHex: string
      nickname?: string
      isMe: boolean
    }>
    aggregatedPublicKeyHex: string
    sharedAddress: string
    balanceSats: string
    createdAt: number
  }
}>()

const emit = defineEmits<{
  fund: []
  spend: []
  viewDetails: []
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Convert balance to bigint
const balanceAmount = computed(() => BigInt(props.wallet.balanceSats))

// Count online participants (placeholder - would check P2P presence)
const onlineCount = computed(() => {
  // For now, just count "me" as online
  return props.wallet.participants.filter(p => p.isMe).length
})

const hasBalance = computed(() => balanceAmount.value > 0n)

// Threshold is participants.length for n-of-n MuSig2
const threshold = computed(() => props.wallet.participants.length)
</script>

<template>
  <div class="p-4 hover:bg-muted/50 transition-colors cursor-pointer" @click="emit('viewDetails')">
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
        <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium truncate">{{ wallet.name }}</p>
          <UBadge color="primary" variant="subtle" size="xs">
            {{ threshold }}-of-{{ wallet.participants.length }}
          </UBadge>
        </div>

        <p class="text-2xl font-bold mb-1">{{ formatXPI(balanceAmount) }}</p>

        <p class="text-sm text-muted">
          {{ wallet.participants.length }} participants •
          {{ onlineCount }} online •
          Created {{ timeAgo(wallet.createdAt) }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-1 flex-shrink-0">
        <UButton color="primary" size="sm" icon="i-lucide-plus" @click.stop="emit('fund')">
          Fund
        </UButton>
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-send" :disabled="!hasBalance"
          @click.stop="emit('spend')">
          Spend
        </UButton>
      </div>
    </div>
  </div>
</template>
