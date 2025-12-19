# Phase 1: Layout & Navigation System

## Overview

This phase establishes the foundational layout system that all pages will use. We're moving from a flat 9-item sidebar to a simplified 5-item navigation with grouped sub-pages, plus mobile-first bottom navigation and a command palette.

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Dependencies**: Existing `layouts/default.vue`, Nuxt UI components

---

## Goals

1. Simplify navigation from 9 items to 5 logical groups
2. Add mobile bottom navigation
3. Implement command palette (Cmd+K)
4. Add proper breadcrumbs for nested pages
5. Standardize page layout patterns

---

## 1. Navigation Restructure

### Current Navigation (9 items)

```
Wallet | P2P | Send | Receive | History | Contacts | Explorer | Social | Settings
```

### New Navigation (5 groups)

```
Home | Transact | People | Explore | Settings
```

### Navigation Mapping

| New Item     | Contains                         | Routes                                                                  |
| ------------ | -------------------------------- | ----------------------------------------------------------------------- |
| **Home**     | Balance, Quick Actions, Activity | `/`                                                                     |
| **Transact** | Send, Receive, History           | `/transact`, `/transact/send`, `/transact/receive`, `/transact/history` |
| **People**   | Contacts, P2P Network            | `/people`, `/people/contacts`, `/people/p2p`                            |
| **Explore**  | Explorer, Social/RANK            | `/explore`, `/explore/explorer/*`, `/explore/social/*`                  |
| **Settings** | All settings                     | `/settings/*`                                                           |

---

## 2. New Layout Structure

### File: `layouts/default.vue` (Updated)

```vue
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

// Command palette state
const commandPaletteOpen = ref(false)

// Mobile detection
const isMobile = ref(false)
onMounted(() => {
  networkStore.initialize()
  isMobile.value = window.innerWidth < 768
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
})

// Keyboard shortcut for command palette
onKeyStroke('k', e => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    commandPaletteOpen.value = true
  }
})

// Simplified navigation items
const navigationItems = computed<NavigationMenuItem[]>(() => [
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
    active: route.path.startsWith('/transact'),
    badge:
      walletStore.pendingTxCount > 0 ? walletStore.pendingTxCount : undefined,
  },
  {
    label: 'People',
    icon: 'i-lucide-users',
    to: '/people',
    active: route.path.startsWith('/people'),
    badge:
      p2pStore.pendingRequestCount > 0
        ? p2pStore.pendingRequestCount
        : undefined,
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
])

// Breadcrumb items based on route
const breadcrumbItems = computed(() => {
  const items = []
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
  // Handle dynamic routes
  if (part.startsWith('['))
    return (route.params[part.slice(1, -1)] as string) || part
  // Capitalize and format
  return part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
}

// Connection status (existing logic)
const connectionStatus = computed(() => {
  if (!walletStore.sdkReady) return 'loading'
  if (!walletStore.connected && !walletStore.initialized) return 'connecting'
  if (!walletStore.connected) return 'disconnected'
  return 'connected'
})

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'success' as const
    case 'disconnected':
      return 'error' as const
    default:
      return 'warning' as const
  }
})
</script>

<template>
  <UDashboardGroup>
    <!-- Desktop Sidebar -->
    <UDashboardSidebar v-if="!isMobile" collapsible>
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2">
          <UIcon
            name="i-lucide-flower-2"
            class="w-8 h-8 text-primary shrink-0"
          />
          <span v-if="!collapsed" class="font-bold text-lg">Lotus Wallet</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <SidebarFooter
          :collapsed="collapsed"
          :connection-status="connectionStatus"
        />
      </template>
    </UDashboardSidebar>

    <!-- Main Content -->
    <UDashboardPanel grow>
      <UDashboardNavbar>
        <template #leading>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>

        <template #trailing>
          <NavbarActions
            :connection-status="connectionStatus"
            @open-command-palette="commandPaletteOpen = true"
          />
        </template>
      </UDashboardNavbar>

      <div class="flex-1 overflow-auto">
        <!-- Network Banner -->
        <NetworkBanner v-if="!networkStore.isProduction" />

        <!-- Main Content Area -->
        <div class="p-4 md:p-6 pb-20 md:pb-6">
          <!-- SDK Loading State -->
          <AppLoadingState
            v-if="walletStore.loading && !walletStore.sdkReady"
            :message="walletStore.loadingMessage || 'Loading wallet...'"
            size="lg"
            class="min-h-[50vh]"
          />

          <!-- Page Content -->
          <slot v-else />
        </div>
      </div>

      <!-- Mobile Bottom Navigation -->
      <MobileBottomNav v-if="isMobile" :items="navigationItems" />
    </UDashboardPanel>

    <!-- Command Palette -->
    <CommandPalette v-model:open="commandPaletteOpen" />
  </UDashboardGroup>
</template>
```

