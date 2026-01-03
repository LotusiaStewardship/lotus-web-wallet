# Phase 11: Bugfixes & Improvements

## Overview

Phase 11 addresses issues discovered during Phase 10 verification testing. Sub-phases are organized by **context scope** — grouping related fixes that require similar codebase understanding and can be efficiently addressed together.

**Prerequisites**: Phase 1-10  
**Estimated Effort**: 5-7 days  
**Priority**: P0

---

## Sub-Phase Summary

| Sub-Phase | Focus Area                                     | Context Scope | Effort   | Priority |
| --------- | ---------------------------------------------- | ------------- | -------- | -------- |
| 11.1      | BIP44 Multi-Wallet & Address Management        | High          | 2-3 days | P0       |
| 11.2      | URL Parameters & Cross-Component Communication | Medium        | 1 day    | P0       |
| 11.3      | Send Flow Revamp                               | Medium        | 1 day    | P1       |
| 11.4      | Wallet Export/Restore Improvements             | Medium        | 0.5 days | P1       |
| 11.5      | People Discovery & P2P UI                      | High          | 1-2 days | P1       |
| 11.6      | UI Polish & Terminology                        | Low           | 0.5 days | P2       |

---

## Phase 11.1: BIP44 Multi-Wallet & Address Management

### Context Scope: HIGH

This phase requires deep understanding of:

- `stores/wallet.ts` - wallet state management
- `composables/useBitcore.ts` - SDK access patterns
- BIP44 derivation paths and account indexing
- MuSig2 shared wallet address derivation

### Issues Addressed

1. **BIP44 multi-wallet logic not implemented**

   - Currently using single address only
   - Need account/address tracking in wallet store
   - Need proper index management for address reuse policy

2. **One-address use policy for shared wallets**
   - When creating shared wallet, use index `i` where `i = most_recently_used_index + 1`
   - Requires tracking used addresses per account type

### Implementation Tasks

- [ ] Add address index tracking to wallet store
- [ ] Implement BIP44 account derivation for multiple addresses
- [ ] Add used address registry with persistence
- [ ] Implement next-available-index logic for new shared wallets
- [ ] Update shared wallet creation to use proper MuSig2 BIP44 path
- [ ] Add address discovery on wallet restore
- [ ] Update balance calculation to aggregate all derived addresses

### Files to Modify

```
stores/wallet.ts
composables/useWallet.ts
composables/useMuSig2.ts
types/wallet.ts
```

### Verification

- [ ] Multiple addresses can be derived from wallet
- [ ] Address indices are tracked and persisted
- [ ] New shared wallets use next available index
- [ ] Wallet restore discovers all used addresses
- [ ] Balance reflects all derived addresses

---

## Phase 11.2: URL Parameters & Cross-Component Communication

### Context Scope: MEDIUM

This phase requires understanding of:

- Vue Router query parameters
- Component prop passing and state management
- Slideover/modal state management

### Issues Addressed

1. **Add Contact pre-fill broken**

   - `/people?add=true&address=lotus...` navigates but doesn't pre-fill
   - ~~Need to wire query params to AddContactModal~~

2. **Send shortcut broken**

   - `?send=lotus...` doesn't open send modal with address
   - ~~Need to wire query params to SendModal~~

3. **Mark all read was broken** (fixed)

   - `markAllAsRead` only updated persisted items, not legacy items from other stores
   - Legacy items (wallet transactions, P2P events, MuSig2 sessions) were generated on-the-fly without `readAt`
   - Fixed by using `lastReadTimestamp` to determine read state for legacy items

4. **Query params must be cleared on modal cancel**
   - User expectation: canceling a modal should clear query params
   - Prevents modal from re-opening on page refresh

### Implementation Tasks

- [x] Wire `/people` page to read `add` and `address` query params
- [x] Pass address to AddContactModal as initial value
- [x] Add `initialAddress` prop to AddContactModal
- [x] Wire layout to read `send` query param globally
- [x] Open SendModal with pre-filled address when `?send=` present
- [x] SendModal already has `initialRecipient` prop (supports string or Person)
- [x] Fix activity store `markAllAsRead` to work with legacy items
  - Updated `getLegacyItems()` to use `lastReadTimestamp` for read state
  - Updated `markAsRead()` to persist legacy items when marked as read
