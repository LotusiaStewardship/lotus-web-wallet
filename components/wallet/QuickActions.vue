<script setup lang="ts">
/**
 * WalletQuickActions
 *
 * Grid of quick action cards for common wallet operations.
 */
import { useP2PStore } from '~/stores/p2p'

const p2pStore = useP2PStore()

const actions = computed(() => [
  {
    icon: 'i-lucide-send',
    label: 'Send',
    description: 'Send XPI to anyone',
    to: '/send',
    iconColor: 'text-primary',
  },
  {
    icon: 'i-lucide-qr-code',
    label: 'Receive',
    description: 'Show your address',
    to: '/receive',
    iconColor: 'text-success',
  },
  {
    icon: 'i-lucide-history',
    label: 'History',
    description: 'View transactions',
    to: '/history',
    iconColor: 'text-info',
  },
  {
    icon: 'i-lucide-users',
    label: 'Contacts',
    description: 'Manage contacts',
    to: '/contacts',
    iconColor: 'text-warning',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <AppActionCard v-for="action in actions" :key="action.to" :icon="action.icon" :label="action.label"
      :description="action.description" :to="action.to" :icon-color="action.iconColor" />
  </div>
</template>
