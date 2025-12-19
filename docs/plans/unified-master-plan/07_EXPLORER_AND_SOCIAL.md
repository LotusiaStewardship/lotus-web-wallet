# Phase 7: Explorer and Social

## Overview

This phase implements the Explorer detail pages and Social/RANK voting UI. These features are largely independent of the P2P/MuSig2 track and can be developed in parallel with Phases 4-6.

**Priority**: P1 (High)
**Estimated Effort**: 4-6 days
**Dependencies**: Phase 1 (Infrastructure Foundation)

---

## Source Phases

| Source Plan             | Phase | Component             |
| ----------------------- | ----- | --------------------- |
| unified-remaining-tasks | 1     | Explorer Detail Pages |
| unified-remaining-tasks | 2     | Social/RANK Voting    |

---

## Tasks

### 7.1 Transaction Detail Page

**Source**: unified-remaining-tasks/01_EXPLORER_DETAIL.md
**Effort**: 1 day

#### Page Enhancement

- [ ] Enhance `pages/explore/explorer/tx/[txid].vue`

  ```vue
  <script setup lang="ts">
  const route = useRoute()
  const txid = computed(() => route.params.txid as string)

  const {
    data: tx,
    pending,
    error,
  } = await useChronikApi().fetchTransaction(txid.value)
  </script>
  ```

#### Features

- [ ] Transaction summary card

  - Type icon (coinbase, rank, burn, transfer)
  - Status badge (confirmed/unconfirmed)
  - Confirmation count
  - Block height with link
  - Timestamp

- [ ] Input/output lists

  - Use ExplorerAddressDisplay for addresses
  - Show amounts
  - Highlight user's addresses
  - Show OP_RETURN data decoded

- [ ] OP_RETURN display

  - Raw hex
  - Decoded LOKAD ID if present
  - RANK data if voting transaction

- [ ] Raw hex view (collapsible)

  - Full transaction hex
  - Copy button

- [ ] Copy/share buttons

  - Copy txid
  - Share URL

- [ ] Loading/error states
  - Skeleton while loading
  - Error message with retry

---

### 7.2 Address Detail Page

**Effort**: 1 day

#### Page Enhancement

- [ ] Enhance `pages/explore/explorer/address/[address].vue`

#### Features

- [ ] Address summary card

  - Balance display (hero style)
  - Address fingerprint
  - Contact name if known
  - "You" badge if own address

- [ ] QR code display

  - Scannable QR
  - Copy address button

- [ ] Transaction history with pagination

  - Use ActivityItem-style display
  - Infinite scroll or pagination
  - Show sent/received indicator

- [ ] Filter by sent/received

  - Tab or toggle filter
  - Count for each type

- [ ] "Add to contacts" button

  - Use AddToContactButton component
  - Pre-fill address

- [ ] Copy/share buttons
- [ ] Loading/error states

---

### 7.3 Block Detail Page

**Effort**: 0.5 days

#### Page Enhancement

- [ ] Enhance `pages/explore/explorer/block/[height].vue`

#### Features

- [ ] Block summary card

  - Block height (hero)
  - Block hash (truncated with copy)
  - Timestamp
  - Miner address (with ExplorerAddressDisplay)

- [ ] Stats grid

  - Transaction count
  - Total burned
  - Size
  - Difficulty

- [ ] Prev/next navigation

  - Previous block button
  - Next block button
  - Jump to height input

- [ ] Transaction list with pagination

  - Use ExplorerTxItem components
  - Pagination controls

- [ ] Copy/share buttons
- [ ] Loading/error states

---

### 7.4 Mempool View

**Effort**: 0.5 days

#### Explorer Index Enhancement

- [ ] Add mempool section to `pages/explore/explorer/index.vue`

  ```vue
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <span>Mempool</span>
        <UBadge>{{ mempoolTxs.length }} pending</UBadge>
      </div>
    </template>
    
    <div class="divide-y divide-default">
      <ExplorerTxItem
        v-for="tx in mempoolTxs"
        :key="tx.txid"
        :tx="tx"
        compact
      />
    </div>
  </UCard>
  ```

