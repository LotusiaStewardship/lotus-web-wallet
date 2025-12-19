# Phase 5: MuSig2 Integration

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: Phase 2 (BIP44), Phase 3 (P2P), Phase 4 (Contacts)

---

## Overview

This phase integrates MuSig2 functionality with the unified identity model and BIP44 multi-address architecture. It implements proper key aggregation for shared wallets, uses the dedicated MuSig2 signing key, and enables offline wallet viewing.

### N-of-N Architecture

MuSig2 shared wallets are **always n-of-n** (all participants must sign):

- **2-of-2**: Two participants, both must sign
- **3-of-3**: Three participants, all must sign
- **5-of-5**: Five participants, all must sign
- **N-of-N**: Any number of participants, all must sign

> **Note**: This differs from FROST which supports m-of-n thresholds. MuSig2 requires **unanimous consent** from all participants.

The implementation must:

- Support arbitrary participant counts (2, 3, 5, 10+)
- Coordinate signing sessions across all n participants
- Track online status for all participants
- Only allow spending when all participants are available

---

## Goals

1. Implement MuSig2 key aggregation for n-of-n shared wallets (any participant count)
2. Use dedicated MUSIG2 account key for signing operations
3. Enable offline viewing of shared wallets (P2P only for spending)
4. Fix participant online status display for all n participants
5. Integrate with contact system for participant resolution
6. Coordinate n-party signing sessions

---

## Issues Addressed

| Issue            | Description                              | Priority |
| ---------------- | ---------------------------------------- | -------- |
| Address pending  | Shared wallet shows "Address pending..." | HIGH     |
| Key isolation    | Spending key used for MuSig2 signing     | HIGH     |
| Offline blocked  | Can't view wallets without P2P           | MEDIUM   |
| Status incorrect | Participants show offline incorrectly    | MEDIUM   |

---

## Tasks

### 5.1 Implement Key Aggregation in createSharedWallet

**File**: `stores/musig2.ts` (MODIFY)

```typescript
import { getBitcore } from '~/plugins/bitcore.client'
import { useNetworkStore } from './network'
import { useWalletStore } from './wallet'
import { AccountPurpose } from '~/types/accounts'

/**
 * Create a shared wallet with MuSig2 key aggregation
 *
 * Uses Taproot-based MuSig2 for:
 * - Privacy: Multi-sig looks identical to single-sig on-chain
 * - Efficiency: ~78% smaller transaction size vs P2SH multisig
 * - Security: Proper MuSig2 key path spending with tweak handling
 */
async createSharedWallet(config: {
  name: string
  description?: string
  participantPublicKeys: string[]
}): Promise<SharedWallet> {
  if (!this.initialized) {
    throw new Error('MuSig2 not initialized')
  }

  if (config.participantPublicKeys.length < 2) {
    throw new Error('Shared wallet requires at least 2 participants')
  }

  // MuSig2 is n-of-n: all participants must sign
  const participantCount = config.participantPublicKeys.length + 1 // +1 for self
  console.log(`[MuSig2 Store] Creating ${participantCount}-of-${participantCount} wallet`)

  const Bitcore = getBitcore()
  if (!Bitcore) {
    throw new Error('Bitcore SDK not loaded')
  }

  const { createMuSigTaprootAddress, PublicKey } = Bitcore
  const networkStore = useNetworkStore()
  const walletStore = useWalletStore()

  // Get my MuSig2 public key (from dedicated account)
  const myPublicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)
  if (!myPublicKeyHex) {
    throw new Error('MuSig2 key not available')
  }

  // Ensure my key is in the participant list
  const allKeys = [...config.participantPublicKeys]
  if (!allKeys.includes(myPublicKeyHex)) {
    allKeys.push(myPublicKeyHex)
  }

  // Convert hex strings to PublicKey objects
  const publicKeys = allKeys.map(hex => new PublicKey(hex))

  let aggregatedKeyHex: string
  let sharedAddress: string

  try {
    // Create Taproot MuSig2 address
    const taprootResult = createMuSigTaprootAddress(
      publicKeys,
      networkStore.network,
    )

    aggregatedKeyHex = taprootResult.commitment.toString()
    sharedAddress = taprootResult.address.toString()

    console.log('[MuSig2 Store] Created Taproot MuSig2 address:', {
      participants: publicKeys.length,
      address: sharedAddress.slice(0, 30) + '...',
    })
  } catch (error) {
    console.error('[MuSig2 Store] Key aggregation failed:', error)
    throw new Error('Failed to aggregate public keys: ' + (error as Error).message)
  }

  // Create wallet with computed address
  const walletId = generateId('wallet')
  const wallet: SharedWallet = {
    id: walletId,
    name: config.name,
    description: config.description,
    participants: allKeys.map(pubKeyHex => ({
      peerId: '', // Will be populated when participant connects
      publicKeyHex: pubKeyHex,
      nickname: undefined,
      isMe: pubKeyHex === myPublicKeyHex,
    })),
    aggregatedPublicKeyHex: aggregatedKeyHex,
    sharedAddress,
    balanceSats: '0',
    createdAt: Date.now(),
  }

  this.sharedWallets.push(wallet)
  this._saveSharedWallets()

  console.log('[MuSig2 Store] Created shared wallet:', {
    id: walletId,
    name: config.name,
    participants: allKeys.length,
    sharedAddress: sharedAddress.slice(0, 30) + '...',
  })

  return wallet
}
```

