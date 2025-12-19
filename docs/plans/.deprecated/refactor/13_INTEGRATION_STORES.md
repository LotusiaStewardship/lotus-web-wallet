# 13: Integration - Stores

## Overview

This document details the integration of new components with Pinia stores. The scaffolded components reference store methods and properties that need to be aligned with actual store implementations.

---

## Current State

### New Stores Created (Phase 3)

1. **`stores/musig2.ts`** - MuSig2 multi-signature state
2. **`stores/ui.ts`** - Global UI state
3. **`stores/onboarding.ts`** - Onboarding flow state

### Existing Stores

1. **`stores/wallet.ts`** - Wallet state and operations
2. **`stores/contacts.ts`** - Contact management
3. **`stores/network.ts`** - Network configuration
4. **`stores/p2p.ts`** - P2P connection state

---

## Store API Alignment Tasks

### 1. Wallet Store (`stores/wallet.ts`)

#### Missing Methods Referenced by Components

| Method              | Referenced In          | Expected Signature                    |
| ------------------- | ---------------------- | ------------------------------------- |
| `getMnemonic()`     | `onboarding/Modal.vue` | `() => string \| null`                |
| `createNewWallet()` | `onboarding/Modal.vue` | `() => Promise<void>`                 |
| `restoreWallet()`   | `onboarding/Modal.vue` | `(mnemonic: string) => Promise<void>` |

#### Implementation

```typescript
// Add to stores/wallet.ts

// Getter for mnemonic (secure access)
function getMnemonic(): string | null {
  // Only return if wallet is unlocked
  if (!state.unlocked) return null
  return state.seedPhrase || null
}

// Create new wallet
async function createNewWallet(): Promise<void> {
  const { Mnemonic } = getBitcoreSDK()
  const mnemonic = new Mnemonic()

  state.seedPhrase = mnemonic.toString()
  await deriveKeysFromMnemonic(mnemonic)
  await saveWallet()

  initialized.value = true
}

// Restore wallet from mnemonic
async function restoreWallet(mnemonicString: string): Promise<void> {
  const { Mnemonic } = getBitcoreSDK()

  // Validate mnemonic
  if (!Mnemonic.isValid(mnemonicString)) {
    throw new Error('Invalid seed phrase')
  }

  const mnemonic = new Mnemonic(mnemonicString)
  state.seedPhrase = mnemonicString
  await deriveKeysFromMnemonic(mnemonic)
  await saveWallet()

  initialized.value = true
}
```

---

### 2. Onboarding Store (`stores/onboarding.ts`)

#### Missing Properties/Methods Referenced by Components

| Property/Method        | Referenced In                   | Expected Type                    |
| ---------------------- | ------------------------------- | -------------------------------- |
| `shouldShowOnboarding` | `onboarding/Modal.vue`          | `ComputedRef<boolean>`           |
| `skipStep()`           | `onboarding/Modal.vue`          | `(step: OnboardingStep) => void` |
| `shouldShowHint()`     | `onboarding/ContextualHint.vue` | `(id: string) => boolean`        |
| `dismissHint()`        | `onboarding/ContextualHint.vue` | `(id: string) => void`           |

#### Current Store Analysis

The existing `stores/onboarding.ts` has:

- `isOnboarding()` getter but not `shouldShowOnboarding`
- `shouldShowHint()` expects `FeatureHint` enum, not string

#### Required Changes

```typescript
// Update stores/onboarding.ts

// Add OnboardingStep type with all steps
type OnboardingStep =
  | 'welcome'
  | 'create_or_restore'
  | 'backup_seed'
  | 'verify_backup'
  | 'quick_tour'
  | 'complete'

// Add shouldShowOnboarding computed
const shouldShowOnboarding = computed(
  () => isFirstTime.value && !onboardingComplete.value,
)

// Add skipStep action
function skipStep(step: OnboardingStep) {
  if (step === 'backup_seed') {
    backupSkippedCount.value++
  }
  completeStep(step)
}

// Update shouldShowHint to accept string
function shouldShowHint(hintId: string): boolean {
  return !dismissedHints.value.has(hintId)
}

// Update dismissHint to accept string
function dismissHint(hintId: string) {
  dismissedHints.value.add(hintId)
  saveState()
}
```

---

### 3. Contacts Store (`stores/contacts.ts`)

#### Missing Properties Referenced by Components

| Property/Method       | Referenced In                  | Expected Type                               |
| --------------------- | ------------------------------ | ------------------------------------------- |
| `contacts` (as array) | Multiple components            | `Contact[]`                                 |
| `findByAddress()`     | `musig2/ProposeSpendModal.vue` | `(address: string) => Contact \| undefined` |
| `findByPeerId()`      | `p2p/SignerCard.vue`           | `(peerId: string) => Contact \| undefined`  |

#### Current Store Analysis

The store may use a `Map<string, Contact>` internally but components expect array access.

#### Required Changes

```typescript
// Update stores/contacts.ts

// Ensure contacts is exposed as array
const contactList = computed(() => Array.from(contacts.value.values()))

// Add finder methods
function findByAddress(address: string): Contact | undefined {
  return contactList.value.find(c => c.address === address)
}

function findByPeerId(peerId: string): Contact | undefined {
  return contactList.value.find(c => c.peerId === peerId)
}

// Expose in return
return {
  contacts: contactList, // Expose as array
  findByAddress,
  findByPeerId,
  // ... other exports
}
```

---

### 4. MuSig2 Store (`stores/musig2.ts`)

#### Properties Referenced by Components