---

## 3. New Components

### 3.1 Mobile Bottom Navigation

**File**: `components/layout/MobileBottomNav.vue`

```vue
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineProps<{
  items: NavigationMenuItem[]
}>()
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 md:hidden"
  >
    <div class="flex justify-around items-center h-16 px-2">
      <NuxtLink
        v-for="item in items"
        :key="item.label"
        :to="item.to"
        class="flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors"
        :class="[
          item.active
            ? 'text-primary bg-primary/10'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
      >
        <div class="relative">
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span
            v-if="item.badge"
            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {{ item.badge > 9 ? '9+' : item.badge }}
          </span>
        </div>
        <span class="text-xs mt-1 font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
```

### 3.2 Command Palette

**File**: `components/layout/CommandPalette.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useContactsStore } from '~/stores/contacts'

const open = defineModel<boolean>('open', { default: false })

const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const router = useRouter()

const searchQuery = ref('')

// Command groups
const commandGroups = computed(() => [
  {
    key: 'actions',
    label: 'Quick Actions',
    commands: [
      {
        id: 'send',
        label: 'Send Lotus',
        icon: 'i-lucide-send',
        shortcut: '⌘S',
        action: () => router.push('/transact/send'),
      },
      {
        id: 'receive',
        label: 'Receive Lotus',
        icon: 'i-lucide-qr-code',
        shortcut: '⌘R',
        action: () => router.push('/transact/receive'),
      },
      {
        id: 'scan',
        label: 'Scan QR Code',
        icon: 'i-lucide-scan',
        action: () => router.push('/transact/send?scan=true'),
      },
      {
        id: 'history',
        label: 'View History',
        icon: 'i-lucide-history',
        shortcut: '⌘H',
        action: () => router.push('/transact/history'),
      },
    ],
  },
  {
    key: 'contacts',
    label: 'Recent Contacts',
    commands: contactsStore.recentContacts.slice(0, 5).map(contact => ({
      id: `contact-${contact.id}`,
      label: contact.name,
      icon: 'i-lucide-user',
      subtitle: contact.address.slice(0, 20) + '...',
      action: () => router.push(`/transact/send?to=${contact.address}`),
    })),
  },
  {
    key: 'pages',
    label: 'Pages',
    commands: [
      {
        id: 'home',
        label: 'Home',
        icon: 'i-lucide-home',
        action: () => router.push('/'),
      },
      {
        id: 'contacts',
        label: 'Contacts',
        icon: 'i-lucide-users',
        action: () => router.push('/people/contacts'),
      },
      {
        id: 'p2p',
        label: 'P2P Network',
        icon: 'i-lucide-globe',
        action: () => router.push('/people/p2p'),
      },
      {
        id: 'explorer',
        label: 'Explorer',
        icon: 'i-lucide-blocks',
        action: () => router.push('/explore/explorer'),
      },
      {
        id: 'social',
        label: 'Social',
        icon: 'i-lucide-thumbs-up',
        action: () => router.push('/explore/social'),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'i-lucide-settings',
        action: () => router.push('/settings'),
      },
    ],
  },
])

// Filtered commands based on search
const filteredGroups = computed(() => {
  if (!searchQuery.value) return commandGroups.value

  const query = searchQuery.value.toLowerCase()
  return commandGroups.value
    .map(group => ({
      ...group,
      commands: group.commands.filter(
        cmd =>
          cmd.label.toLowerCase().includes(query) ||
          cmd.subtitle?.toLowerCase().includes(query),
      ),
    }))
    .filter(group => group.commands.length > 0)
})

function executeCommand(command: { action: () => void }) {
  command.action()
  open.value = false
  searchQuery.value = ''
}

// Close on escape
onKeyStroke('Escape', () => {
  if (open.value) {
    open.value = false
    searchQuery.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-xl' }">
    <div class="p-4">
      <!-- Search Input -->
      <div class="relative mb-4">
        <UIcon
          name="i-lucide-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search or type a command..."
          class="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg border-0 focus:ring-2 focus:ring-primary"
          autofocus
        />
        <kbd
          class="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded"
        >
          ESC
        </kbd>
      </div>

      <!-- Command Groups -->
      <div class="max-h-96 overflow-y-auto space-y-4">
        <div v-for="group in filteredGroups" :key="group.key">
          <div
            class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2"
          >
            {{ group.label }}
          </div>
          <div class="space-y-1">
            <button
              v-for="command in group.commands"
              :key="command.id"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              @click="executeCommand(command)"
            >
              <UIcon :name="command.icon" class="w-5 h-5 text-gray-500" />
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ command.label }}</div>
                <div
                  v-if="command.subtitle"
                  class="text-sm text-gray-500 truncate"
                >
                  {{ command.subtitle }}
                </div>
              </div>
              <kbd
                v-if="command.shortcut"
                class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded"
              >
                {{ command.shortcut }}
              </kbd>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredGroups.length === 0"
          class="text-center py-8 text-gray-500"
        >
          <UIcon
            name="i-lucide-search-x"
            class="w-12 h-12 mx-auto mb-2 opacity-50"
          />
          <p>No results found for "{{ searchQuery }}"</p>
        </div>
      </div>
    </div>
  </UModal>
</template>
```