- [ ] Add auto-refresh toggle
- [ ] Show pending transaction list

---

### 7.5 Share Functionality

**Effort**: 0.5 days

#### useShare Composable

- [ ] Create `composables/useShare.ts`

  ```typescript
  export function useShare() {
    const canShare = computed(
      () => typeof navigator !== 'undefined' && 'share' in navigator,
    )

    async function share(data: { title: string; text?: string; url: string }) {
      if (canShare.value) {
        await navigator.share(data)
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(data.url)
        // Show toast
      }
    }

    return { canShare, share }
  }
  ```

- [ ] Integrate into all detail pages

---

### 7.6 Social Index Page

**Source**: unified-remaining-tasks/02_SOCIAL_RANK.md
**Effort**: 1 day

#### Page Enhancement

- [ ] Enhance `pages/explore/social/index.vue`

#### Features

- [ ] Search with platform filter

  - Search input
  - Platform dropdown (Twitter, YouTube, etc.)
  - Search results display

- [ ] Trending profiles section

  - Top ranked profiles
  - Biggest movers (up/down)

- [ ] Recent activity feed

  - Latest votes
  - Use SocialActivityItem

- [ ] Vote modal integration

  - Quick vote from search results
  - Opens VoteModal

- [ ] Loading/error states

---

### 7.7 Profile Detail Page

**Effort**: 1 day

#### Page Creation/Enhancement

- [ ] Create/enhance `pages/explore/social/[platform]/[handle].vue`

#### Features

- [ ] Profile header

  - Large avatar
  - Platform name and handle
  - External link to profile
  - Verified badge if applicable

- [ ] Rank and vote display

  - Current rank position
  - Total votes (up/down)
  - Vote percentage/ratio
  - Rank change indicator

- [ ] Vote action buttons

  - Upvote button
  - Downvote button
  - Opens VoteModal with pre-selected profile

- [ ] Stats grid

  - Total burned on profile
  - Number of voters
  - First vote date
  - Last vote date

- [ ] Vote history for profile

  - Recent votes on this profile
  - Voter addresses (with ExplorerAddressDisplay)

- [ ] Share button
- [ ] Loading/error states

---

### 7.8 Vote Flow

**Effort**: 1 day

#### VoteModal Verification

- [ ] Verify VoteModal has all required features

  - Profile selection (if not pre-selected)
  - Vote type (up/down)
  - Amount input
  - Balance display
  - Fee estimation

- [ ] Add confirmation step

  ```vue
  <template>
    <!-- Step 1: Configure -->
    <div v-if="step === 'configure'">
      <!-- Vote configuration -->
    </div>

    <!-- Step 2: Confirm -->
    <div v-if="step === 'confirm'">
      <p>You are about to vote:</p>
      <p>{{ voteType }} on {{ profile.name }}</p>
      <p>Amount: {{ amount }} XPI</p>
      <p>Fee: {{ fee }} XPI</p>
      <UButton @click="submitVote">Confirm Vote</UButton>
    </div>

    <!-- Step 3: Success -->
    <div v-if="step === 'success'">
      <UIcon name="i-heroicons-check-circle" class="text-green-500 w-16 h-16" />
      <p>Vote submitted!</p>
      <p>Transaction: {{ txid }}</p>
    </div>
  </template>
  ```

- [ ] Add success state with receipt

  - Transaction ID with link
  - Amount voted
  - "View Transaction" button

- [ ] Integrate with wallet store for balance
- [ ] Integrate with RANK API for voting

---

### 7.9 Vote History

**Effort**: 0.5 days

#### User Vote History

- [ ] Add user vote history section (in social index or separate page)

  - List of user's votes
  - Profile, amount, date
  - Link to transaction

- [ ] Add filter by vote type

  - All / Upvotes / Downvotes

- [ ] Add sort options

  - Date (newest/oldest)
  - Amount (highest/lowest)

