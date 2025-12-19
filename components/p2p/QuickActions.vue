<script setup lang="ts">
/**
 * P2PQuickActions
 *
 * Quick action cards for P2P features.
 */
const emit = defineEmits<{
  createSharedWallet: []
  joinCoinjoin: []
  becomeSigner: []
}>()

const actions = [
  {
    id: 'shared-wallet',
    icon: 'i-lucide-shield',
    title: 'Create Shared Wallet',
    description: 'Multi-signature wallet with friends',
    color: 'primary',
    event: 'createSharedWallet',
  },
  {
    id: 'coinjoin',
    icon: 'i-lucide-shuffle',
    title: 'Join CoinJoin',
    description: 'Mix transactions for privacy',
    color: 'success',
    event: 'joinCoinjoin',
  },
  {
    id: 'signer',
    icon: 'i-lucide-pen-tool',
    title: 'Become a Signer',
    description: 'Help others sign transactions',
    color: 'warning',
    event: 'becomeSigner',
  },
]

function handleClick(action: typeof actions[0]) {
  emit(action.event as any)
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <button v-for="action in actions" :key="action.id" type="button"
      class="p-4 rounded-xl border border-default bg-background hover:border-primary hover:shadow-md transition-all text-left group"
      @click="handleClick(action)">
      <div :class="[
        'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
        `bg-${action.color}-100 dark:bg-${action.color}-900/30`,
        `group-hover:bg-${action.color}-200 dark:group-hover:bg-${action.color}-900/50`,
      ]">
        <UIcon :name="action.icon" :class="['w-6 h-6', `text-${action.color}`]" />
      </div>
      <h3 class="font-semibold mb-1">{{ action.title }}</h3>
      <p class="text-sm text-muted">{{ action.description }}</p>
    </button>
  </div>
</template>
