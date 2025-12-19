# 18: Integration - Explorer & Social Components

## Overview

This phase integrates the scaffolded explorer and social components into their respective pages, replacing inline implementations with the new design system components.

---

## Part A: Explorer Integration

### Current State

#### Existing Pages

- `pages/explorer/index.vue` - Explorer home
- `pages/explorer/address/[address].vue` - Address details
- `pages/explorer/block/[hashOrHeight].vue` - Block details
- `pages/explorer/tx/[txid].vue` - Transaction details

#### Scaffolded Components (`components/explorer/`)

- `SearchBar.vue` - Search with suggestions
- `NetworkStats.vue` - Network statistics grid
- `RecentBlocksCard.vue` - Recent blocks list
- `MempoolCard.vue` - Mempool transactions
- `TxItem.vue` / `ExplorerTxItem.vue` - Transaction list item
- `TxDetail.vue` - Transaction detail view
- `AddressDisplay.vue` / `ExplorerAddressDisplay.vue` - Address display
- `BlockCard.vue` / `BlockItem.vue` - Block display
- `AmountXPI.vue` - Amount formatting

### Integration Tasks

#### Phase 18.1: Resolve Duplicate Components

Fix the duplicate component warnings:

- `ExplorerAddressDisplay` vs `AddressDisplay`
- `ExplorerTxItem` vs `TxItem`

**Resolution:** Keep the prefixed versions, remove duplicates.

#### Phase 18.2: Fix Component Type Errors

- `MempoolCard.vue` - Fix transaction prop type
- `SearchBar.vue` - Fix `setTimeout` reference
- `TxDetailModal.vue` - Fix `width` property in ui prop

#### Phase 18.3: Integrate Explorer Home Page

```vue
<!-- pages/explorer/index.vue -->
<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-search"
      title="Lotus Explorer"
      subtitle="Search addresses, transactions, and blocks"
    />

    <ExplorerSearchBar @search="handleSearch" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ExplorerNetworkStats />
      <ExplorerRecentBlocksCard />
    </div>

    <ExplorerMempoolCard />
  </div>
</template>
```

---

## Part B: Social Integration

### Current State

#### Existing Pages

- `pages/social/index.vue` - Social/RANK home
- `pages/social/[platform]/[profileId]/index.vue` - Profile details

#### Scaffolded Components (`components/social/`)

- `SearchBar.vue` - Profile search
- `ProfileCard.vue` / `SocialProfileCard.vue` - Profile display
- `ActivityItem.vue` / `SocialActivityItem.vue` - Vote activity
- `VoteModal.vue` - Vote casting modal
- `VoteButton.vue` - Vote action button
- `TrendingCard.vue` - Trending profiles
- `PlatformIcon.vue` - Platform icons
- `ProfileLink.vue` - Profile link display
- `ProfileStats.vue` - Profile statistics

### Integration Tasks

#### Phase 18.4: Resolve Duplicate Components

Fix the duplicate component warnings:

- `SocialActivityItem` vs `ActivityItem`
- `SocialProfileCard` vs `ProfileCard`

**Resolution:** Keep the prefixed versions, remove duplicates.

#### Phase 18.5: Fix Component Type Errors

The social pages have significant type mismatches:

- `pages/social/index.vue` - ProfileCard and ActivityItem prop mismatches
- `pages/social/[platform]/[profileId]/index.vue` - ActivityItem prop mismatch

**Issue:** Components expect `profile` and `activity` props with specific structures, but pages pass individual properties.

**Fix:** Update pages to pass structured props:

```vue
<!-- Before -->
<SocialProfileCard
  :platform="profile.platform"
  :profileId="profile.profileId"
  :ranking="profile.ranking"
/>

<!-- After -->
<SocialProfileCard
  :profile="{
    id: profile.profileId,
    platform: profile.platform,
    profileId: profile.profileId,
    displayName: profile.profileId,
    rank: parseInt(profile.ranking),
    totalVotes: 0,
    positiveVotes: profile.satsPositive,
    negativeVotes: profile.satsNegative,
  }"
/>
```

#### Phase 18.6: Integrate Social Home Page

```vue
<!-- pages/social/index.vue -->
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-thumbs-up"
      title="RANK"
      subtitle="Decentralized reputation system"
    />

    <SocialSearchBar @search="handleSearch" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SocialTrendingCard :profiles="trendingProfiles" />

      <AppCard title="Recent Activity" icon="i-lucide-activity">
        <SocialActivityItem
          v-for="activity in recentActivity"
          :key="activity.txid"
          :activity="formatActivity(activity)"
        />
      </AppCard>
    </div>
  </div>
</template>
```

---

## Integration Checklist

### Explorer

- [ ] Resolve duplicate component names
- [ ] Fix MempoolCard type errors
- [ ] Fix SearchBar type errors
- [ ] Fix TxDetailModal type errors
- [ ] Integrate explorer home page
- [ ] Verify search works
- [ ] Verify address/tx/block pages work

### Social

- [ ] Resolve duplicate component names
- [ ] Fix ProfileCard prop structure
- [ ] Fix ActivityItem prop structure
- [ ] Integrate social home page
- [ ] Verify profile search works
- [ ] Verify voting works

---

_Next: [19_INTEGRATION_P2P_MUSIG2.md](./19_INTEGRATION_P2P_MUSIG2.md)_