| Task                                             | Priority | Status         |
| ------------------------------------------------ | -------- | -------------- |
| Import Bitcore and use createMuSigTaprootAddress | P0       | ⬜ Not Started |
| Get MuSig2 key from dedicated account            | P0       | ⬜ Not Started |
| Compute aggregated key and address               | P0       | ⬜ Not Started |
| Store computed address in wallet                 | P0       | ⬜ Not Started |

---

### 5.2 Update CreateSharedWalletModal

**File**: `components/musig2/CreateSharedWalletModal.vue` (MODIFY)

```vue
<script setup lang="ts">
import { AccountPurpose } from '~/types/accounts'

const walletStore = useWalletStore()
const contactStore = useContactsStore()
const musig2Store = useMuSig2Store()

// Form state
const name = ref('')
const description = ref('')
const selectedContacts = ref<Contact[]>([])

// My MuSig2 public key
const myPublicKey = computed(() => {
  return walletStore.getPublicKeyHex(AccountPurpose.MUSIG2) || ''
})

// All participant public keys (self + selected contacts)
const participantPublicKeys = computed(() => {
  const keys: string[] = []

  // Add my key
  if (myPublicKey.value) {
    keys.push(myPublicKey.value)
  }

  // Add selected contacts' keys
  for (const contact of selectedContacts.value) {
    const pubKey = contact.identityId || contact.publicKey
    if (pubKey && !keys.includes(pubKey)) {
      keys.push(pubKey)
    }
  }

  return keys
})

// Only show MuSig2-eligible contacts
const eligibleContacts = computed(() => {
  return contactStore.signerContacts
})

async function handleCreate() {
  if (participantPublicKeys.value.length < 2) {
    toast.add({
      title: 'Invalid Configuration',
      description: 'Shared wallet requires at least 2 participants',
      color: 'error',
    })
    return
  }

  try {
    const wallet = await musig2Store.createSharedWallet({
      name: name.value,
      description: description.value || undefined,
      participantPublicKeys: participantPublicKeys.value,
    })

    toast.add({
      title: 'Wallet Created',
      description: `${wallet.name} created with ${wallet.participants.length} participants`,
      color: 'success',
    })

    emit('created', wallet)
    close()
  } catch (error) {
    toast.add({
      title: 'Creation Failed',
      description:
        error instanceof Error ? error.message : 'Failed to create wallet',
      color: 'error',
    })
  }
}
</script>

<template>
  <UModal v-model="open">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Create Shared Wallet</h3>
      </template>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <!-- Name -->
        <UFormField label="Wallet Name" required>
          <UInput v-model="name" placeholder="Family Fund" />
        </UFormField>

        <!-- Description -->
        <UFormField label="Description">
          <UTextarea
            v-model="description"
            placeholder="Optional description..."
          />
        </UFormField>

        <!-- Participant Selection -->
        <UFormField label="Participants">
          <p class="text-sm text-muted mb-2">
            Select contacts to include. You will be added automatically.
          </p>
          <ContactSelector
            v-model="selectedContacts"
            :contacts="eligibleContacts"
            multiple
            require-musig2
          />
        </UFormField>

        <!-- N-of-N Preview -->
        <div
          v-if="participantPublicKeys.length >= 2"
          class="p-3 bg-muted/30 rounded-lg"
        >
          <p class="text-sm font-medium">
            {{ participantPublicKeys.length }}-of-{{
              participantPublicKeys.length
            }}
            Wallet
          </p>
          <p class="text-xs text-muted">
            All {{ participantPublicKeys.length }} participants must sign to
            spend funds (MuSig2 n-of-n).
          </p>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="close">
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!name || participantPublicKeys.length < 2"
            @click="handleCreate"
          >
            Create Wallet
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
```

