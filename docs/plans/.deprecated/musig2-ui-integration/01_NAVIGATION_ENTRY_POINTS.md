# 01: Navigation & Entry Points

## Overview

This document defines how users discover and access MuSig2 shared wallet features. The goal is to integrate shared wallets naturally into the existing navigation without overwhelming users who don't need multi-signature functionality.

---

## Current Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Current Navigation (Bottom Tabs)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Home]     [Transact]     [People]     [Explore]     [Settings]            │
│                                                                             │
│  Home:      Wallet balance, quick actions                                   │
│  Transact:  Send, Receive, History                                          │
│  People:    Contacts, P2P                                                   │
│  Explore:   Explorer, Social                                                │
│  Settings:  App settings                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Proposed Entry Points

### Entry Point 1: People Section (Primary)

The "People" section is the natural home for shared wallets since they involve collaboration with contacts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  People Section - Updated Structure                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /people/                                                                   │
│  ├── index.vue          # People hub with overview                          │
│  ├── contacts.vue       # Contact management                                │
│  ├── p2p.vue            # P2P network & signers                             │
│  └── shared-wallets/    # NEW: Shared wallets section                       │
│      ├── index.vue      # Shared wallets list                               │
│      └── [id].vue       # Wallet detail (dynamic route)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Entry Point 2: Home Page Quick Action

Add "Shared Wallets" to the home page quick actions for easy access.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Home Page Quick Actions                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │  Send   │  │ Receive │  │ History │  │ Shared  │  ← NEW                  │
│  │   ↑     │  │   ↓     │  │   📋    │  │   👥    │                        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Entry Point 3: P2P Page Integration

The P2P page should prominently feature shared wallet creation as a primary use case.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  P2P Page - Quick Actions                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📡 What would you like to do?                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ 🔐 Create   │ │ 🔀 Join     │ │ 🤝 Become   │                           │
│  │ Shared      │ │ CoinJoin    │ │ a Signer    │                           │
│  │ Wallet      │ │             │ │             │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│        ↓                                                                    │
│  Opens CreateSharedWalletModal or navigates to /people/shared-wallets       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## People Hub Redesign

The People index page should serve as a hub showing all collaborative features.

### Current State

```vue
<!-- pages/people/index.vue - Current -->
<template>
  <div>
    <!-- Simple redirect or minimal content -->
  </div>
</template>
```

### Target State

```vue
<!-- pages/people/index.vue - Target -->
<script setup lang="ts">
const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()

const stats = computed(() => ({
  contacts: contactStore.contactList.length,
  sharedWallets: musig2Store.sharedWallets.length,
  onlineSigners: musig2Store.onlineSigners.length,
  pendingRequests: musig2Store.pendingSessions.length,
}))
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 p-4">
    <!-- Hero -->
    <AppHeroCard
      icon="i-lucide-users"
      title="People"
      subtitle="Contacts, shared wallets, and P2P collaboration"
    />

    <!-- Pending Requests Alert -->
    <UAlert
      v-if="stats.pendingRequests > 0"
      color="warning"
      icon="i-lucide-bell"
      :title="`${stats.pendingRequests} pending signing request${
        stats.pendingRequests > 1 ? 's' : ''
      }`"
      :actions="[{ label: 'View', click: () => navigateTo('/people/p2p') }]"
    />

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink to="/people/contacts">
        <UCard class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="text-center">
            <UIcon name="i-lucide-contact" class="w-8 h-8 text-primary mb-2" />
            <p class="text-2xl font-bold">{{ stats.contacts }}</p>
            <p class="text-sm text-muted">Contacts</p>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/people/shared-wallets">
        <UCard class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="text-center">
            <UIcon name="i-lucide-shield" class="w-8 h-8 text-primary mb-2" />
            <p class="text-2xl font-bold">{{ stats.sharedWallets }}</p>
            <p class="text-sm text-muted">Shared Wallets</p>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/people/p2p">
        <UCard class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="text-center">
            <UIcon name="i-lucide-radio" class="w-8 h-8 text-primary mb-2" />
            <p class="text-2xl font-bold">{{ stats.onlineSigners }}</p>
            <p class="text-sm text-muted">Online Signers</p>
          </div>
        </UCard>
      </NuxtLink>

      <UCard class="bg-muted/30">
        <div class="text-center">
          <UIcon name="i-lucide-wifi" class="w-8 h-8 text-muted mb-2" />
          <p class="text-2xl font-bold">
            {{ p2pStore.isConnected ? 'Online' : 'Offline' }}
          </p>
          <p class="text-sm text-muted">P2P Status</p>
        </div>
      </UCard>
    </div>

    <!-- Section Links -->
    <div class="space-y-3">
      <NuxtLink to="/people/contacts" class="block">
        <UCard class="hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
            >
              <UIcon name="i-lucide-contact" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium">Contacts</p>
              <p class="text-sm text-muted">Manage your address book</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/people/shared-wallets" class="block">
        <UCard class="hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
            >
              <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium">Shared Wallets</p>
              <p class="text-sm text-muted">
                Multi-signature wallets with contacts
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/people/p2p" class="block">
        <UCard class="hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
            >
              <UIcon name="i-lucide-radio" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium">P2P Network</p>
              <p class="text-sm text-muted">Discover signers and collaborate</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
```

---

## Shared Wallets in Wallet Overview

Shared wallets should also appear in the main wallet balance display on the home page.

### Home Page Balance Section