### 3.3 Sidebar Footer

**File**: `components/layout/SidebarFooter.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'

defineProps<{
  collapsed: boolean
  connectionStatus: 'loading' | 'connecting' | 'connected' | 'disconnected'
}>()

const walletStore = useWalletStore()

const statusColor = computed(() => {
  switch (props.connectionStatus) {
    case 'connected':
      return 'success'
    case 'disconnected':
      return 'error'
    default:
      return 'warning'
  }
})

const statusLabel = computed(() => {
  switch (props.connectionStatus) {
    case 'connected':
      return 'Online'
    case 'disconnected':
      return 'Offline'
    case 'connecting':
      return 'Connecting...'
    default:
      return 'Loading...'
  }
})
</script>

<template>
  <div class="p-2 space-y-2">
    <!-- Connection Status -->
    <UBadge
      :color="statusColor"
      variant="subtle"
      size="sm"
      class="w-full justify-center"
    >
      <template #leading>
        <span class="relative flex h-2 w-2">
          <span
            v-if="connectionStatus === 'connected'"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
          />
          <span
            class="relative inline-flex rounded-full h-2 w-2"
            :class="{
              'bg-green-500': connectionStatus === 'connected',
              'bg-red-500': connectionStatus === 'disconnected',
              'bg-yellow-500':
                connectionStatus === 'connecting' ||
                connectionStatus === 'loading',
            }"
          />
        </span>
      </template>
      <span v-if="!collapsed">{{ statusLabel }}</span>
    </UBadge>

    <!-- Balance Preview -->
    <div
      v-if="!collapsed"
      class="text-center pt-2 border-t border-gray-200 dark:border-gray-800"
    >
      <div class="text-xs text-gray-500">Balance</div>
      <div class="font-mono font-semibold text-sm">
        {{ walletStore.formattedBalance }} XPI
      </div>
    </div>

    <!-- Command Palette Hint -->
    <div v-if="!collapsed" class="text-center text-xs text-gray-400">
      Press
      <kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs"
        >⌘K</kbd
      >
      for quick actions
    </div>
  </div>
</template>
```

### 3.4 Navbar Actions

**File**: `components/layout/NavbarActions.vue`

```vue
<script setup lang="ts">
import { useNetworkStore } from '~/stores/network'
import { useWalletStore } from '~/stores/wallet'

defineProps<{
  connectionStatus: 'loading' | 'connecting' | 'connected' | 'disconnected'
}>()

const emit = defineEmits<{
  openCommandPalette: []
}>()

const networkStore = useNetworkStore()
const walletStore = useWalletStore()
const colorMode = useColorMode()
const route = useRoute()

const networkSettingsUrl = computed(() => {
  if (route.path.startsWith('/settings')) {
    return '/settings/network'
  }
  return `/settings/network?from=${route.path}`
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Command Palette Button -->
    <UTooltip text="Quick actions (⌘K)">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-search"
        @click="emit('openCommandPalette')"
      />
    </UTooltip>

    <!-- Network Indicator -->
    <UTooltip
      :text="
        connectionStatus === 'connecting'
          ? 'Connecting to network...'
          : `${networkStore.displayName} - Click to change`
      "
    >
      <UButton
        :color="networkStore.isProduction ? 'neutral' : networkStore.color"
        :variant="networkStore.isProduction ? 'ghost' : 'soft'"
        size="sm"
        :to="networkSettingsUrl"
        class="gap-1.5"
      >
        <UIcon
          v-if="connectionStatus === 'connecting'"
          name="i-lucide-loader-2"
          class="w-4 h-4 animate-spin"
        />
        <UIcon
          v-else
          :name="walletStore.connected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'"
          class="w-4 h-4"
        />
        <UBadge
          v-if="!networkStore.isProduction"
          :color="networkStore.color"
          variant="solid"
          size="xs"
        >
          {{ networkStore.displayName }}
        </UBadge>
      </UButton>
    </UTooltip>

    <!-- Color Mode Toggle -->
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
      @click="
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
      "
    />

    <!-- Notifications (placeholder for Phase 11) -->
    <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-bell" />
  </div>
</template>
```