- [x] Clear query params when AddContactModal closes (cancel or success)
- [x] Clear query params when SendModal closes
- [x] Clear query params when CreateWalletModal closes (`/people/wallets?create=true`)
- [x] Clear query params when BackupModal closes (`/settings?backup=true`)

### Files Modified

```
pages/people/index.vue (query param wiring + clearing)
components/people/AddContactModal.vue (initialAddress prop, cancel emit)
layouts/default.vue (send query param wiring + clearing)
pages/people/wallets/index.vue (create query param clearing)
pages/settings/index.vue (backup query param clearing)
stores/activity.ts (fixed markAllAsRead for legacy items)
```

### Verification

- [x] `/people?add=true&address=lotus...` opens modal with address pre-filled
- [x] `?send=lotus...` opens send modal with address pre-filled
- [x] "Mark all read" clears all unread indicators
- [x] Query params are cleared when modal closes (cancel or success)
- [x] Page refresh after cancel does NOT re-open modal

---

## Phase 11.3: Send Flow Revamp

### Context Scope: MEDIUM

This phase requires understanding of:

- SendModal component structure
- Form validation and UX patterns
- Network-aware address validation

### Issues Addressed

1. **Send page minimal UI**

   - Input field doesn't take full width
   - Missing contact search, recent contacts
   - Missing amount quick buttons

2. **Testnet addresses not supported**
   - Address validation rejects `lotusT` prefix
   - Need network-aware validation

### Implementation Tasks

- [x] Redesign SendModal with full-width inputs
- [x] Add recent contacts section
- [x] Add contact search/filter
- [x] Add amount quick buttons (25%, 50%, 75%, Max)
- [x] Add proper amount formatting with XPI symbol
- [x] Update address validation to support both `lotus_` and `lotusT` prefixes
- [x] Add network mismatch warning (sending to wrong network)
- [x] Improve confirmation screen layout
- [x] Add transaction fee display
- [x] **Rewrite draft store** with simplified API for new SendModal flow
  - Removed ID-based multi-recipient management
  - Direct `setAddress()`, `setAmount()`, `setSendMax()` API
  - Kept advanced features (coin control, OP_RETURN, locktime) as optional
- [x] Update SendModal to use new draft store API
- [x] Update useWallet composable for new draft store
- [x] Add input/blur/focus events to FormInput component

### Files Modified

```
stores/draft.ts (complete rewrite)
components/actions/SendModal.vue
composables/useWallet.ts
components/form/FormInput.vue
```

### Verification

- [x] Send modal has polished, full-width UI
- [x] Recent contacts display and are selectable
- [x] Contact search works
- [x] Amount quick buttons work (25%, 50%, 75%, Max)
- [x] Testnet addresses accepted on testnet
- [x] Mainnet addresses accepted on mainnet
- [x] Network mismatch shows warning with details

---

## Phase 11.4: Wallet Restore UX Improvements

### Context Scope: MEDIUM

This phase requires understanding of:

- Restore modal component
- Settings page structure

### Issues Addressed

1. **Wallet export removed** (redundant - history is on blockchain)

2. **Wallet restore UX improved**
   - ~~Single textarea for 12 words~~
   - Now 12 separate fields matching backup display
   - Auto-advance on space/tab
   - Paste detection splits phrase into fields

### Implementation Tasks

- [x] Remove wallet export functionality (redundant - history hydrated from blockchain)
- [x] Redesign RestoreWalletModal with 12 word fields
- [x] Implement word format validation per field (visual feedback)
- [x] Implement auto-advance on space/tab key
- [x] Add paste detection to split phrase into fields
- [x] Add clear button to reset all fields
- [x] Add keyboard navigation (arrow keys, backspace)
- [x] Improve error messaging for invalid phrase

### Files Modified

```
pages/settings/index.vue (removed export function and UI)
components/settings/RestoreWalletModal.vue (complete rewrite)
```

### Verification

