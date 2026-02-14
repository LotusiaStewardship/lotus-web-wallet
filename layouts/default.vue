<script setup lang="ts">
/**
 * Default Layout
 *
 * Human-centric layout using Nuxt UI 3 Pro dashboard components.
 * Uses UDashboardGroup, UDashboardSidebar, and UDashboardPanel for proper layout.
 * Modal management is handled by useModals composable via useOverlay.
 */
import { resetForChaining, type ScanModalResult } from '~/composables/useOverlays'

const { $chronik } = useNuxtApp()
const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const activityStore = useActivityStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()

// Overlay management via useOverlays
const {
  openSendModal,
  openReceiveModal,
  openScanModal,
  openActionSheet,
  openKeyboardShortcutsModal,
  openAddContactModal,
} = useOverlays()

// Watch for send query param globally and open modal
watch(() => route.query, async (query) => {
  if (query.send) {
    const address = query.send as string
    const amount = query.amount ? Number(query.amount) : undefined

    // Clean query params immediately
    await router.replace({ query: { ...route.query, send: undefined, amount: undefined } })

    // Open modal and wait for result
    await openSendModal({ initialRecipient: address, initialAmount: amount })
  }
}, { immediate: true })

// Mobile detection
const isMobile = ref(true)

onBeforeMount(() => {
  networkStore.initialize()
  // Update Chronik plugin with current network configuration
  // This will ensure the configured network is set when walletStore.initialize() is called
  $chronik.setNetwork(networkStore.config)
})

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// Get page title from route
const pageTitle = computed(() => {
  const pathParts = route.path.split('/').filter(Boolean)
  if (pathParts.length === 0) return 'Home'
  const lastPart = pathParts[pathParts.length - 1]
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ')
})

// Navigation items for sidebar
const navigationItems = computed(() => [
  [
    {
      label: 'Home',
      icon: 'i-lucide-home',
      to: '/',
      active: route.path === '/',
    },
    {
      label: 'People',
      icon: 'i-lucide-users',
      to: '/people',
      active: route.path.startsWith('/people'),
    },
    {
      label: 'Activity',
      icon: 'i-lucide-bell',
      to: '/activity',
      active: route.path.startsWith('/activity'),
      badge: activityStore.unreadCount > 0 ? activityStore.unreadCount : undefined,
    },
    {
      label: 'Explore',
      icon: 'i-lucide-compass',
      to: '/explore',
      active: route.path.startsWith('/explore'),
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings',
      active: route.path.startsWith('/settings'),
    },
  ],
])

// Handle action sheet - open and process result
async function handleActionSheet() {
  const action = await openActionSheet()
  if (!action) return

  // Reset overlay state so the next modal can properly take over the history entry
  resetForChaining()

  switch (action) {
    case 'send':
      await openSendModal()
      break
    case 'receive':
      await openReceiveModal()
      break
    case 'scan':
      await handleScanFlow()
      break
  }
}

// Handle scan flow - open scan modal and process result
async function handleScanFlow() {
  const result = await openScanModal() as ScanModalResult | { manualEntry: true } | undefined

  if (!result) return

  // Reset overlay state so the next modal can properly take over the history entry
  resetForChaining()

  // Handle manual entry request
  if ('manualEntry' in result && result.manualEntry) {
    await openSendModal()
    return
  }

  // Handle scan results
  const scanResult = result as ScanModalResult

  if (scanResult.type === 'contact' && scanResult.contact) {
    await openAddContactModal({
      initialAddress: scanResult.contact.address,
      initialName: scanResult.contact.name,
      initialPublicKey: scanResult.contact.publicKeyHex,
    })
  } else if (scanResult.type === 'address' || scanResult.type === 'payment') {
    await openSendModal({
      initialRecipient: scanResult.address,
      initialAmount: scanResult.amount,
    })
  }
}
</script>

