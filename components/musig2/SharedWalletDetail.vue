<script setup lang="ts">
/**
 * SharedWalletDetail
 *
 * Detailed view of a shared wallet.
 */
const props = defineProps<{
  /** Wallet data */
  wallet: {
    id: string
    name: string
    description?: string
    participants: Array<{
      publicKey: string
      nickname?: string
      peerId?: string
      isMe: boolean
    }>
    threshold: number
    sharedAddress: string
    balance: bigint | string
    utxos?: Array<{ txid: string; outIdx: number; value: string }>
    createdAt: number
    updatedAt: number
  }
}>()

const emit = defineEmits<{
  fund: []
  spend: []
  delete: []
  close: []
}>()

const { formatXPI } = useAmount()
const { timeAgo, formatDate } = useTime()
const { truncateAddress } = useAddress()
const { copy } = useClipboard()

// Convert balance to bigint
const balanceAmount = computed(() => {
  return typeof props.wallet.balance === 'string'
    ? BigInt(props.wallet.balance)
    : props.wallet.balance
})

const hasBalance = computed(() => balanceAmount.value > 0n)

const utxoCount = computed(() => props.wallet.utxos?.length || 0)

// Copy address
function copyAddress() {
  copy(props.wallet.sharedAddress, 'Address copied')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">{{ wallet.name }}</h2>
        <p v-if="wallet.description" class="text-muted mt-1">
          {{ wallet.description }}
        </p>
      </div>
      <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="emit('close')" />
    </div>

    <!-- Balance Card -->
    <div class="p-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl text-white">
      <p class="text-sm text-white/80 mb-1">Balance</p>
      <p class="text-3xl font-bold mb-2">{{ formatXPI(balanceAmount) }}</p>
      <div class="flex items-center gap-4 text-sm text-white/70">
        <span>{{ utxoCount }} UTXO{{ utxoCount !== 1 ? 's' : '' }}</span>
        <span>Updated {{ timeAgo(wallet.updatedAt) }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-2 gap-3">
      <UButton color="primary" size="lg" icon="i-lucide-plus" block @click="emit('fund')">
        Fund Wallet
      </UButton>
      <UButton color="neutral" variant="outline" size="lg" icon="i-lucide-send" block :disabled="!hasBalance"
        @click="emit('spend')">
        Propose Spend
      </UButton>
    </div>

    <!-- Address -->
    <div class="p-4 bg-muted/50 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-medium">Shared Address</p>
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copyAddress">
          Copy
        </UButton>
      </div>
      <p class="font-mono text-sm break-all">{{ wallet.sharedAddress }}</p>
    </div>

    <!-- Participants -->
    <div>
      <h3 class="font-semibold mb-3">
        Participants ({{ wallet.threshold }}-of-{{ wallet.participants.length }})
      </h3>
      <div class="space-y-2">
        <div v-for="(participant, index) in wallet.participants" :key="index"
          class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <UIcon name="i-lucide-user" class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-medium">{{ participant.nickname || 'Anonymous' }}</p>
              <UBadge v-if="participant.isMe" color="primary" variant="subtle" size="xs">
                You
              </UBadge>
            </div>
            <p class="text-xs text-muted font-mono truncate">
              {{ truncateAddress(participant.publicKey, 8, 8) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p class="text-muted">Created</p>
        <p class="font-medium">{{ formatDate(wallet.createdAt) }}</p>
      </div>
      <div>
        <p class="text-muted">Last Updated</p>
        <p class="font-medium">{{ formatDate(wallet.updatedAt) }}</p>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="pt-4 border-t border-default">
      <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="emit('delete')">
        Delete Wallet
      </UButton>
      <p class="text-xs text-muted mt-1">
        This only removes the wallet from your device. Funds remain on the blockchain.
      </p>
    </div>
  </div>
</template>