- [x] Wallet export removed from settings
- [x] Restore modal has 12 separate word inputs
- [x] Space/tab advances to next field
- [x] Pasting full phrase splits into fields
- [x] Words show visual validation feedback (green/red border)
- [x] Clear button resets all fields
- [x] Arrow keys navigate between fields
- [x] Backspace on empty field goes to previous

---

## Phase 11.5: Contact Identity & Sharing

### Context Scope: MEDIUM

This phase establishes the **PRIMARY** BIP44 derivation path (`m/44'/10605'/0'/0/0`) as the canonical human identity for wallet-to-wallet interactions. This address serves as both the wallet entry point AND the human identity anchor.

### Core Concept: Human Identity = PRIMARY Address

The PRIMARY derivation path address is:

- The first address derived from the seed phrase
- The canonical identifier for the human behind the wallet
- The address used in Contact URIs for sharing identity
- The address advertised in wallet presence messages

### Issues Addressed

1. **No shareable contact format**

   - Need a URI scheme for sharing wallet identity
   - Must encode PRIMARY address as the identity anchor
   - Optional: name, public key for MuSig2 capability

2. **Contact QR codes**

   - Need distinct visual style from payment QR codes
   - Must encode contact URI format
   - Scanner must recognize and handle contact URIs

3. **Share My Contact**
   - Users need a way to share their own identity
   - Should generate Contact URI from their PRIMARY address

### Contact URI Specification

```
lotus-contact://<PRIMARY_ADDRESS>?name=<URL_ENCODED_NAME>&pubkey=<HEX_PUBKEY>
```

**Required:**

- `<PRIMARY_ADDRESS>` - The BIP44 PRIMARY path address (e.g., `lotus_16PSJ...`)

**Optional Query Parameters:**

- `name` - URL-encoded display name
- `pubkey` - Hex-encoded compressed public key (for MuSig2 capability)

**Examples:**

```
lotus-contact://lotus_16PSJKLMN...
lotus-contact://lotus_16PSJKLMN...?name=Alice
lotus-contact://lotus_16PSJKLMN...?name=Alice&pubkey=02abc123...
```

### Implementation Tasks

- [x] Create `composables/useContactUri.ts` for URI parsing/generation
- [x] Add "Share My Contact" button to People page header
- [x] Create ShareMyContactModal component
  - [x] Display user's PRIMARY address as identity
  - [x] Generate Contact URI with optional name
  - [x] Generate QR code with distinct styling (different color/border)
  - [x] Copy URI to clipboard button
- [x] Update ScanModal to recognize `lotus-contact://` URIs
- [x] ScanModal emits `contact` type with parsed ContactUriData
- [x] Add "Share Contact" button to person detail page
- [x] Create ShareContactModal for sharing existing contacts
- [x] Wire scanned contact data to AddContactModal via query params
- [x] AddContactModal accepts `initialName` and `initialPublicKey` props
- [x] Layout `handleScan` navigates to `/people?add=true&address=...&name=...&pubkey=...`

### Files Modified

```
composables/useContactUri.ts (new)
components/people/ShareMyContactModal.vue (new)
components/people/ShareContactModal.vue (new)
components/people/AddContactModal.vue
components/actions/ScanModal.vue
layouts/default.vue
pages/people/index.vue
pages/people/[id].vue
```

### Verification

- [x] Contact URI generates correctly with PRIMARY address
- [x] Contact QR code has distinct visual style (purple gradient border)
- [x] ScanModal recognizes `lotus-contact://` URIs and emits contact data
- [x] "Share My Contact" button works from People page
- [x] "Share Contact" button works from person detail
- [x] Contact URI with name parameter displays correctly
- [x] Scanning contact QR opens AddContactModal with pre-filled data
- [ ] Contact URI with pubkey enables MuSig2 features (deferred to Phase 11.8)

---

## Phase 11.5.1: Shared Wallet Storage Architecture Consolidation

### Context Scope: HIGH

This phase consolidates the shared wallet storage architecture to ensure a sound developer experience and eliminate duplicate storage systems.

### Issue

Two separate `SharedWallet` types and storage systems existed:

| Aspect         | `types/people.ts` (Plan)    | `stores/musig2.ts` (Old)                  |
| -------------- | --------------------------- | ----------------------------------------- |
| Storage Key    | `lotus:shared-wallets`      | `musig2-shared-wallets`                   |
| Store          | `peopleStore`               | `musig2Store`                             |
| Data Structure | `Map<string, SharedWallet>` | `SharedWallet[]`                          |
| Participants   | `participantIds: string[]`  | `participants: SharedWalletParticipant[]` |
| Address Field  | `address: string`           | `sharedAddress: string`                   |

This caused:

- Duplicate storage with different schemas
- UI confusion about which store to use
- Type mismatches between components

### Resolution

**`peopleStore` is now the single source of truth for shared wallets**, as specified in the plan.

### Implementation Tasks

- [x] Extend `types/people.ts` SharedWallet to include MuSig2 fields (`aggregatedPublicKeyHex`, `participants` with `publicKeyHex`)
- [x] Add `SharedWalletParticipant` type with `personId`, `publicKeyHex`, `isMe`
- [x] Update `peopleStore.addSharedWallet()` to use new participant structure
- [x] Add `peopleStore.getByPublicKey()` method for participant resolution
- [x] Refactor `musig2Store.createSharedWallet()` to delegate to `peopleStore.addSharedWallet()`
- [x] Add `musig2Store.sharedWallets` getter that delegates to `peopleStore.allWallets`
- [x] Remove duplicate storage methods from `musig2Store` (`loadSharedWallets`, `_saveSharedWallets`)
- [x] Update `useContactContext.ts` to import `SharedWallet` from `types/people.ts`
- [x] Update `useSharedWalletContext.ts` to use new type structure
- [x] Update wallet list/detail pages to use `peopleStore.initialize()`
- [x] Update `SpendModal.vue` to use `SharedWallet` from `types/people.ts`
- [x] Update notification helpers to use `PeopleSharedWallet` type

### Files Modified

```
types/people.ts                           - Extended SharedWallet, added SharedWalletParticipant
stores/people.ts                          - Updated addSharedWallet, added getByPublicKey
stores/musig2.ts                          - Delegated to peopleStore, removed duplicate storage
composables/useContactContext.ts          - Import from types/people.ts
composables/useSharedWalletContext.ts     - Use new type structure
pages/people/wallets/index.vue            - Use peopleStore.initialize()
pages/people/wallets/[id].vue             - Use new participant structure
components/wallets/SpendModal.vue         - Import SharedWallet from types/people.ts
components/wallets/CreateWalletModal.vue  - Calls musig2Store.createSharedWallet()
```

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED WALLET ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  types/people.ts                                                 │
│  ├── SharedWallet (canonical type)                               │
│  └── SharedWalletParticipant                                     │
│                                                                  │
│  stores/people.ts (SINGLE SOURCE OF TRUTH)                       │
│  ├── sharedWallets: Map<string, SharedWallet>                    │
│  ├── addSharedWallet() - creates and persists                    │
│  ├── allWallets - computed getter                                │
│  └── Storage: 'lotus:shared-wallets'                             │
│                                                                  │
│  stores/musig2.ts (DELEGATES TO peopleStore)                     │
│  ├── sharedWallets - getter → peopleStore.allWallets             │
│  ├── createSharedWallet() - computes address, calls peopleStore  │
│  └── Handles: MuSig2 key aggregation, signing sessions           │
│                                                                  │
│  UI Components                                                   │
│  ├── Use musig2Store.sharedWallets (getter)                      │
│  └── Or peopleStore.allWallets directly                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insight

**MuSig2 wallet creation is an offline operation.** Given n-of-n public keys, we can compute the aggregated Taproot address locally using `createMuSigTaprootAddress()`. P2P is only required for **spending** (coordinating MuSig2 signing sessions).

### Verification

- [x] Shared wallet creation persists via peopleStore
- [x] Created wallet appears in wallet list
- [x] Wallet detail page displays correct address and participants
- [x] Wallets persist across page refresh
- [x] No TypeScript errors
- [ ] Spending from shared wallet (requires P2P - deferred)

