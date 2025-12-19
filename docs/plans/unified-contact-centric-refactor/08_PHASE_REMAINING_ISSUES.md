# Phase 8: Remaining Issues & Bug Fixes

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: Phases 1-6 (Foundation through UI)

---

## Overview

This phase addresses remaining issues identified in `TODO.md` that were not fully covered by Phases 1-7. These are primarily edge cases, integration bugs, and enhancements discovered during the planning review.

---

## Issues Addressed

| Issue | Description                                                                                              | Priority | Source  |
| ----- | -------------------------------------------------------------------------------------------------------- | -------- | ------- |
| 8.1   | Chronik WS subscriptions subscribe to MuSig2 public keys (should only subscribe to aggregated addresses) | HIGH     | TODO.md |
| 8.2   | Contact state doesn't persist in shared wallet context                                                   | HIGH     | TODO.md |
| 8.3   | Network-aware address derivation (livenet vs testnet UX)                                                 | MEDIUM   | TODO.md |
| 8.4   | WebRTC integration for accurate online status                                                            | MEDIUM   | TODO.md |
| 8.5   | Main wallet address missing from P2P advertisements                                                      | HIGH     | TODO.md |

---

## Tasks

### 8.1 Chronik WS Subscription Filtering

**Problem**: Current code subscribes to ALL derived addresses including individual MuSig2 public keys. However, MuSig2 public keys are aggregated into a single shared address. Subscribing to individual MuSig2 keys is wasteful and incorrect.

**File**: `services/chronik.ts`, `stores/wallet.ts`

**Current Behavior**:

```typescript
// Subscribes to all derived addresses including MuSig2 account keys
for (const account of accounts.values()) {
  for (const address of account.addresses) {
    await subscribeToScript(address.scriptPayload)
  }
}
```

**Required Behavior**:

```typescript
// Only subscribe to addresses that can receive payments:
// 1. PRIMARY account addresses (main wallet)
// 2. Shared wallet aggregated addresses (from musig2Store)
// NOT: Individual MuSig2 public keys (they're aggregated, not used directly)

async function subscribeToReceivableAddresses(): Promise<void> {
  const walletStore = useWalletStore()
  const musig2Store = useMuSig2Store()

  // 1. Subscribe to PRIMARY account addresses
  const primaryAccount = walletStore.getAccount(AccountPurpose.PRIMARY)
  if (primaryAccount) {
    for (const address of primaryAccount.addresses) {
      await subscribeToScript(address.scriptPayload)
    }
  }

  // 2. Subscribe to shared wallet aggregated addresses
  for (const wallet of musig2Store.sharedWallets) {
    if (wallet.sharedAddress) {
      const scriptPayload = addressToScriptPayload(wallet.sharedAddress)
      await subscribeToScript(scriptPayload)
    }
  }

  // NOTE: Do NOT subscribe to MUSIG2 account keys - they're for signing, not receiving
}
```

| Task                                                       | Priority | Status         |
| ---------------------------------------------------------- | -------- | -------------- |
| 8.1.1 Create `subscribeToReceivableAddresses()` function   | P0       | ⬜ Not Started |
| 8.1.2 Filter out MUSIG2 account from Chronik subscriptions | P0       | ⬜ Not Started |
| 8.1.3 Add shared wallet addresses to subscriptions         | P0       | ⬜ Not Started |
| 8.1.4 Update subscription logic when shared wallets change | P1       | ⬜ Not Started |

---

### 8.2 Contact State Persistence in Shared Wallet Context

**Problem**: Contacts added from `/people/shared-wallets/[id].vue` (participants tab) don't persist after page refresh.

**Reproduction**:

1. Navigate to `/people/shared-wallets/[id]?tab=2` (participants tab)
2. Add contact manually (console logs show contact is being saved)
3. "Contact" badge is displayed on the participant
4. Refresh page
5. Participant is no longer marked as "Contact"

**Root Cause Analysis Required**:

- Check if `saveContacts()` is being called after `addContact()`
- Check if the contact is being saved with the correct `identityId` linking
- Check if the participant lookup is using the correct field (`publicKeyHex` vs `identityId`)

**File**: `stores/contacts.ts`, `components/shared-wallets/ParticipantList.vue`, `pages/people/shared-wallets/[id].vue`