- [ ] Add export functionality
  - Export as CSV
  - Include txid, profile, amount, date

---

## File Changes Summary

### New Files

| File                                           | Purpose             |
| ---------------------------------------------- | ------------------- |
| `composables/useShare.ts`                      | Share functionality |
| `pages/explore/social/[platform]/[handle].vue` | Profile detail page |

### Modified Files

| File                                           | Changes                      |
| ---------------------------------------------- | ---------------------------- |
| `pages/explore/explorer/tx/[txid].vue`         | Full detail view             |
| `pages/explore/explorer/address/[address].vue` | Full detail view             |
| `pages/explore/explorer/block/[height].vue`    | Full detail view             |
| `pages/explore/explorer/index.vue`             | Mempool section              |
| `pages/explore/social/index.vue`               | Search, trending, activity   |
| `components/social/VoteModal.vue`              | Confirmation, success states |

---

## UI Specifications

### Transaction Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Explorer                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔄 Transfer                                          ✅ Confirmed   │   │
│  │  ──────────────────────────────────────────────────────────────────  │   │
│  │  Block: 123,456                    12 confirmations                  │   │
│  │  Time: Dec 11, 2024 10:30 AM                                        │   │
│  │                                                                      │   │
│  │  txid: abc123...def456                                    [Copy]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  INPUTS (2)                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Alice (Lk9W·oSb8)                              1,000.00 XPI        │   │
│  │  Bob (Lm3X·pQr9)                                  500.00 XPI        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUTS (2)                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Charlie (Ln7Y·sT0a)                           1,400.00 XPI        │   │
│  │  Change (Lk9W·oSb8)                               99.50 XPI        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [▼ Show Raw Hex]                                              [Share]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Profile Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Social                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │        ┌─────┐                                                       │   │
│  │        │ 👤  │  @elonmusk                                           │   │
│  │        └─────┘  Twitter                              [View Profile] │   │
│  │                                                                      │   │
│  │  Rank #42                                                           │   │
│  │  ████████████████░░░░░░░░░░░░░░░░  78% positive                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐                                   │
│  │  👍 Upvote      │ │  👎 Downvote    │                                   │
│  └─────────────────┘ └─────────────────┘                                   │
│                                                                             │
│  STATS                                                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐            │
│  │ Total Burned │ Voters       │ First Vote   │ Last Vote    │            │
│  │ 50,000 XPI   │ 234          │ Jan 1, 2024  │ Dec 11, 2024 │            │
│  └──────────────┴──────────────┴──────────────┴──────────────┘            │
│                                                                             │
│  RECENT VOTES                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  👍 Lk9W·oSb8 voted 100 XPI                           2 hours ago   │   │
│  │  👎 Lm3X·pQr9 voted 50 XPI                            5 hours ago   │   │
│  │  👍 Ln7Y·sT0a voted 200 XPI                           1 day ago     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

### Explorer Detail Pages

- [ ] Transaction detail shows all info
- [ ] Address detail shows balance and history
- [ ] Block detail shows stats and transactions
- [ ] Mempool section shows pending txs
- [ ] Share functionality works

### Social/RANK

- [ ] Social search finds profiles
- [ ] Profile detail shows all info
- [ ] Vote modal has confirmation step
- [ ] Vote submission works
- [ ] Vote history displays correctly

### Cross-Feature

- [ ] ExplorerAddressDisplay used consistently
- [ ] Contact integration works
- [ ] Navigation between pages works
- [ ] Loading/error states present

---

## Notes

- This phase can run in parallel with P2P/MuSig2 phases
- Uses existing design patterns from wallet UI
- All addresses use ExplorerAddressDisplay for consistency
- Share functionality has clipboard fallback

---

## Next Phase

After completing Phase 7, proceed to:

- **Phase 8**: Push and Browser Notifications
- **Phase 9**: Contact and Cross-Feature Integration

---

_Source: unified-remaining-tasks/01_EXPLORER_DETAIL.md, unified-remaining-tasks/02_SOCIAL_RANK.md_