---

## Phase 11.5.2: QR Code Scanning Implementation

### Context Scope: MEDIUM

This phase implements actual QR code scanning functionality in the ScanModal.

### Issue

The ScanModal had a placeholder `scanLoop()` function that showed the camera feed but never actually scanned QR codes. The comment in the code stated:

```typescript
// Note: In production, integrate a QR scanning library like @aspect-dev/browser-qr-code-reader
// For now, this is a placeholder that shows the camera feed
```

### Resolution

Integrated `vue-qrcode-reader` library which provides the `QrcodeStream` component for real-time QR code detection.

### Implementation Tasks

- [x] Install `vue-qrcode-reader` package
- [x] Replace manual camera handling with `QrcodeStream` component
- [x] Wire up `@detect` event to `handleScanResult()`
- [x] Handle camera errors with user-friendly messages
- [x] Add `@manual-entry` event for opening SendModal directly
- [x] Wire up scan results in `default.vue` layout:
  - `type: 'contact'` → Navigate to `/people?add=true&address=...&name=...&pubkey=...`
  - `type: 'address'` → Open SendModal with address pre-filled
  - `type: 'payment'` → Open SendModal with address and amount pre-filled

### Supported QR Code Formats

| Format      | Example                                                | Action                     |
| ----------- | ------------------------------------------------------ | -------------------------- |
| Contact URI | `lotus-contact://lotus_abc...?name=Alice&pubkey=02...` | Open AddContactModal       |
| Payment URI | `lotus:lotus_abc...?amount=100`                        | Open SendModal with amount |
| Raw Address | `lotus_abc...`                                         | Open SendModal             |

### Files Modified

```
package.json                              - Added vue-qrcode-reader dependency
components/actions/ScanModal.vue          - Rewrote to use QrcodeStream
layouts/default.vue                       - Added handleScanManualEntry handler
```

### Verification

- [x] Camera opens when ScanModal is shown
- [x] QR codes are detected and parsed correctly
- [x] Contact URIs open AddContactModal with pre-filled data
- [x] Payment URIs open SendModal with address and amount
- [x] Raw addresses open SendModal with address
- [x] Invalid QR codes show error and resume scanning
- [x] "Enter address manually" opens SendModal
- [x] Camera errors show user-friendly messages

---

## Phase 11.6: UI Polish & Terminology

### Context Scope: LOW

This phase addresses minor UI improvements that don't require deep codebase understanding.

### Issues Addressed

1. **"Coinbase Transaction" terminology**

   - Confusing for non-technical users
   - Replace with "Block Reward" or "New Lotus Created"

2. **QR Code not rendering in Receive modal**

   - ReceiveModal has placeholder instead of actual QR code
   - qrcode-vue3 library is installed but not used
   - Need to integrate QRCodeVue3 component

3. **Mobile navbar improvements**

   - Shows page name in upper left (not useful)
   - Should show search, explore, balance, or network indicator

4. **Quick actions slideover improvements**

   - Missing close button on mobile
   - Doesn't respond to Android back button
   - Missing desktop keyboard shortcut

5. **Receive XPI Taproot indicator**

   - No indication of address type (Taproot vs Legacy)
   - Add small indicator with tooltip

### Implementation Tasks

- [x] Fix QR code rendering in ReceiveModal using qrcode-vue3
- [x] Replace "Coinbase" with "Block Reward" in explorer components
- [x] Update transaction type labels throughout app
- [x] Redesign mobile navbar header
  - [x] Remove page name from upper left
  - [x] Add search button and explore button (upper right)
  - [x] Show condensed balance and network indicator (upper left)
- [x] Add close button to action sheet on mobile
- [ ] Add Android back button handler for slideovers (platform-specific, deferred)
- [x] Add Opt+Shift+A shortcut for quick actions
- [x] Add Taproot/Legacy indicator to ReceiveModal
- [x] Add tooltip explaining Taproot benefits

### Files to Modify

```
components/explorer/TransactionDetail.vue
components/explorer/BlockDetail.vue
components/activity/ActivityItem.vue
layouts/default.vue
components/navigation/BottomNav.vue (or navbar component)
components/navigation/ActionSheet.vue
plugins/shortcuts.client.ts
components/actions/ReceiveModal.vue
```

