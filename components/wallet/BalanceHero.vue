<script setup lang="ts">
/**
 * WalletBalanceHero
 *
 * Hero card displaying wallet balance with connection status.
 */
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'

const props = defineProps<{
  /** Show compact version */
  compact?: boolean
}>()

const walletStore = useWalletStore()
const networkStore = useNetworkStore()

const { formatXPI } = useAmount()

const balanceDisplay = computed(() => formatXPI(walletStore.balance.total))

const spendableDisplay = computed(() => {
  const total = BigInt(walletStore.balance.total)
  const spendable = BigInt(walletStore.balance.spendable)
  if (total === spendable) return null
  return `${formatXPI(walletStore.balance.spendable)} spendable`
})

const networkDisplay = computed(() => {
  if (!walletStore.connected) return 'Connecting...'
  return `Connected to ${networkStore.currentNetwork === 'livenet' ? 'Mainnet' : 'Testnet'}`
})

const connectionColor = computed(() => {
  if (!walletStore.connected) return 'bg-warning'
  return 'bg-success'
})
</script>

<template>
  <UiAppHeroCard :gradient="!compact">
    <template #icon>
      <div class="relative">
        <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <UIcon name="i-lucide-wallet" class="w-8 h-8 text-primary" />
        </div>
        <!-- Phase 6: Connection indicator with semantic colors -->
        <span :class="[
          'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background',
          connectionColor,
        ]" />
      </div>
    </template>

    <h1 class="text-3xl font-bold mb-1">{{ balanceDisplay }}</h1>
    <p v-if="spendableDisplay" class="text-sm text-warning mb-2">
      {{ spendableDisplay }}
    </p>
    <p class="text-muted text-sm">
      {{ networkDisplay }}
    </p>

    <template v-if="!compact" #actions>
      <div class="flex justify-center gap-3 mt-4">
        <UButton to="/send" icon="i-lucide-send">Send</UButton>
        <UButton to="/receive" variant="outline" icon="i-lucide-qr-code">
          Receive
        </UButton>
      </div>
    </template>
  </UiAppHeroCard>
</template>
