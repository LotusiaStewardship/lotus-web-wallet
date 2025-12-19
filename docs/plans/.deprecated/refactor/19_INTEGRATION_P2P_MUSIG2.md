# 19: Integration - P2P & MuSig2 Components

## Overview

This phase integrates the scaffolded P2P and MuSig2 components into their respective pages, replacing inline implementations with the new design system components.

---

## Part A: P2P Integration

### Current State

#### Existing Page (`pages/p2p.vue`)

- Comprehensive P2P management page
- Connection status, peer list, signing requests
- Already quite feature-rich

#### Scaffolded Components (`components/p2p/`)

- `HeroCard.vue` - P2P status hero
- `SignerList.vue` - Available signers list
- `SignerCard.vue` - Individual signer card
- `ActivityFeed.vue` - P2P activity events
- `IncomingRequests.vue` - Incoming signing requests
- `RequestList.vue` - Request management
- `SessionList.vue` - Active sessions
- `PeerGrid.vue` - Connected peers grid
- `QuickActions.vue` - P2P quick actions
- `OnboardingCard.vue` - P2P setup guide
- `SettingsPanel.vue` - P2P settings

### Integration Tasks

#### Phase 19.1: Fix Component Type Errors

- `SessionList.vue` - Fix dynamic color binding (string vs literal)
- `SignerCard.vue` - Verify prop types match store data

#### Phase 19.2: Integrate P2P Page

The existing `pages/p2p.vue` is already comprehensive. Integration involves:

1. Replace inline cards with design system components
2. Use `AppHeroCard` for header
3. Use `AppCard` for sections
4. Integrate `P2PSignerList`, `P2PActivityFeed`, etc.

```vue
<!-- pages/p2p.vue refactored -->
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Hero with connection status -->
    <P2PHeroCard />

    <!-- Quick Actions -->
    <P2PQuickActions v-if="p2pStore.isConnected" />

    <!-- Onboarding for new users -->
    <P2POnboardingCard v-if="!p2pStore.hasConnectedBefore" />

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Available Signers -->
      <P2PSignerList />

      <!-- Activity Feed -->
      <P2PActivityFeed />
    </div>

    <!-- Incoming Requests -->
    <P2PIncomingRequests v-if="p2pStore.incomingRequests.length" />

    <!-- Active Sessions -->
    <P2PSessionList v-if="musig2Store.activeSessions.length" />

    <!-- Settings -->
    <P2PSettingsPanel />
  </div>
</template>
```

---

## Part B: MuSig2 Integration

### Current State

#### Existing Usage

- MuSig2 functionality is spread across P2P page and settings
- Shared wallet management in settings

#### Scaffolded Components (`components/musig2/`)

- `SharedWalletList.vue` - List of shared wallets
- `SharedWalletCard.vue` - Individual wallet card
- `SharedWalletDetail.vue` - Wallet details view
- `CreateSharedWalletModal.vue` - Create new wallet
- `FundWalletModal.vue` - Fund shared wallet
- `ProposeSpendModal.vue` - Propose spending
- `SigningProgress.vue` - Signing session progress
- `TransactionPreview.vue` - Transaction preview

### Integration Tasks

#### Phase 19.3: Fix Component Type Errors

- `SigningProgress.vue` - Fix dynamic color binding
- `CreateSharedWalletModal.vue` - Fix Contact.publicKey reference
- `SharedWalletCard.vue` - Verify balance/amount types

#### Phase 19.4: Create MuSig2 Management Page

Consider creating a dedicated MuSig2 page or integrating into P2P:

**Option A: Dedicated Page (`pages/musig2.vue`)**

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-users"
      title="Shared Wallets"
      subtitle="Multi-signature wallet management"
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" @click="openCreateModal">
          Create Wallet
        </UButton>
      </template>
    </AppHeroCard>

    <Musig2SharedWalletList
      :wallets="musig2Store.sharedWallets"
      @select="openWalletDetail"
      @fund="openFundModal"
      @spend="openSpendModal"
    />

    <!-- Modals -->
    <Musig2CreateSharedWalletModal v-model:open="showCreateModal" />
    <Musig2FundWalletModal
      v-model:open="showFundModal"
      :wallet="selectedWallet"
    />
    <Musig2ProposeSpendModal
      v-model:open="showSpendModal"
      :wallet="selectedWallet"
    />
  </div>
</template>
```

**Option B: Section in P2P Page**
Add MuSig2 section to existing P2P page.

#### Phase 19.5: Integrate Signing Progress

Add signing progress indicator to active sessions:

```vue
<AppCard title="Active Signing Sessions" icon="i-lucide-pen-tool">
  <Musig2SigningProgress
    v-for="session in musig2Store.activeSessions"
    :key="session.id"
    :session="session"
    @complete="handleSessionComplete"
    @cancel="handleSessionCancel"
  />
</AppCard>
```

---

## Integration Checklist

### P2P

- [ ] Fix SessionList color type error
- [ ] Integrate P2PHeroCard
- [ ] Integrate P2PSignerList
- [ ] Integrate P2PActivityFeed
- [ ] Integrate P2PIncomingRequests
- [ ] Integrate P2PSessionList
- [ ] Verify connection flow works
- [ ] Verify signing requests work

### MuSig2

- [ ] Fix SigningProgress color type error
- [ ] Fix CreateSharedWalletModal Contact.publicKey
- [ ] Create or integrate MuSig2 management UI
- [ ] Integrate SharedWalletList
- [ ] Integrate signing modals
- [ ] Verify wallet creation works
- [ ] Verify funding works
- [ ] Verify spending proposals work

---

_Next: [20_CLEANUP_DEPRECATED.md](./20_CLEANUP_DEPRECATED.md)_
