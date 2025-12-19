<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'
import { useMuSig2Store } from '~/stores/musig2'
import type { NavItem } from '~/components/layout/MobileBottomNav.vue'

const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const musig2Store = useMuSig2Store()
const route = useRoute()

// Command palette state
const commandPaletteOpen = ref(false)

// Keyboard shortcuts help modal
const keyboardShortcutsOpen = ref(false)

// Mobile detection - use useMediaQuery for SSR-safe detection
const isMobile = ref(true) // Default to mobile for SSR

// Sidebar open state (for mobile slideover) - start closed on mobile
const sidebarOpen = ref(false)

onMounted(() => {
  networkStore.initialize()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function checkMobile() {
  const wasMobile = isMobile.value
  isMobile.value = window.innerWidth < 768
  // Close sidebar when switching to mobile, open when switching to desktop
  if (isMobile.value !== wasMobile) {
    sidebarOpen.value = !isMobile.value
  }
}

// Keyboard shortcut for command palette (Cmd+K)
onKeyStroke('k', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    commandPaletteOpen.value = true
  }
})

// Keyboard shortcuts for navigation
onKeyStroke('s', (e) => {
  if ((e.metaKey || e.ctrlKey) && !isInputFocused()) {
    e.preventDefault()
    navigateTo('/transact/send')
  }
})

onKeyStroke('r', (e) => {
  if ((e.metaKey || e.ctrlKey) && !isInputFocused()) {
    e.preventDefault()
    navigateTo('/transact/receive')
  }
})

onKeyStroke('h', (e) => {
  if ((e.metaKey || e.ctrlKey) && !isInputFocused()) {
    e.preventDefault()
    navigateTo('/transact/history')
  }
})

// Keyboard shortcut for help (Cmd+/)
onKeyStroke('/', (e) => {
  if ((e.metaKey || e.ctrlKey) && !isInputFocused()) {
    e.preventDefault()
    keyboardShortcutsOpen.value = true
  }
})

function isInputFocused(): boolean {
  const active = document.activeElement
  return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'
}

// Simplified navigation items (5 groups instead of 9)
const navigationItems = computed<NavItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-home',
    to: '/',
    active: route.path === '/',
  },
  {
    label: 'Transact',
    icon: 'i-lucide-arrow-left-right',
    to: '/transact',
    active: route.path.startsWith('/transact') ||
      route.path === '/send' ||
      route.path === '/receive' ||
      route.path === '/history',
  },
  {
    label: 'People',
    icon: 'i-lucide-users',
    to: '/people',
    active: route.path.startsWith('/people') ||
      route.path === '/contacts' ||
      route.path === '/p2p',
    badge: musig2Store.pendingSessions.length || undefined,
  },
  {
    label: 'Explore',
    icon: 'i-lucide-compass',
    to: '/explore',
    active: route.path.startsWith('/explore') ||
      route.path.startsWith('/explorer') ||
      route.path.startsWith('/social'),
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    active: route.path.startsWith('/settings'),
  },
])

// Breadcrumb items based on route
const breadcrumbItems = computed(() => {
  const items: { label: string; to?: string }[] = []
  const pathParts = route.path.split('/').filter(Boolean)

  // Build breadcrumb from path
  let currentPath = ''
  for (const part of pathParts) {
    currentPath += `/${part}`
    items.push({
      label: formatBreadcrumbLabel(part),
      to: currentPath,
    })
  }

  // If empty, show Home
  if (items.length === 0) {
    items.push({ label: 'Home' })
  }

  return items
})

function formatBreadcrumbLabel(part: string): string {
  // Handle dynamic routes like [txid] or [address]
  if (part.startsWith('[')) {
    const paramName = part.slice(1, -1)
    return (route.params[paramName] as string)?.slice(0, 12) + '...' || part
  }
  // Capitalize and format
  return part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
}

// Connection status
const connectionStatus = computed(() => {
  if (!walletStore.sdkReady) return 'loading' as const
  if (!walletStore.connected && !walletStore.initialized) return 'connecting' as const
  if (!walletStore.connected) return 'disconnected' as const
  return 'connected' as const
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Accessibility: Skip to main content link -->
    <CommonSkipLinks />

    <UDashboardGroup>
      <!-- Desktop Sidebar (slideover on mobile, but we use our own bottom nav) -->
      <UDashboardSidebar v-model:open="sidebarOpen" collapsible :toggle="isMobile ? false : undefined"
        class="hidden md:flex">
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
          <LayoutSidebarFooter :collapsed="collapsed ?? false" :connection-status="connectionStatus" />
        </template>
      </UDashboardSidebar>

      <!-- Main Content -->
      <UDashboardPanel grow>
        <!-- Mobile Header (simplified - no hamburger, just title + actions) -->
        <header v-if="isMobile"
          class="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-between h-14 px-4">
            <!-- Left: Page title only -->
            <span class="font-semibold truncate">{{ breadcrumbItems[breadcrumbItems.length - 1]?.label || 'Lotus'
              }}</span>

            <!-- Right: Search + Notifications -->
            <div class="flex items-center gap-1">
              <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-search"
                @click="commandPaletteOpen = true" />
              <LayoutNotificationCenter />
            </div>
          </div>
        </header>

        <!-- Desktop Header (full) -->
        <UDashboardNavbar v-else class="hidden md:flex">
          <template #leading>
            <UBreadcrumb :items="breadcrumbItems" />
          </template>
          <template #trailing>
            <LayoutNavbarActions :connection-status="connectionStatus"
              @open-command-palette="commandPaletteOpen = true" />
          </template>
        </UDashboardNavbar>

        <div class="flex-1 overflow-auto">
          <!-- Network Banner (non-production networks) -->
          <LayoutNetworkBanner v-if="!networkStore.isProduction" />

          <!-- Main Content Area with max-width constraint -->
          <div id="main-content" class="p-4 md:p-6 pb-24 md:pb-6">
            <div class="max-w-3xl mx-auto">
              <!-- SDK Loading State -->
              <div v-if="walletStore.loading && !walletStore.sdkReady"
                class="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <UIcon name="i-lucide-loader-2" class="w-12 h-12 animate-spin text-primary" />
                <p class="text-gray-500">{{ walletStore.loadingMessage || 'Loading wallet...' }}</p>
              </div>

              <!-- Page Content -->
              <slot v-else />
            </div>
          </div>
        </div>
      </UDashboardPanel>

      <!-- Command Palette -->
      <LayoutCommandPalette v-model:open="commandPaletteOpen" />

      <!-- Keyboard Shortcuts Help Modal -->
      <CommonKeyboardShortcutsModal v-model:open="keyboardShortcutsOpen" />
    </UDashboardGroup>

    <!-- Mobile Bottom Navigation - Outside UDashboardGroup for proper positioning -->
    <LayoutMobileBottomNav v-if="isMobile" :items="navigationItems" />

    <!-- Offline Indicator -->
    <CommonOfflineIndicator />
  </div>
</template>