### 3.5 Network Banner

**File**: `components/layout/NetworkBanner.vue`

```vue
<script setup lang="ts">
import { useNetworkStore } from '~/stores/network'

const networkStore = useNetworkStore()
const route = useRoute()

const networkSettingsUrl = computed(() => {
  if (route.path.startsWith('/settings')) {
    return '/settings/network'
  }
  return `/settings/network?from=${route.path}`
})
</script>

<template>
  <div
    class="px-4 py-2 text-center text-sm font-medium"
    :class="{
      'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300':
        networkStore.isTestnet,
      'bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-300':
        networkStore.isRegtest,
    }"
  >
    <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 inline mr-1" />
    You are on <strong>{{ networkStore.displayName }}</strong
    >. Coins have no real value.
    <NuxtLink :to="networkSettingsUrl" class="underline ml-1">
      Switch network
    </NuxtLink>
  </div>
</template>
```

---

## 4. Page Layout Patterns

### 4.1 Standard Page Template

All pages should follow this pattern:

```vue
<script setup lang="ts">
// Define page meta
definePageMeta({
  title: 'Page Title',
})

// Page-specific logic
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header (optional hero card) -->
    <AppHeroCard
      icon="i-lucide-icon-name"
      title="Page Title"
      subtitle="Brief description of what this page does"
    />

    <!-- Main Content -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <!-- Content cards -->
    </div>
  </div>
</template>
```

### 4.2 Hub Page Template (for grouped navigation)

```vue
<script setup lang="ts">
definePageMeta({
  title: 'Hub Title',
})

const subPages = [
  {
    label: 'Sub Page 1',
    icon: 'i-lucide-icon',
    to: '/hub/sub1',
    description: 'Description',
  },
  {
    label: 'Sub Page 2',
    icon: 'i-lucide-icon',
    to: '/hub/sub2',
    description: 'Description',
  },
]
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-hub-icon"
      title="Hub Title"
      subtitle="Choose an action below"
    />

    <div class="grid gap-4 md:grid-cols-2">
      <AppActionCard
        v-for="page in subPages"
        :key="page.to"
        :icon="page.icon"
        :label="page.label"
        :description="page.description"
        :to="page.to"
      />
    </div>
  </div>
</template>
```

---

## 5. Implementation Checklist

### Layout Updates

- [ ] Update `layouts/default.vue` with new navigation structure
- [ ] Add mobile detection and responsive behavior
- [ ] Integrate command palette trigger

### New Components

- [ ] Create `components/layout/MobileBottomNav.vue`
- [ ] Create `components/layout/CommandPalette.vue`
- [ ] Create `components/layout/SidebarFooter.vue`
- [ ] Create `components/layout/NavbarActions.vue`
- [ ] Create `components/layout/NetworkBanner.vue`

### Keyboard Shortcuts

- [ ] Cmd+K: Open command palette
- [ ] Cmd+S: Go to Send
- [ ] Cmd+R: Go to Receive
- [ ] Cmd+H: Go to History
- [ ] Escape: Close modals/palette

### Testing

- [ ] Test mobile bottom navigation
- [ ] Test command palette search
- [ ] Test keyboard shortcuts
- [ ] Test breadcrumb navigation
- [ ] Test responsive breakpoints

---

## 6. Migration Notes

### Route Changes

| Old Route     | New Route                |
| ------------- | ------------------------ |
| `/send`       | `/transact/send`         |
| `/receive`    | `/transact/receive`      |
| `/history`    | `/transact/history`      |
| `/contacts`   | `/people/contacts`       |
| `/p2p`        | `/people/p2p`            |
| `/discover`   | `/people/p2p` (redirect) |
| `/explorer/*` | `/explore/explorer/*`    |
| `/social/*`   | `/explore/social/*`      |

### Redirects

Add redirects for old routes in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  routeRules: {
    '/send': { redirect: '/transact/send' },
    '/receive': { redirect: '/transact/receive' },
    '/history': { redirect: '/transact/history' },
    '/contacts': { redirect: '/people/contacts' },
    '/p2p': { redirect: '/people/p2p' },
    '/discover': { redirect: '/people/p2p' },
  },
})
```

---

## Next Phase

Once this phase is complete, proceed to [02_ONBOARDING_FLOW.md](./02_ONBOARDING_FLOW.md) to implement the first-time user experience.