```vue
<!-- In pages/index.vue - Add shared wallets summary -->
<template>
  <div class="space-y-6">
    <!-- Personal Wallet Balance -->
    <WalletBalanceCard :balance="walletStore.balance" />

    <!-- Shared Wallets Summary (if any exist) -->
    <UCard v-if="musig2Store.sharedWallets.length > 0">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Shared Wallets</span>
          </div>
          <NuxtLink to="/people/shared-wallets">
            <UButton variant="ghost" size="xs">View All</UButton>
          </NuxtLink>
        </div>
      </template>

      <div class="space-y-3">
        <Musig2SharedWalletCard
          v-for="wallet in musig2Store.sharedWallets.slice(0, 3)"
          :key="wallet.id"
          :wallet="wallet"
          compact
          @click="navigateTo(`/people/shared-wallets/${wallet.id}`)"
        />

        <p
          v-if="musig2Store.sharedWallets.length > 3"
          class="text-sm text-muted text-center"
        >
          +{{ musig2Store.sharedWallets.length - 3 }} more wallets
        </p>
      </div>

      <!-- Total Shared Balance -->
      <template #footer>
        <div class="flex justify-between items-center">
          <span class="text-sm text-muted">Total Shared Balance</span>
          <span class="font-semibold">
            {{ formatXPI(musig2Store.totalSharedBalance) }}
          </span>
        </div>
      </template>
    </UCard>
  </div>
</template>
```

---

## Navigation Badge for Pending Requests

Show a badge on the People tab when there are pending signing requests.

### Implementation

```vue
<!-- In layouts/default.vue or navigation component -->
<script setup lang="ts">
const musig2Store = useMuSig2Store()

const pendingCount = computed(() => musig2Store.pendingSessions.length)
</script>

<template>
  <nav>
    <!-- ... other nav items ... -->

    <NuxtLink to="/people" class="relative">
      <UIcon name="i-lucide-users" />
      <span>People</span>

      <!-- Pending requests badge -->
      <UBadge
        v-if="pendingCount > 0"
        color="red"
        size="xs"
        class="absolute -top-1 -right-1"
      >
        {{ pendingCount }}
      </UBadge>
    </NuxtLink>
  </nav>
</template>
```

---

## Route Configuration

### New Routes

```typescript
// nuxt.config.ts or pages structure
// These routes are auto-generated from the pages/ folder structure

// /people/shared-wallets        → pages/people/shared-wallets/index.vue
// /people/shared-wallets/:id    → pages/people/shared-wallets/[id].vue
```

### Route Guards

```typescript
// middleware/musig2-init.ts
export default defineNuxtRouteMiddleware(async to => {
  // Ensure MuSig2 store is initialized for shared wallet routes
  if (to.path.startsWith('/people/shared-wallets')) {
    const musig2Store = useMuSig2Store()
    const p2pStore = useP2PStore()

    // P2P must be initialized first
    if (!p2pStore.initialized) {
      // Could redirect to P2P setup or show warning
      console.warn('P2P not initialized for MuSig2 routes')
    }

    // Initialize MuSig2 if needed
    if (!musig2Store.initialized && p2pStore.initialized) {
      try {
        await musig2Store.initialize()
      } catch (e) {
        console.error('Failed to initialize MuSig2:', e)
      }
    }
  }
})
```

---

## Breadcrumb Navigation

Implement breadcrumbs for the shared wallets section.

```vue
<!-- components/musig2/Breadcrumbs.vue -->
<script setup lang="ts">
const route = useRoute()
const musig2Store = useMuSig2Store()

const breadcrumbs = computed(() => {
  const items = [
    { label: 'People', to: '/people' },
    { label: 'Shared Wallets', to: '/people/shared-wallets' },
  ]

  // Add wallet name if on detail page
  if (route.params.id) {
    const wallet = musig2Store.sharedWallets.find(w => w.id === route.params.id)
    if (wallet) {
      items.push({ label: wallet.name, to: route.path })
    }
  }

  return items
})
</script>

<template>
  <UBreadcrumb :items="breadcrumbs" />
</template>
```

---

## Implementation Checklist

### Phase 1: Route Structure

- [ ] Create `pages/people/shared-wallets/index.vue`
- [ ] Create `pages/people/shared-wallets/[id].vue`
- [ ] Update `pages/people/index.vue` with hub design

### Phase 2: Navigation Integration

- [ ] Add shared wallets link to People hub
- [ ] Add quick action to home page
- [ ] Add pending requests badge to navigation
- [ ] Implement breadcrumb navigation

### Phase 3: P2P Integration

- [ ] Add "Create Shared Wallet" to P2P quick actions
- [ ] Link P2P signers to shared wallet creation

### Phase 4: Home Page Integration

- [ ] Add shared wallets summary card to home page
- [ ] Show total shared balance

---

## Files to Create/Modify

| File                                    | Action | Description                             |
| --------------------------------------- | ------ | --------------------------------------- |
| `pages/people/index.vue`                | Modify | Add hub design with shared wallets link |
| `pages/people/shared-wallets/index.vue` | Create | Shared wallets list page                |
| `pages/people/shared-wallets/[id].vue`  | Create | Wallet detail page                      |
| `pages/index.vue`                       | Modify | Add shared wallets summary              |
| `layouts/default.vue`                   | Modify | Add pending requests badge              |
| `components/musig2/Breadcrumbs.vue`     | Create | Breadcrumb navigation                   |

---

_Next: [02_SHARED_WALLETS_PAGE.md](./02_SHARED_WALLETS_PAGE.md)_