| Task                                      | Priority | Status         |
| ----------------------------------------- | -------- | -------------- |
| Use MuSig2 account key instead of primary | P0       | ⬜ Not Started |
| Filter to MuSig2-eligible contacts        | P0       | ⬜ Not Started |
| Support selecting multiple contacts (n-1) | P0       | ⬜ Not Started |
| Show n-of-n participant count preview     | P1       | ⬜ Not Started |

---

### 5.3 Enable Offline Wallet Viewing

**File**: `pages/people/shared-wallets/[id].vue` (MODIFY)

```vue
<script setup lang="ts">
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

// Separate view vs spend permissions
const canView = computed(() => true) // Always allowed

const canSpend = computed(() => {
  // For n-of-n MuSig2, all participants must be online to spend
  const allParticipantsOnline =
    wallet.value?.participants.every(
      p => p.isMe || getParticipantStatus(p) === 'online',
    ) ?? false

  return (
    p2pStore.connected &&
    p2pStore.dhtReady &&
    BigInt(wallet.value?.balanceSats || '0') > 0n &&
    allParticipantsOnline
  )
})

const spendDisabledReason = computed(() => {
  if (!p2pStore.connected) return 'Connect to P2P network to spend'
  if (!p2pStore.dhtReady) return 'Waiting for DHT to initialize...'
  if (BigInt(wallet.value?.balanceSats || '0') === 0n)
    return 'No funds to spend'

  // Check if all n participants are online (n-of-n requirement)
  const offlineParticipants =
    wallet.value?.participants.filter(
      p => !p.isMe && getParticipantStatus(p) !== 'online',
    ) ?? []

  if (offlineParticipants.length > 0) {
    const names = offlineParticipants.map(p => getDisplayName(p)).join(', ')
    return `Waiting for all participants: ${names} offline`
  }

  return null
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back Navigation - Always visible -->
    <div class="flex items-center gap-2">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/people/shared-wallets"
      >
        Back to Wallets
      </UButton>
    </div>

    <!-- Wallet Detail - Always visible if wallet exists -->
    <template v-if="wallet">
      <!-- Header Card -->
      <UiAppCard>
        <div class="text-center py-4">
          <h2 class="text-xl font-semibold">{{ wallet.name }}</h2>
          <p v-if="wallet.description" class="text-muted mt-1">
            {{ wallet.description }}
          </p>
          <div class="mt-3">
            <CommonAddressFingerprint
              :address="wallet.sharedAddress"
              copyable
            />
          </div>
        </div>
      </UiAppCard>

      <!-- Balance Card -->
      <UiAppCard title="Balance" icon="i-lucide-wallet">
        <div class="text-center py-6">
          <CommonAmountDisplay
            :sats="wallet.balanceSats"
            show-symbol
            size="xl"
            mono
          />
        </div>

        <div class="flex gap-3">
          <UButton
            class="flex-1"
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            @click="showFundModal = true"
          >
            Fund
          </UButton>

          <UButton
            class="flex-1"
            color="primary"
            icon="i-lucide-send"
            :disabled="!canSpend"
            :title="spendDisabledReason"
            @click="showSpendModal = true"
          >
            Spend
          </UButton>
        </div>

        <!-- P2P Required Notice -->
        <UAlert
          v-if="!canSpend && spendDisabledReason"
          color="warning"
          variant="subtle"
          class="mt-4"
        >
          <template #description>
            {{ spendDisabledReason }}
          </template>
        </UAlert>
      </UiAppCard>

      <!-- Tabs - Always visible -->
      <UTabs v-model="selectedTab" :items="tabs" class="w-full">
        <!-- Tab content... -->
      </UTabs>
    </template>
  </div>
</template>
```