<template>
  <div>
    <UDashboardGroup>
      <!-- Desktop Sidebar -->
      <UDashboardSidebar v-if="!isMobile" collapsible>
        <template #header="{ collapsed }">
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-lucide-flower-2" class="w-8 h-8 text-primary shrink-0" />
            <span v-if="!collapsed" class="font-bold text-lg">Lotus Wallet</span>
          </NuxtLink>
        </template>

        <template #default="{ collapsed }">
          <UNavigationMenu :collapsed="collapsed" :items="navigationItems" orientation="vertical" />
        </template>

        <template #footer="{ collapsed }">
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
            <span class="w-2 h-2 rounded-full shrink-0" :class="networkStore.initialized ? 'bg-success' : 'bg-error'" />
            <span v-if="!collapsed" class="text-gray-600 dark:text-gray-400 truncate">
              {{ networkStore.config.displayName }}
            </span>
          </div>
        </template>
      </UDashboardSidebar>

      <!-- Main Panel -->
      <UDashboardPanel grow>
        <!-- Desktop Navbar -->
        <template #header>
          <UDashboardNavbar v-if="!isMobile">
            <template #leading>
              <span class="text-lg font-semibold">{{ pageTitle }}</span>
            </template>

            <template #trailing>
              <div class="flex items-center gap-3">
                <!-- Network indicator (non-production) -->
                <UBadge v-if="!networkStore.isProduction" color="warning" variant="subtle">
                  <UIcon name="i-lucide-alert-triangle" class="w-3 h-3 mr-1" />
                  {{ networkStore.config.displayName }}
                </UBadge>
                <!-- Connection status -->
                <UTooltip
                  :text="walletStore.connected ? 'Connected to Chronik blockchain server' : 'Disconnected from blockchain server'">
                  <NuxtLink to="/settings"
                    class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer">
                    <span class="w-2 h-2 rounded-full" :class="walletStore.connected ? 'bg-success' : 'bg-gray-400'" />
                    <span>{{ walletStore.connected ? 'Connected' : 'Offline' }}</span>
                  </NuxtLink>
                </UTooltip>
              </div>
            </template>
          </UDashboardNavbar>

          <!-- Mobile Header -->
          <div v-else
            class="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <!-- Left: Balance and network indicator -->
            <div class="flex items-center gap-2">
              <NuxtLink to="/" class="flex items-center gap-2">
                <UIcon name="i-lucide-flower-2" class="w-5 h-5 text-primary" />
                <span class="font-semibold text-sm">
                  {{ !settingsStore.shouldHideBalance ? walletStore.formattedBalance : '(hidden)' }} XPI
                </span>
              </NuxtLink>
              <!-- Network indicator (non-production) -->
              <UBadge v-if="!networkStore.isProduction" color="warning" variant="subtle" size="xs">
                {{ networkStore.config.displayName }}
              </UBadge>
              <!-- Connection indicator -->
              <UTooltip :text="walletStore.connected ? 'Connected' : 'Offline'">
                <span class="w-2 h-2 rounded-full" :class="walletStore.connected ? 'bg-success' : 'bg-gray-400'" />
              </UTooltip>
            </div>
            <!-- Right: Search and Explore buttons -->
            <div class="flex items-center gap-2">
              <!-- <UButton variant="ghost" size="md" icon="i-lucide-search" to="/explore" /> -->
              <UButton variant="ghost" size="md" icon="i-lucide-compass" to="/explore" />
            </div>
          </div>
        </template>

        <!-- Page Content -->
        <template #body>
          <!-- SDK Loading State -->
          <div v-if="walletStore.loading && !walletStore.isReadyForSigning()"
            class="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <UIcon name="i-lucide-loader-2" class="w-12 h-12 animate-spin text-primary" />
            <p class="text-gray-500">{{ walletStore.loadingMessage || 'Loading wallet...' }}</p>
          </div>

          <!-- Page Content with bottom padding for mobile nav -->
          <div v-else id="main-content" :class="isMobile ? 'pb-20' : ''">
            <div class="max-w-3xl mx-auto">
              <slot />
            </div>
          </div>
        </template>
      </UDashboardPanel>

      <!-- Mobile Bottom Navigation -->
      <NavigationBottomNav v-if="isMobile" @action="handleActionSheet" />
    </UDashboardGroup>

    <!-- All overlays (modals/slideovers) are managed by useOverlays composable -->
    <!-- No overlay components needed in template! -->

    <!-- Accessibility & Polish Components -->
    <A11ySkipLinks />
    <UiNetworkErrorBanner />
    <UiOfflineIndicator />
  </div>
</template>
