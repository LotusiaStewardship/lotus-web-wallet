<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'

const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const route = useRoute()
const colorMode = useColorMode()

// Navigation items for sidebar
const navigationItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Wallet',
      icon: 'i-lucide-wallet',
      to: '/',
      active: route.path === '/',
    },
    {
      label: 'Discover',
      icon: 'i-lucide-compass',
      to: '/discover',
      active: route.path === '/discover',
    },
    {
      label: 'Send',
      icon: 'i-lucide-send',
      to: '/send',
      active: route.path === '/send',
    },
    {
      label: 'Receive',
      icon: 'i-lucide-qr-code',
      to: '/receive',
      active: route.path === '/receive',
    },
    {
      label: 'History',
      icon: 'i-lucide-history',
      to: '/history',
      active: route.path === '/history',
    },
    {
      label: 'Contacts',
      icon: 'i-lucide-users',
      to: '/contacts',
      active: route.path === '/contacts',
    },
  ],
  [
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings',
      active: route.path.startsWith('/settings'),
    },
  ],
])

// User menu items
const userMenuItems = computed(() => [
  [{
    label: 'Network',
    icon: 'i-lucide-network',
    to: '/settings/network',
  }],
  [{
    label: colorMode.value === 'dark' ? 'Light Mode' : 'Dark Mode',
    icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
    click: () => {
      colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    },
  }],
])

// Connection status
const connectionStatus = computed(() => {
  if (!walletStore.initialized) return 'initializing'
  if (!walletStore.connected) return 'disconnected'
  return 'connected'
})

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return 'success' as const
    case 'disconnected': return 'error' as const
    default: return 'warning' as const
  }
})
</script>

<template>
  <UDashboardGroup>
    <!-- Sidebar -->
    <UDashboardSidebar collapsible>
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-flower-2" class="w-8 h-8 text-primary shrink-0" />
          <span v-if="!collapsed" class="font-bold text-lg">Lotus Wallet</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="navigationItems[0]" orientation="vertical" />
        <UNavigationMenu :collapsed="collapsed" :items="navigationItems[1]" orientation="vertical" class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <div class="p-2 space-y-2">
          <!-- Connection Status -->
          <UBadge :color="statusColor" variant="subtle" size="sm" class="w-full justify-center">
            <template #leading>
              <span class="relative flex h-2 w-2">
                <span v-if="connectionStatus === 'connected'"
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span class="relative inline-flex rounded-full h-2 w-2" :class="{
                  'bg-green-500': connectionStatus === 'connected',
                  'bg-red-500': connectionStatus === 'disconnected',
                  'bg-yellow-500': connectionStatus === 'initializing',
                }" />
              </span>
            </template>
            <span v-if="!collapsed">
              {{ connectionStatus === 'connected' ? 'Online' : connectionStatus === 'disconnected' ? 'Offline' :
                'Connecting...' }}
            </span>
          </UBadge>

          <!-- Balance Preview -->
          <div v-if="!collapsed" class="text-center pt-2 border-t border-gray-200 dark:border-gray-800">
            <div class="text-xs text-gray-500">Balance</div>
            <div class="font-mono font-semibold text-sm">
              {{ walletStore.formattedBalance }} XPI
            </div>
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <!-- Main Content -->
    <UDashboardPanel grow>
      <UDashboardNavbar>
        <template #leading>
          <UBreadcrumb :items="[{ label: (route.meta.title as string) || 'Wallet' }]" />
        </template>

        <template #trailing>
          <div class="flex items-center gap-2">
            <!-- Network indicator -->
            <UTooltip text="Network Status">
              <UButton color="neutral" variant="ghost" size="sm"
                :icon="walletStore.connected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" />
            </UTooltip>

            <!-- Color mode toggle -->
            <UButton color="neutral" variant="ghost" size="sm"
              :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'" />

            <!-- User menu -->
            <UDropdownMenu :items="userMenuItems">
              <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-user-circle" />
            </UDropdownMenu>
          </div>
        </template>
      </UDashboardNavbar>

      <div class="flex-1 overflow-auto p-6">
        <!-- Loading State -->
        <div v-if="walletStore.loading" class="flex flex-col items-center justify-center h-full gap-4">
          <UIcon name="i-lucide-loader-2" class="w-12 h-12 animate-spin text-primary" />
          <p class="text-gray-500">{{ walletStore.loadingMessage || 'Loading...' }}</p>
        </div>

        <!-- Main Content -->
        <slot v-else />
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