```typescript
// Debug: Add logging to trace the issue
async function addContact(data: ContactInput): Promise<Contact> {
  console.log('[Contacts] addContact called with:', data)

  // ... existing logic ...

  console.log('[Contacts] Contact created:', contact)
  console.log('[Contacts] Saving contacts...')
  saveContacts()
  console.log('[Contacts] Contacts saved. Total:', contacts.value.size)

  return contact
}

// Check participant lookup
function isParticipantContact(participant: SharedWalletParticipant): boolean {
  // Check by publicKeyHex (identityId)
  const byPublicKey = findByPublicKey(participant.publicKeyHex)
  console.log('[Contacts] isParticipantContact check:', {
    publicKeyHex: participant.publicKeyHex,
    found: !!byPublicKey,
  })
  return !!byPublicKey
}
```

| Task                                                         | Priority | Status         |
| ------------------------------------------------------------ | -------- | -------------- |
| 8.2.1 Add debug logging to contact persistence flow          | P0       | ⬜ Not Started |
| 8.2.2 Verify `saveContacts()` is called after `addContact()` | P0       | ⬜ Not Started |
| 8.2.3 Verify participant lookup uses correct field           | P0       | ⬜ Not Started |
| 8.2.4 Fix persistence bug (based on findings)                | P0       | ⬜ Not Started |

---

### 8.3 Network-Aware Address Derivation

**Problem**: Derived addresses should be ephemeral based on the current network. Having to create multiple shared wallets for livenet vs testnet is HORRIBLE UX.

**Current Behavior**:

- Address is derived once and stored
- Switching networks doesn't update addresses
- Users must create separate shared wallets per network

**Required Behavior**:

- Addresses should be derived on-demand based on current network
- Shared wallets should work across network switches (same participants, different addresses)
- Clear indication of which network a wallet is on

**File**: `stores/wallet.ts`, `stores/musig2.ts`, `utils/identity.ts`

```typescript
// Option 1: Store public keys, derive addresses on-demand
interface SharedWallet {
  // Store the public keys (network-agnostic)
  participantPublicKeys: string[]
  aggregatedPublicKeyHex: string

  // DON'T store the address - derive it on-demand
  // sharedAddress: string // REMOVE
}

// Computed getter for address
const sharedAddress = computed(() => {
  const networkStore = useNetworkStore()
  return deriveAddressFromPublicKey(
    wallet.aggregatedPublicKeyHex,
    networkStore.network,
  )
})

// Option 2: Store addresses per network
interface SharedWallet {
  aggregatedPublicKeyHex: string
  addresses: {
    livenet: string
    testnet: string
  }
}
```

| Task                                                        | Priority | Status         |
| ----------------------------------------------------------- | -------- | -------------- |
| 8.3.1 Analyze current address storage pattern               | P1       | ⬜ Not Started |
| 8.3.2 Decide on network-aware strategy (Option 1 or 2)      | P1       | ⬜ Not Started |
| 8.3.3 Update SharedWallet interface                         | P1       | ⬜ Not Started |
| 8.3.4 Update address derivation to use current network      | P1       | ⬜ Not Started |
| 8.3.5 Update UI to show network indicator on shared wallets | P2       | ⬜ Not Started |

---

### 8.4 WebRTC Integration for Online Status

**Problem**: True online/offline status requires WebRTC integration to determine reachability. Current implementation only checks libp2p connections which may not reflect actual reachability.

**Current Behavior**:

- Online status based on `p2pStore.connectedPeers`
- Only tracks direct libp2p connections
- Doesn't account for NAT traversal or relay connections

**Required Behavior**:

- Integrate WebRTC for direct peer-to-peer connectivity checks
- Use DCUtR (Direct Connection Upgrade through Relay) for NAT traversal
- Provide accurate "reachable" vs "connected" status

**File**: `services/p2p.ts`, `stores/p2p.ts`, `lotus-sdk` (P2P module)

**Note**: This is a significant enhancement that may require lotus-sdk changes. Consider deferring to a future release if scope is too large.

| Task                                                | Priority | Status         |
| --------------------------------------------------- | -------- | -------------- |
| 8.4.1 Research WebRTC integration with libp2p       | P2       | ⬜ Not Started |
| 8.4.2 Evaluate DCUtR support in lotus-sdk           | P2       | ⬜ Not Started |
| 8.4.3 Design reachability detection strategy        | P2       | ⬜ Not Started |
| 8.4.4 Implement WebRTC-based presence (if feasible) | P2       | ⬜ Not Started |

---

### 8.5 Main Wallet Address in P2P Advertisements

**Problem**: When a wallet is discovered over P2P and added to contacts, the address should be available to save. Currently, only the MuSig2 public key is advertised, not the main wallet address.

**Current Behavior**:

- P2P advertisements contain MuSig2 public key
- Contact saved from signer has MuSig2-derived address
- This creates separation between Contact and the user's main wallet

**Required Behavior**:

- P2P advertisements should include the main wallet address (PRIMARY account)
- When saving a contact from a discovered signer, use the advertised main address
- Contact = Wallet information + P2P information + MuSig2 information

**File**: `services/musig2.ts`, `stores/musig2.ts`, `lotus-sdk` (advertisement format)

```typescript
// Updated advertisement format
interface SignerAdvertisement {
  // Existing fields
  publicKeyHex: string // MuSig2 signing key
  peerId: string
  transactionTypes: TransactionType[]
  // ...

  // NEW: Main wallet address for contact integration
  mainWalletAddress?: string // PRIMARY account address
  mainWalletPublicKey?: string // PRIMARY account public key
}

// When advertising
async function advertiseSigner(): Promise<void> {
  const walletStore = useWalletStore()

  // Get MuSig2 key for signing
  const musig2PublicKey = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)

  // Get PRIMARY address for contact integration
  const mainAddress = walletStore.getAddress(AccountPurpose.PRIMARY)
  const mainPublicKey = walletStore.getPublicKeyHex(AccountPurpose.PRIMARY)

  await musig2Coordinator.advertiseSigner(musig2PublicKey, {
    mainWalletAddress: mainAddress,
    mainWalletPublicKey: mainPublicKey,
    // ... other options
  })
}

// When saving contact from signer
async function addFromSigner(signer: DiscoveredSigner): Promise<Contact> {
  // Use main wallet address if available, otherwise derive from MuSig2 key
  const address =
    signer.mainWalletAddress || deriveAddressFromPublicKey(signer.publicKeyHex)

  return addContact({
    name: signer.nickname || `Signer ${signer.publicKeyHex.slice(0, 8)}`,
    address,
    publicKey: signer.mainWalletPublicKey || signer.publicKeyHex,
    // ...
  })
}
```

| Task                                                    | Priority | Status         |
| ------------------------------------------------------- | -------- | -------------- |
| 8.5.1 Update SignerAdvertisement interface in lotus-sdk | P0       | ⬜ Not Started |
| 8.5.2 Include main wallet address in advertisements     | P0       | ⬜ Not Started |
| 8.5.3 Update `addFromSigner()` to use main address      | P0       | ⬜ Not Started |
| 8.5.4 Update signer discovery to parse new fields       | P0       | ⬜ Not Started |

---

## Testing Checklist

### Chronik Subscriptions

- [ ] PRIMARY account addresses are subscribed
- [ ] Shared wallet aggregated addresses are subscribed
- [ ] MUSIG2 account keys are NOT subscribed
- [ ] New shared wallets trigger subscription updates

### Contact Persistence

- [ ] Contacts added from shared wallet context persist
- [ ] Participant "Contact" badge shows after refresh
- [ ] Contact lookup works by publicKeyHex

### Network-Aware Addresses

- [ ] Addresses update when network switches
- [ ] Shared wallets work on both livenet and testnet
- [ ] Clear network indicator in UI

### Online Status

- [ ] Accurate online/offline detection
- [ ] Recently online threshold works (5 min)
- [ ] WebRTC reachability (if implemented)

### P2P Advertisements

- [ ] Main wallet address included in advertisements
- [ ] Contacts saved from signers have correct address
- [ ] Backward compatibility with old advertisement format

---

## Files Summary

| File                                              | Change Type | Description                           |
| ------------------------------------------------- | ----------- | ------------------------------------- |
| `services/chronik.ts`                             | MODIFY      | Subscription filtering                |
| `stores/wallet.ts`                                | MODIFY      | Network-aware derivation              |
| `stores/contacts.ts`                              | MODIFY      | Persistence fix, addFromSigner update |
| `stores/musig2.ts`                                | MODIFY      | Network-aware shared wallets          |
| `services/musig2.ts`                              | MODIFY      | Advertisement with main address       |
| `components/shared-wallets/ParticipantList.vue`   | MODIFY      | Contact lookup fix                    |
| `lotus-sdk/lib/p2p/musig2/discovery-extension.ts` | MODIFY      | Advertisement format                  |

---

## Success Criteria

- [ ] Chronik only subscribes to receivable addresses
- [ ] Contacts persist correctly in all contexts
- [ ] Shared wallets work across network switches
- [ ] Contacts from signers have main wallet address
- [ ] All tests pass

---

## Dependencies

- **Phase 2**: BIP44 multi-account (for AccountPurpose)
- **Phase 4**: Contact system (for addFromSigner)
- **Phase 5**: MuSig2 integration (for shared wallets)

## Dependents

- **Phase 7**: Polish (final testing)

---

_Created: December 18, 2025_  
_Status: Pending_
