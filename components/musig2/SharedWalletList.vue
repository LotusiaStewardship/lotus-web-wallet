<script setup lang="ts">
/**
 * SharedWalletList
 *
 * List of shared multi-signature wallets.
 */
const props = defineProps<{
  /** Shared wallets */
  wallets: Array<{
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
  }>
  /** Loading state */
  loading?: boolean
}>()

const emit = defineEmits<{
  fund: [wallet: any]
  spend: [wallet: any]
  viewDetails: [wallet: any]
  create: []
  refresh: []
}>()
</script>

<template>
  <UiAppCard title="Shared Wallets" icon="i-lucide-shield">
    <template #header-badge>
      <UBadge v-if="wallets.length" color="primary" variant="subtle" size="sm">
        {{ wallets.length }}
      </UBadge>
    </template>

    <template #header-action>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="loading"
          @click="emit('refresh')" />
        <UButton color="primary" size="xs" icon="i-lucide-plus" @click="emit('create')">
          New
        </UButton>
      </div>
    </template>

    <!-- Loading -->
    <UiAppLoadingState v-if="loading" message="Loading wallets..." />

    <!-- Wallets -->
    <div v-else-if="wallets.length" class="divide-y divide-default -mx-4">
      <Musig2SharedWalletCard v-for="wallet in wallets" :key="wallet.id" :wallet="wallet" @fund="emit('fund', wallet)"
        @spend="emit('spend', wallet)" @view-details="emit('viewDetails', wallet)" />
    </div>

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-shield" title="No shared wallets"
      description="Create a shared wallet with other users for multi-signature transactions" :action="{
        label: 'Create Shared Wallet',
        onClick: () => emit('create'),
      }" />
  </UiAppCard>
</template>
