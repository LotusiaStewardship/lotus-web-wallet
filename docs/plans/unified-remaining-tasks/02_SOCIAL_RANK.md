# Phase 2: Social/RANK Voting

## Overview

This phase implements the full Social/RANK voting experience. The social page placeholder exists; this phase adds profile search, inline voting, vote modals, and vote history.

**Priority**: P2 (Medium)
**Estimated Effort**: 2-3 days
**Dependencies**: Design system components, useRankApi composable, wallet store

---

## Goals

1. Profile search across platforms
2. Trending profiles display
3. Inline voting on profile cards
4. Vote modal with amount selection
5. Profile detail page
6. Vote history and receipts

---

## Current State

### Existing Pages

| Page                                           | Status     | Notes                   |
| ---------------------------------------------- | ---------- | ----------------------- |
| `pages/explore/social/index.vue`               | 🔲 Basic   | Placeholder with search |
| `pages/explore/social/[platform]/[handle].vue` | ❌ Missing | Profile detail page     |

### Existing Components

| Component                               | Status      | Notes                 |
| --------------------------------------- | ----------- | --------------------- |
| `components/social/SearchBar.vue`       | ✅ Complete | Platform filter       |
| `components/social/ProfileCard.vue`     | ✅ Complete | With vote actions     |
| `components/social/VoteModal.vue`       | ✅ Complete | Amount input, presets |
| `components/social/ActivityItem.vue`    | ✅ Complete | Vote activity display |
| `components/social/TrendingCard.vue`    | ✅ Complete | Trending list         |
| `components/social/ProfileStats.vue`    | ✅ Complete | Stats grid            |
| `components/social/VoteHistoryCard.vue` | ✅ Complete | Vote history list     |
| `components/social/PlatformIcon.vue`    | ✅ Complete | Platform icons        |

### Existing Composable

| Composable      | Status      | Notes                             |
| --------------- | ----------- | --------------------------------- |
| `useRankApi.ts` | ✅ Complete | API methods for RANK interactions |

---

## 1. Social Index Page Enhancement

### File: `pages/explore/social/index.vue`

#### Requirements

- [ ] Search bar with platform filter
- [ ] Trending profiles section
- [ ] Recent activity feed
- [ ] Search results display
- [ ] Vote modal integration
- [ ] Loading and error states

#### Component Structure

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <AppHeroCard
      icon="i-lucide-thumbs-up"
      title="Social"
      subtitle="Vote on content creators with RANK"
    />

    <!-- Search -->
    <SocialSearchBar
      v-model="searchQuery"
      :platform="selectedPlatform"
      @update:platform="selectedPlatform = $event"
      @search="handleSearch"
    />

    <!-- Search Results -->
    <AppCard v-if="searchResults.length" title="Search Results">
      <div class="space-y-3">
        <SocialProfileCard
          v-for="profile in searchResults"
          :key="profile.id"
          :profile="profile"
          @vote="openVoteModal"
        />
      </div>
    </AppCard>

    <!-- Loading State -->
    <AppLoadingState v-if="loading" message="Loading social data..." />

    <!-- Main Content -->
    <template v-else>
      <!-- Trending -->
      <SocialTrendingCard
        :profiles="trendingProfiles"
        @vote="openVoteModal"
        @view="navigateToProfile"
      />

      <!-- Recent Activity -->
      <AppCard title="Recent Activity" icon="i-lucide-activity">
        <div class="space-y-2">
          <SocialActivityItem
            v-for="activity in recentActivity"
            :key="activity.id"
            :activity="activity"
          />
        </div>
        <AppEmptyState
          v-if="!recentActivity.length"
          icon="i-lucide-activity"
          title="No recent activity"
          description="Votes will appear here"
        />
      </AppCard>
    </template>

    <!-- Vote Modal -->
    <SocialVoteModal
      v-model:open="showVoteModal"
      :profile="selectedProfile"
      @vote="handleVote"
    />
  </div>
</template>
```

---

## 2. Profile Detail Page

### File: `pages/explore/social/[platform]/[handle].vue`

#### Requirements

- [ ] Profile header with avatar and platform
- [ ] Rank position and vote percentage
- [ ] Vote action buttons (upvote/downvote)
- [ ] Stats grid (total votes, upvotes, downvotes)
- [ ] Vote history for this profile
- [ ] Share button
- [ ] Loading and error states

#### Component Structure

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Back Button -->
    <UButton icon="i-lucide-arrow-left" variant="ghost" to="/explore/social">
      Back to Social
    </UButton>

    <!-- Loading State -->
    <AppLoadingState v-if="loading" message="Loading profile..." />

    <!-- Error State -->
    <AppErrorState v-else-if="error" :message="error" @retry="fetchProfile" />

    <!-- Content -->
    <template v-else-if="profile">
      <!-- Profile Header -->
      <AppCard>
        <div class="flex items-center gap-6">
          <!-- Avatar -->
          <div class="relative">
            <img
              :src="profile.avatarUrl"
              :alt="profile.displayName"
              class="w-24 h-24 rounded-full"
            />
            <SocialPlatformIcon
              :platform="profile.platform"
              class="absolute -bottom-1 -right-1"
            />
          </div>

          <!-- Info -->
          <div class="flex-1">
            <h1 class="text-2xl font-bold">{{ profile.displayName }}</h1>
            <p class="text-gray-500">@{{ profile.handle }}</p>
            <div class="flex items-center gap-4 mt-2">
              <UBadge color="primary" size="lg">
                Rank #{{ profile.rank }}
              </UBadge>
              <span class="text-lg font-semibold" :class="votePercentColor">
                {{ profile.votePercent }}%
              </span>
            </div>
          </div>

          <!-- Vote Buttons -->
          <div class="flex flex-col gap-2">
            <UButton color="success" size="lg" @click="openVoteModal('upvote')">
              <UIcon name="i-lucide-thumbs-up" class="mr-2" />
              Upvote
            </UButton>
            <UButton color="error" size="lg" @click="openVoteModal('downvote')">
              <UIcon name="i-lucide-thumbs-down" class="mr-2" />
              Downvote
            </UButton>
          </div>
        </div>
      </AppCard>

      <!-- Stats -->
      <SocialProfileStats :profile="profile" />

      <!-- Vote History -->
      <SocialVoteHistoryCard
        :votes="voteHistory"
        :loading="loadingHistory"
        @load-more="loadMoreHistory"
      />
    </template>

    <!-- Vote Modal -->
    <SocialVoteModal
      v-model:open="showVoteModal"
      :profile="profile"
      :vote-type="voteType"
      @vote="handleVote"
    />
  </div>
</template>
```

