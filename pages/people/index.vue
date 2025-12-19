<script setup lang="ts">
/**
 * People Hub Page
 *
 * Phase 10 R10.3.1: Updated to remove P2P card.
 * Landing page for the People section with access to Contacts and Shared Wallets.
 * P2P functionality is now integrated into Shared Wallets.
 */
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'

definePageMeta({
  title: 'People',
})

const contactsStore = useContactsStore()
const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()

// Quick stats
const stats = computed(() => [
  {
    label: 'Contacts',
    value: contactsStore.contactCount,
    icon: 'i-lucide-users',
  },
  {
    label: 'Shared Wallets',
    value: musig2Store.sharedWallets.length,
    icon: 'i-lucide-shield',
  },
  {
    label: 'P2P Status',
    value: p2pStore.connected ? 'Online' : 'Offline',
    icon: 'i-lucide-wifi',
    color: p2pStore.connected ? 'text-success' : 'text-muted',
  },
])

// Navigation items - Phase 10: Removed P2P Network card
const subPages = computed(() => [
  {
    label: 'Contacts',
    icon: 'i-lucide-users',
    to: '/people/contacts',
    description: 'Manage your saved addresses',
    badge: contactsStore.contactCount > 0 ? contactsStore.contactCount : undefined,
  },
  {
    label: 'Shared Wallets',
    icon: 'i-lucide-shield',
    to: '/people/shared-wallets',
    description: 'Multi-signature wallets and P2P coordination',
    badge: (musig2Store.sharedWallets.length + musig2Store.pendingRequestCount) || undefined,
    status: p2pStore.connected ? 'connected' : 'disconnected',
  },
])

// Pending requests count for badge
const pendingRequestsCount = computed(() => {
  return musig2Store.pendingRequestCount
})
</script>

<template>
  <div class="space-y-6">
    <!-- Hero Card -->
    <UiAppHeroCard icon="i-lucide-users" title="People" subtitle="Manage contacts and connect with the P2P network" />

    <!-- Quick Stats -->
    <div class="grid grid-cols-3 gap-4">
      <div v-for="stat in stats" :key="stat.label"
        class="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UIcon :name="stat.icon" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="text-xs text-muted">{{ stat.label }}</p>
            <p class="font-semibold" :class="stat.color">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pending Requests Alert -->
    <UAlert v-if="pendingRequestsCount > 0" color="warning" icon="i-lucide-bell"
      :title="`${pendingRequestsCount} pending signing request${pendingRequestsCount > 1 ? 's' : ''}`"
      description="You have signing requests waiting for your action.">
      <template #actions>
        <UButton color="warning" variant="soft" size="sm" to="/people/shared-wallets">
          View Requests
        </UButton>
      </template>
    </UAlert>

    <!-- Navigation Grid - Phase 10: Updated to 2 columns -->
    <div class="grid gap-4 md:grid-cols-2">
      <NuxtLink v-for="page in subPages" :key="page.to" :to="page.to"
        class="block p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UIcon :name="page.icon" class="w-6 h-6 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-lg">{{ page.label }}</span>
              <UBadge v-if="page.badge" color="primary" variant="subtle" size="xs">
                {{ page.badge }}
              </UBadge>
              <span v-if="page.status" class="w-2 h-2 rounded-full"
                :class="page.status === 'connected' ? 'bg-success-500' : 'bg-gray-400'" />
            </div>
            <p class="text-sm text-gray-500">{{ page.description }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Recent Activity Preview -->
    <UiAppCard v-if="p2pStore.recentActivity.length > 0" title="Recent Activity" icon="i-lucide-activity"
      :action="{ label: 'View All', to: '/people/p2p' }">
      <div class="divide-y divide-default -mx-4">
        <div v-for="(event, index) in p2pStore.recentActivity.slice(0, 3)" :key="index"
          class="px-4 py-3 flex items-center gap-3">
          <UIcon name="i-lucide-activity" class="w-4 h-4 text-muted" />
          <span class="text-sm">{{ event.type }}</span>
          <span class="text-xs text-muted ml-auto">
            {{ new Date(event.timestamp).toLocaleTimeString() }}
          </span>
        </div>
      </div>
    </UiAppCard>
  </div>
</template>