| Task                             | Priority | Status         |
| -------------------------------- | -------- | -------------- |
| Separate canView from canSpend   | P0       | ⬜ Not Started |
| Show wallet details without P2P  | P0       | ⬜ Not Started |
| Disable spend button with reason | P0       | ⬜ Not Started |
| Show P2P required alert          | P1       | ⬜ Not Started |

---

### 5.4 Fix Participant Online Status

**File**: `components/shared-wallets/ParticipantList.vue` (MODIFY)

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
import { useP2PStore } from '~/stores/p2p'

const contactStore = useContactsStore()
const identityStore = useIdentityStore()
const p2pStore = useP2PStore()

const RECENTLY_ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

type ParticipantStatus = 'online' | 'recently_online' | 'offline'

/**
 * Get detailed online status for a participant using multiple signals
 */
function getParticipantStatus(
  participant: SharedWalletParticipant,
): ParticipantStatus {
  // Self is always online
  if (participant.isMe) return 'online'

  // Signal 1: Direct P2P connection
  if (participant.peerId) {
    if (p2pStore.connectedPeers.some(p => p.peerId === participant.peerId)) {
      return 'online'
    }
  }

  // Signal 2: Identity presence
  const identity = identityStore.get(participant.publicKeyHex)
  if (identity?.isOnline) {
    return 'online'
  }

  // Signal 3: Contact lastSeenOnline
  const contact = contactStore.findByPublicKey(participant.publicKeyHex)
  if (contact) {
    const contactIdentity = contact.identityId
      ? identityStore.get(contact.identityId)
      : null

    if (contactIdentity?.lastSeenAt) {
      const timeSinceLastSeen = Date.now() - contactIdentity.lastSeenAt
      if (timeSinceLastSeen < RECENTLY_ONLINE_THRESHOLD) {
        return 'recently_online'
      }
    }
  }

  return 'offline'
}

function getStatusColor(status: ParticipantStatus): string {
  switch (status) {
    case 'online':
      return 'bg-success-500'
    case 'recently_online':
      return 'bg-amber-500'
    case 'offline':
      return 'bg-gray-400'
  }
}

function getStatusLabel(status: ParticipantStatus): string {
  switch (status) {
    case 'online':
      return 'Online'
    case 'recently_online':
      return 'Recently Online'
    case 'offline':
      return 'Offline'
  }
}

/**
 * Get display name for participant (contact name or fallback)
 */
function getDisplayName(participant: SharedWalletParticipant): string {
  if (participant.isMe) return 'You'
  if (participant.nickname) return participant.nickname

  const contact = contactStore.findByPublicKey(participant.publicKeyHex)
  if (contact) return contact.name

  return `Signer ${participant.publicKeyHex.slice(0, 8)}`
}
```

| Task                                    | Priority | Status         |
| --------------------------------------- | -------- | -------------- |
| Implement multi-signal status detection | P0       | ⬜ Not Started |
| Add status color and label helpers      | P0       | ⬜ Not Started |
| Resolve participant to contact name     | P0       | ⬜ Not Started |

---

### 5.5 Use MuSig2 Key for Signing Operations

**File**: `services/musig2.ts` (MODIFY)

```typescript
import { AccountPurpose } from '~/types/accounts'

/**
 * Get the MuSig2 signing key for the current wallet
 */
export function getMuSig2SigningKey(): {
  privateKeyHex: string
  publicKeyHex: string
} | null {
  const walletStore = useWalletStore()

  const privateKeyHex = walletStore.getPrivateKeyHex(AccountPurpose.MUSIG2)
  const publicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)

  if (!privateKeyHex || !publicKeyHex) {
    console.error('[MuSig2 Service] MuSig2 key not available')
    return null
  }

  return { privateKeyHex, publicKeyHex }
}

/**
 * Sign a transaction using the MuSig2 key
 */