---

## 3. Vote Flow

### Vote Modal Enhancement

The existing `SocialVoteModal.vue` should support:

- [ ] Profile preview (avatar, name, platform)
- [ ] Vote type indicator (upvote/downvote)
- [ ] Amount input with XPI suffix
- [ ] Preset amount buttons (10, 50, 100, 500 XPI)
- [ ] Balance display
- [ ] Burn warning alert
- [ ] Confirmation step
- [ ] Success state with receipt

### Vote Confirmation

```typescript
interface VoteReceipt {
  txid: string
  profile: {
    platform: string
    handle: string
    displayName: string
  }
  voteType: 'upvote' | 'downvote'
  amount: bigint
  timestamp: number
}
```

---

## 4. Vote History

### User's Vote History

Add a section to show the user's own voting history:

#### Requirements

- [ ] List of votes cast by user
- [ ] Filter by vote type (all/upvotes/downvotes)
- [ ] Sort by date or amount
- [ ] Export functionality
- [ ] Click to view profile

### Store Integration

```typescript
// In wallet store or dedicated votes store
interface VoteHistoryState {
  votes: VoteReceipt[]
  loading: boolean
  hasMore: boolean
}

// Actions
async function fetchVoteHistory(page: number): Promise<VoteReceipt[]>
async function castVote(
  profile: Profile,
  type: 'upvote' | 'downvote',
  amount: bigint,
): Promise<VoteReceipt>
```

---

## 5. Implementation Checklist

### Social Index Page

- [ ] Enhance `pages/explore/social/index.vue`
- [ ] Integrate search with platform filter
- [ ] Add trending profiles section
- [ ] Add recent activity feed
- [ ] Add vote modal integration
- [ ] Add loading/error states
- [ ] Test search functionality

### Profile Detail Page

- [ ] Create `pages/explore/social/[platform]/[handle].vue`
- [ ] Add profile header with avatar
- [ ] Add rank and vote percentage display
- [ ] Add vote action buttons
- [ ] Add stats grid
- [ ] Add vote history for profile
- [ ] Add share button
- [ ] Add loading/error states
- [ ] Test with various profiles

### Vote Flow

- [ ] Verify VoteModal has all required features
- [ ] Add confirmation step
- [ ] Add success state with receipt
- [ ] Integrate with wallet store for balance
- [ ] Integrate with RANK API for voting
- [ ] Test vote flow end-to-end

### Vote History

- [ ] Add user vote history section
- [ ] Add filter by vote type
- [ ] Add sort options
- [ ] Add export functionality
- [ ] Test history display

---

## 6. API Integration

### useRankApi Methods Required

```typescript
interface RankApi {
  // Search
  searchProfiles(query: string, platform?: string): Promise<Profile[]>

  // Trending
  getTrendingProfiles(limit?: number): Promise<Profile[]>

  // Profile
  getProfile(platform: string, handle: string): Promise<Profile>
  getProfileVoteHistory(
    platform: string,
    handle: string,
    page: number,
  ): Promise<Vote[]>

  // Activity
  getRecentActivity(limit?: number): Promise<Activity[]>

  // Voting
  castVote(
    platform: string,
    handle: string,
    type: 'upvote' | 'downvote',
    amount: bigint,
  ): Promise<VoteReceipt>

  // User history
  getUserVoteHistory(page: number): Promise<VoteReceipt[]>
}
```

---

## 7. Testing

### Manual Testing

- [ ] Search for profiles by name
- [ ] Filter search by platform
- [ ] View trending profiles
- [ ] Navigate to profile detail
- [ ] Cast upvote with various amounts
- [ ] Cast downvote with various amounts
- [ ] View vote receipt
- [ ] View profile vote history
- [ ] View user vote history
- [ ] Share profile

### Edge Cases

- [ ] Profile not found
- [ ] Insufficient balance for vote
- [ ] Network error during vote
- [ ] Very long profile names
- [ ] Profiles with no votes

---

## 8. Cross-Feature Integration

### 8.1 Wallet Integration

Connect voting to wallet:

- [ ] Show vote transactions in wallet history with profile context
- [ ] Add "Vote" quick action on wallet home (if balance sufficient)
- [ ] Show total RANK burned in wallet stats

### 8.2 Contact Integration

Link profiles to contacts:

- [ ] If profile address matches a contact, show contact name
- [ ] "Add to Contacts" from profile page
- [ ] Show voting history with contact in contact detail

### 8.3 Explorer Integration

Link to explorer for transparency:

- [ ] Link vote transactions to explorer
- [ ] Show on-chain vote history
- [ ] Verify vote amounts on-chain

### 8.4 Unified Activity Feed

Votes should appear in global activity:

- [ ] Show user's votes in wallet activity
- [ ] Show votes from contacts in social activity
- [ ] Notification when someone votes on a profile you follow

---

_End of Phase 2_