### Verification

- [x] "Block Reward" displays instead of "Coinbase"
- [x] Mobile navbar shows useful info instead of page name
- [x] Action sheet has close button on mobile
- [ ] Android back button closes slideovers (deferred - platform-specific)
- [x] Opt+Shift+A opens quick actions on desktop
- [x] Receive modal shows address type indicator
- [x] Taproot tooltip explains benefits
- [x] QR code renders correctly in Receive modal

---

## Phase 11.7: Query Parameter Consistency Audit

### Context Scope: LOW

This phase ensures consistent query parameter behavior across all modals and pages.

### Pattern Established

**Rule**: URI query parameters control modals. When a modal is canceled or closed, query params MUST be cleared to prevent the modal from re-opening on page refresh.

**Implementation Pattern**:

```typescript
// Watch for query param to open modal
watch(
  () => route.query,
  query => {
    if (query.myParam === 'true') {
      modalOpen.value = true
    }
  },
  { immediate: true },
)

// Clear query param when modal closes
watch(modalOpen, isOpen => {
  if (!isOpen && route.query.myParam) {
    router.replace({ query: {} })
  }
})
```

### Audit Checklist

Query param → Modal mappings that follow the pattern:

| Query Param             | Page              | Modal             | Status         |
| ----------------------- | ----------------- | ----------------- | -------------- |
| `?add=true&address=...` | `/people`         | AddContactModal   | ✅ Implemented |
| `?send=...`             | (global/layout)   | SendModal         | ✅ Implemented |
| `?create=true`          | `/people/wallets` | CreateWalletModal | ✅ Implemented |
| `?backup=true`          | `/settings`       | BackupModal       | ✅ Implemented |

### Potential Future Query Params

These may be added in future phases:

- `?receive=true` - Open ReceiveModal from any page
- `?scan=true` - Open ScanModal from any page
- `?restore=true` - Open RestoreWalletModal from settings
- `?viewPhrase=true` - Open ViewPhraseModal from settings

### Verification

- [x] All existing query param → modal mappings clear params on close
- [x] Pattern documented for future implementations

---

## Phase 11.8: P2P Discovery & Presence System

### Context Scope: VERY HIGH (Multi-Repository)

This phase spans **three codebases**:

- `lotus-web-wallet` - UI and P2P store integration
- `lotus-sdk` - P2P coordinator, DHT, GossipSub modules
- `lotus-dht-server` - Bootstrap node with presence caching API

### Architectural Constraints

Understanding these constraints is **critical** before implementation:

#### 1. DHT is Key/Value Only

The DHT (Distributed Hash Table) is **NOT** a wildcard query system. You can only retrieve values for specific keys you already know. This means:

- ❌ Cannot "discover" unknown wallets via DHT
- ✅ Can look up presence for a **known** wallet address
- ✅ Can store/retrieve wallet presence by PRIMARY address key

#### 2. GossipSub for Real-Time Discovery

GossipSub pub/sub is the only mechanism for discovering **unknown** wallets:

- Wallets advertise presence on `lotus/discovery/wallet-presence` topic
- Requires active connection to bootstrap node to receive advertisements
- Messages are ephemeral - not stored unless cached by bootstrap node

#### 3. "Last Seen" Semantics (Not "Online")

Without a direct P2P connection, we cannot know if a wallet is truly "online". We can only know:

- **Last presence advertisement timestamp** - "Last seen 5 minutes ago"
- **DHT record timestamp** - When presence was last published to DHT

The UI must communicate this accurately:

- ✅ "Last seen 2 minutes ago" (accurate)
- ❌ "Online" (misleading without direct connection)

### Bootstrap Node API Requirements

The `lotus-dht-server` needs new HTTP API endpoints to enable discovery:

#### `GET /presence`

Returns cached wallet presence advertisements with timestamps.