| Property/Method        | Referenced In                        | Expected Type                       |
| ---------------------- | ------------------------------------ | ----------------------------------- |
| `sharedWallets`        | `musig2/SharedWalletList.vue`        | `SharedWallet[]`                    |
| `createSharedWallet()` | `musig2/CreateSharedWalletModal.vue` | `(config) => Promise<SharedWallet>` |
| `discoveredSigners`    | `p2p/SignerList.vue`                 | `SignerAdvertisement[]`             |
| `incomingRequests`     | `p2p/IncomingRequests.vue`           | `IncomingSigningRequest[]`          |
| `activeSessions`       | `p2p/SessionList.vue`                | `Map<string, SigningSession>`       |

#### Verification

Ensure the store created in Phase 3 exposes all these properties with correct types.

---

### 5. P2P Store (`stores/p2p.ts`)

#### Properties Referenced by Components

| Property/Method   | Referenced In           | Expected Type         |
| ----------------- | ----------------------- | --------------------- |
| `connectionState` | `p2p/HeroCard.vue`      | `P2PConnectionState`  |
| `connectedPeers`  | `p2p/HeroCard.vue`      | `Peer[]`              |
| `dhtReady`        | `p2p/HeroCard.vue`      | `boolean`             |
| `onlinePeers`     | `p2p/PeerGrid.vue`      | `Peer[]`              |
| `activityEvents`  | `p2p/ActivityFeed.vue`  | `ActivityEvent[]`     |
| `presenceEnabled` | `p2p/SettingsPanel.vue` | `boolean`             |
| `connect()`       | `p2p/HeroCard.vue`      | `() => Promise<void>` |
| `disconnect()`    | `p2p/HeroCard.vue`      | `() => Promise<void>` |

#### Required Types

```typescript
// types/p2p.ts

type P2PConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'dht_ready'
  | 'fully_operational'
  | 'error'

interface Peer {
  peerId: string
  nickname?: string
  address?: string
}

interface ActivityEvent {
  id: string
  type:
    | 'peer_connected'
    | 'peer_disconnected'
    | 'signer_available'
    | 'signer_unavailable'
    | 'request_received'
    | 'session_started'
  peerId?: string
  nickname?: string
  message?: string
  timestamp: number
}
```

---

### 6. Network Store (`stores/network.ts`)

#### Properties Referenced by Components

| Property/Method         | Referenced In          | Expected Type                        |
| ----------------------- | ---------------------- | ------------------------------------ |
| `currentNetwork`        | `settings/network.vue` | `'livenet' \| 'testnet'`             |
| `chronikUrl`            | `settings/network.vue` | `string`                             |
| `switchNetwork()`       | `settings/network.vue` | `(network: string) => Promise<void>` |
| `setCustomChronikUrl()` | `settings/network.vue` | `(url: string) => void`              |

---

## Integration Checklist

### Phase 13.1: Wallet Store Integration

- [ ] Add `getMnemonic()` method
- [ ] Add `createNewWallet()` method
- [ ] Add `restoreWallet()` method
- [ ] Verify `balance` property structure
- [ ] Verify `connected` property
- [ ] Verify `tipHeight` property

### Phase 13.2: Onboarding Store Integration

- [ ] Add `shouldShowOnboarding` computed
- [ ] Add `skipStep()` action
- [ ] Update `shouldShowHint()` to accept string
- [ ] Update `dismissHint()` to accept string
- [ ] Add `'quick_tour'` to OnboardingStep type
- [ ] Verify `currentStep` property
- [ ] Verify `backupComplete` property

### Phase 13.3: Contacts Store Integration

- [ ] Expose `contacts` as array (not Map)
- [ ] Add `findByAddress()` method
- [ ] Add `findByPeerId()` method
- [ ] Verify Contact type has `publicKey` property
- [ ] Verify Contact type has `peerId` property

### Phase 13.4: MuSig2 Store Integration

- [ ] Verify `sharedWallets` array
- [ ] Verify `discoveredSigners` array
- [ ] Verify `incomingRequests` array
- [ ] Verify `outgoingRequests` array
- [ ] Verify `activeSessions` Map
- [ ] Add `createSharedWallet()` method
- [ ] Add `deleteSharedWallet()` method
- [ ] Add `refreshSharedWalletBalances()` method

### Phase 13.5: P2P Store Integration

- [ ] Add `connectionState` property
- [ ] Add `connectedPeers` array
- [ ] Add `onlinePeers` array
- [ ] Add `dhtReady` boolean
- [ ] Add `activityEvents` array
- [ ] Add `presenceEnabled` boolean
- [ ] Add `connect()` method
- [ ] Add `disconnect()` method
- [ ] Add `enablePresence()` method
- [ ] Add `disablePresence()` method

### Phase 13.6: Network Store Integration

- [ ] Verify `currentNetwork` property
- [ ] Verify `chronikUrl` property
- [ ] Add `switchNetwork()` method
- [ ] Add `setCustomChronikUrl()` method

---

## Testing Strategy

### Unit Tests

1. Test each store method in isolation
2. Mock external dependencies (Bitcore SDK, Chronik, libp2p)
3. Test state persistence (localStorage)

### Integration Tests

1. Test store interactions (e.g., wallet + onboarding)
2. Test component-store bindings
3. Test reactive updates

---

## Migration Notes

1. **Backward Compatibility**: Existing store consumers should continue working
2. **Type Safety**: All new methods should be fully typed
3. **Error Handling**: All async methods should handle errors gracefully
4. **Persistence**: State changes should persist to localStorage where appropriate

---

_Next: [14_INTEGRATION_PAGES.md](./14_INTEGRATION_PAGES.md)_