export async function signWithMuSig2Key(
  sessionId: string,
  transaction: Transaction,
): Promise<PartialSignature> {
  const signingKey = getMuSig2SigningKey()
  if (!signingKey) {
    throw new Error('MuSig2 signing key not available')
  }

  // Use the dedicated MuSig2 key for signing
  return musig2Coordinator.sign(
    sessionId,
    transaction,
    signingKey.privateKeyHex,
  )
}
```

| Task                                          | Priority | Status         |
| --------------------------------------------- | -------- | -------------- |
| Add `getMuSig2SigningKey()` function          | P0       | ⬜ Not Started |
| Update signing operations to use MuSig2 key   | P0       | ⬜ Not Started |
| Update advertisement to use MuSig2 public key | P0       | ⬜ Not Started |

---

### 5.6 Update Signer Advertisement

**File**: `services/musig2.ts` (MODIFY)

```typescript
/**
 * Advertise as a MuSig2 signer using the dedicated MuSig2 key
 */
export async function advertiseSigner(
  transactionTypes: TransactionType[],
  options?: AdvertiseOptions,
): Promise<string> {
  const walletStore = useWalletStore()

  // Use MuSig2 public key for advertisement
  const publicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)
  if (!publicKeyHex) {
    throw new Error('MuSig2 key not available')
  }

  const Bitcore = getBitcore()
  const publicKey = new Bitcore.PublicKey(publicKeyHex)

  console.log(
    '[MuSig2 Service] Advertising with MuSig2 key:',
    publicKeyHex.slice(0, 20) + '...',
  )

  return musig2Coordinator.advertiseSigner(publicKey, transactionTypes, options)
}
```

| Task                                    | Priority | Status         |
| --------------------------------------- | -------- | -------------- |
| Use MuSig2 public key for advertisement | P0       | ⬜ Not Started |
| Log which key is being used             | P1       | ⬜ Not Started |

---

## Testing Checklist

### N-of-N Key Aggregation

- [ ] Create 2-of-2 shared wallet → address computed
- [ ] Create 3-of-3 shared wallet → address computed
- [ ] Create 5-of-5 shared wallet → address computed
- [ ] Create 10-of-10 shared wallet → address computed
- [ ] Same participants in different order → same address (deterministic)
- [ ] Shared address is valid Lotus address format

### Key Isolation

- [ ] MuSig2 operations use MUSIG2 account key
- [ ] Spending operations use PRIMARY account key
- [ ] Advertisement uses MuSig2 public key
- [ ] Signing uses MuSig2 private key

### Offline Viewing

- [ ] View shared wallet details without P2P
- [ ] View participants without P2P
- [ ] Spend button disabled without P2P
- [ ] Helpful message shown when P2P required

### N-of-N Participant Status

- [ ] All n participants displayed with status
- [ ] Connected peer shows as "Online"
- [ ] Recent activity shows as "Recently Online"
- [ ] No activity shows as "Offline"
- [ ] Self always shows as "Online"
- [ ] Spend blocked until all n participants online
- [ ] Offline participant names shown in disabled reason

---

## Files Summary

| File                                            | Change Type | Description                        |
| ----------------------------------------------- | ----------- | ---------------------------------- |
| `stores/musig2.ts`                              | MODIFY      | Key aggregation, MuSig2 key usage  |
| `services/musig2.ts`                            | MODIFY      | MuSig2 key for signing/advertising |
| `components/musig2/CreateSharedWalletModal.vue` | MODIFY      | Use MuSig2 key, contact selection  |
| `pages/people/shared-wallets/[id].vue`          | MODIFY      | Offline viewing                    |
| `components/shared-wallets/ParticipantList.vue` | MODIFY      | Multi-signal status                |

---

## Success Criteria

- [ ] N-of-N shared wallets work for 2, 3, 5, 10+ participants
- [ ] Shared wallets have computed addresses (not "pending")
- [ ] MuSig2 operations use dedicated key
- [ ] Shared wallets viewable without P2P
- [ ] Participant status uses multiple signals for all n participants
- [ ] Contact names shown for all participants
- [ ] Spending requires all n participants online

---

## Dependencies

- **Phase 2**: MUSIG2 account key
- **Phase 3**: P2P infrastructure
- **Phase 4**: Contact-identity linking

## Dependents

- **Phase 6**: Uses MuSig2 integration for UI

---

_Created: December 18, 2025_  
_Status: Pending_