```json
{
  "presences": [
    {
      "address": "lotus_16PSJ...",
      "peerId": "12D3KooW...",
      "nickname": "Alice",
      "publicKeyHex": "02abc...",
      "capabilities": ["musig2"],
      "lastSeen": 1703019600000,
      "lastSeenRelative": "2 minutes ago"
    }
  ],
  "timestamp": 1703019720000
}
```

#### `GET /presence/:address`

Returns presence for a specific wallet address (DHT lookup).

```json
{
  "address": "lotus_16PSJ...",
  "found": true,
  "presence": { ... },
  "source": "dht" | "cache" | "gossipsub"
}
```

### Implementation Tasks

#### lotus-dht-server Changes

- [ ] Add SQLite table for presence cache (`wallet_presences`)
- [ ] Subscribe to `lotus/discovery/wallet-presence` and cache advertisements
- [ ] Add `GET /presence` endpoint - return all cached presences
  - We'll need to devise a good way to paginate these results (e.g. lexicographical ordering of public key + ordering by lastSeen timestamp)
- [ ] Add `GET /presence/:address` endpoint - lookup specific wallet
- [ ] Add TTL-based cleanup for stale presences (e.g., 24 hours)
- [ ] Add presence count to `/stats` endpoint

#### lotus-sdk Changes

- [ ] Ensure `WalletPresenceAdvertisement` includes PRIMARY address
- [ ] Add `DHTDiscoverer.lookupPresence(address)` method
- [ ] Add `P2PCoordinator.getPresenceFromBootstrap(address)` method
- [ ] Ensure presence advertisements include timestamp

#### lotus-web-wallet Changes

- [ ] Create `composables/usePresenceApi.ts` for bootstrap API calls
- [ ] Update P2P store to fetch presences from bootstrap node
- [ ] Add "Discover People" section to People page
- [ ] Display discovered wallets with "last seen" timestamps
- [ ] Allow adding discovered wallet as contact
- [ ] Update person cards to show "last seen" instead of "online"
- [ ] Add presence refresh button/auto-refresh

### Files to Modify

**lotus-dht-server:**

```
server.ts (add presence caching and API endpoints)
```

**lotus-sdk:**

```
src/p2p/DHTDiscoverer.ts
src/p2p/P2PCoordinator.ts
src/p2p/types.ts
```

**lotus-web-wallet:**

```
composables/usePresenceApi.ts (new)
stores/p2p.ts
pages/people/index.vue
components/people/PersonCard.vue
components/people/DiscoverPeopleSection.vue (new)
```

### Verification

- [ ] Bootstrap node caches wallet presence advertisements
- [ ] `/presence` API returns cached presences with timestamps (with pagination support)
- [ ] `/presence/:address` returns specific wallet presence
- [ ] Wallet can fetch discovered wallets from bootstrap API
- [ ] "Last seen" displays accurately (not "online")
- [ ] Discovered wallets can be added as contacts
- [ ] Stale presences are cleaned up after TTL

### Future Considerations

- **Direct P2P connections**: When wallets establish direct connections, true "online" status becomes possible
- **Presence subscriptions**: WebSocket endpoint for real-time presence updates
- **Privacy**: Consider opt-in presence advertising

---

## Implementation Order

Recommended order based on priority and dependencies:

1. **Phase 11.2** (URL Parameters) - Quick wins, unblocks user flows ✅
2. **Phase 11.1** (BIP44) - Core wallet functionality, high priority
3. **Phase 11.3** (Send Flow) - User-facing improvement ✅
4. **Phase 11.4** (Export/Restore) - Quality of life ✅
5. **Phase 11.5** (Contact Identity) - Establishes human identity model
6. **Phase 11.6** (UI Polish) - Final polish ✅
7. **Phase 11.7** (Query Param Audit) - Consistency check ✅
8. **Phase 11.8** (P2P Discovery) - Multi-repo, requires lotus-sdk and lotus-dht-server changes

---

## Success Criteria

Phase 11 is complete when:

- [ ] All Phase 10 verification failures are resolved
- [ ] All sub-phase verification checklists pass
- [ ] No regressions in existing functionality
- [ ] User can complete all primary flows without issues

---

_Next: Return to [10_VERIFICATION.md](./10_VERIFICATION.md) for final verification_
