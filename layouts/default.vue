<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useNetworkStore } from '~/stores/network'

const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const networkStore = useNetworkStore()
const route = useRoute()
const colorMode = useColorMode()

// Initialize network store on mount
onMounted(() => {
  networkStore.initialize()
})

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
      label: 'Explorer',
      icon: 'i-lucide-blocks',
      to: '/explorer',
      active: route.path.startsWith('/explorer'),
    },
    {
      label: 'Social',
      icon: 'i-lucide-thumbs-up',
      to: '/social',
      active: route.path.startsWith('/social'),
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
  // SDK not ready yet - still loading
  if (!walletStore.sdkReady) return 'loading'
  // SDK ready but not connected yet - connecting in background
  if (!walletStore.connected && !walletStore.initialized) return 'connecting'
  // Initialized but disconnected - network issue
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
        <UNavigationMenu :collapsed="collapsed" :items="navigationItems[1]" orientation="vertical" class="mt-4" />
        <UNavigationMenu :collapsed="collapsed" :items="navigationItems[2]" orientation="vertical" class="mt-auto" />
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
                  'bg-yellow-500': connectionStatus === 'connecting' || connectionStatus === 'loading',
                }" />
              </span>
            </template>
            <span v-if="!collapsed">
              {{ connectionStatus === 'connected' ? 'Online' : connectionStatus === 'disconnected' ? 'Offline' :
                connectionStatus === 'connecting' ? 'Connecting...' : 'Loading...' }}
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
            <!-- Network indicator - clickable button to network settings -->
            <UTooltip
              :text="connectionStatus === 'connecting' ? 'Connecting to network...' : `${networkStore.displayName} - Click to change network`">
              <UButton :color="networkStore.isProduction ? 'neutral' : networkStore.color"
                :variant="networkStore.isProduction ? 'ghost' : 'soft'" size="sm" to="/settings/network"
                class="gap-1.5">
                <UIcon v-if="connectionStatus === 'connecting'" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
                <UIcon v-else :name="walletStore.connected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" class="w-4 h-4" />
                <UBadge v-if="!networkStore.isProduction" :color="networkStore.color" variant="solid" size="xs">
                  {{ networkStore.displayName }}
                </UBadge>
              </UButton>
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

      <div class="flex-1 overflow-auto">
        <!-- Testnet/Regtest Banner -->
        <div v-if="!networkStore.isProduction" :class="[
          'px-4 py-2 text-center text-sm font-medium',
          networkStore.isTestnet ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300' : '',
          /* networkStore.isRegtest ? 'bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-300' : '' */
        ]">
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 inline mr-1" />
          You are on {{ networkStore.displayName }}. Coins have no real value.
          <NuxtLink to="/settings/network" class="underline ml-1">Switch network</NuxtLink>
        </div>

        <div class="p-6">
          <!-- SDK Loading State (only shown during initial SDK load, not network connection) -->
          <div v-if="walletStore.loading && !walletStore.sdkReady"
            class="flex flex-col items-center justify-center h-full gap-4">
            <UIcon name="i-lucide-loader-2" class="w-12 h-12 animate-spin text-primary" />
            <p class="text-gray-500">{{ walletStore.loadingMessage || 'Loading...' }}</p>
          </div>

          <!-- Main Content (shown once SDK is ready, network connects in background) -->
          <slot v-else />
        </div>
      </div>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
