# 10: MuSig2 System

## Overview

This document details the implementation of the complete MuSig2 flow. The current implementation is missing Phase 1 (Key Aggregation) and Phase 2 (Address Funding) entirely.

---

## Current Problems (from MUSIG2_UI_GAP_ANALYSIS.md)

1. **Phase 1 Missing** - No UI to create aggregated keys/shared addresses
2. **Phase 2 Missing** - No UI to fund or view shared wallet balances
3. **Phase 3 Partial** - Signing works but incoming requests not shown
4. **No shared wallet concept** - Users can't manage multi-sig wallets
5. **No transaction preview** - Users sign blind

---

## MuSig2 Complete Flow

```
Phase 1: Key Aggregation (Setup)
┌─────────────────────────────────────────────────────────────────────┐
│  1. Collect public keys from all participants                        │
│  2. Sort keys lexicographically                                      │
│  3. Compute aggregated public key                                    │
│  4. Derive shared address                                            │
│  5. Store configuration                                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
Phase 2: Funding (Deposit)
┌─────────────────────────────────────────────────────────────────────┐
│  1. Any participant sends funds to shared address                    │
│  2. Track balance of shared address                                  │
│  3. All participants can view balance                                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
Phase 3: Signing (Spend)
┌─────────────────────────────────────────────────────────────────────┐
│  Round 1: Nonce Exchange                                             │
│  Round 2: Partial Signature Exchange                                 │
│  Broadcast: Submit signed transaction                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Store: musig2.ts

```typescript
// stores/musig2.ts

interface MuSig2State {
  // Initialization
  initialized: boolean
  error: string | null

  // Discovery
  discoveredSigners: SignerAdvertisement[]

  // My Signer
  signerEnabled: boolean
  signerConfig: SignerConfig | null

  // Sessions
  activeSessions: Map<string, SigningSession>

  // Requests
  incomingRequests: IncomingSigningRequest[]
  outgoingRequests: OutgoingSigningRequest[]

  // Shared Wallets (NEW)
  sharedWallets: SharedWallet[]
}

interface SharedWallet {
  id: string
  name: string
  description?: string

  // Participants
  participants: SharedWalletParticipant[]
  threshold: number // n-of-n for MuSig2

  // Keys
  aggregatedPublicKey: string
  sharedAddress: string

  // Balance (tracked)
  balance: bigint
  utxos: UTXO[]

  // Metadata
  createdAt: number
  updatedAt: number
}

interface SharedWalletParticipant {
  publicKey: string
  nickname?: string
  peerId?: string
  contactId?: string
  isMe: boolean
}

export const useMuSig2Store = defineStore('musig2', () => {
  const p2pStore = useP2PStore()
  const walletStore = useWalletStore()
  const contactStore = useContactStore()

  // State
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const discoveredSigners = ref<SignerAdvertisement[]>([])
  const signerEnabled = ref(false)
  const signerConfig = ref<SignerConfig | null>(null)
  const activeSessions = ref<Map<string, SigningSession>>(new Map())
  const incomingRequests = ref<IncomingSigningRequest[]>([])
  const outgoingRequests = ref<OutgoingSigningRequest[]>([])
  const sharedWallets = ref<SharedWallet[]>([])

  // Private
  let musig2Coordinator: MuSig2P2PCoordinator | null = null

  // Initialization
  async function initialize() {
    const coordinator = p2pStore.getCoordinator()
    if (!coordinator) {
      throw new Error('P2P not initialized')
    }

    musig2Coordinator = new MuSig2P2PCoordinator(coordinator, {
      // config
    })

    await musig2Coordinator.initialize()

    // Set up event handlers
    musig2Coordinator.on('signer-discovered', handleSignerDiscovered)
    musig2Coordinator.on('signer-removed', handleSignerRemoved)
    musig2Coordinator.on('session-request', handleSessionRequest)
    musig2Coordinator.on('session-update', handleSessionUpdate)

    // Subscribe to signers
    await musig2Coordinator.subscribeToSigners({
      transactionTypes: [
        TransactionType.SPEND,
        TransactionType.COINJOIN,
        TransactionType.ESCROW,
      ],
    })

    // Load saved shared wallets
    loadSharedWallets()

    // Refresh shared wallet balances
    await refreshSharedWalletBalances()

    initialized.value = true
  }

  async function cleanup() {
    if (musig2Coordinator) {
      await musig2Coordinator.cleanup()
      musig2Coordinator = null
    }
    initialized.value = false
  }

  // Shared Wallets (Phase 1)
  async function createSharedWallet(
    config: CreateSharedWalletConfig,
  ): Promise<SharedWallet> {
    const { musigKeyAgg } = await import('lotus-sdk')

    // Collect public keys (mine + participants)
    const myPublicKey = walletStore.publicKey
    const participantKeys = config.participants.map(p => p.publicKey)
    const allKeys = [myPublicKey, ...participantKeys]

    // Aggregate keys
    const ctx = musigKeyAgg(allKeys.map(k => Buffer.from(k, 'hex')))
    const aggregatedPubKey = ctx.aggregatedPubKey.toString('hex')

    // Derive shared address
    const { Address } = getBitcoreSDK()
    const sharedAddress = Address.fromPublicKey(
      ctx.aggregatedPubKey,
      walletStore.network,
    ).toString()

    // Create wallet object
    const wallet: SharedWallet = {
      id: crypto.randomUUID(),
      name: config.name,
      description: config.description,
      participants: [
        {
          publicKey: myPublicKey,
          nickname: 'You',
          isMe: true,
        },
        ...config.participants.map(p => ({
          publicKey: p.publicKey,
          nickname: p.nickname,
          peerId: p.peerId,
          contactId: p.contactId,
          isMe: false,
        })),
      ],
      threshold: allKeys.length, // n-of-n
      aggregatedPublicKey: aggregatedPubKey,
      sharedAddress,
      balance: 0n,
      utxos: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    sharedWallets.value.push(wallet)
    saveSharedWallets()

    return wallet
  }

  async function deleteSharedWallet(walletId: string) {
    sharedWallets.value = sharedWallets.value.filter(w => w.id !== walletId)
    saveSharedWallets()
  }

  async function refreshSharedWalletBalances() {
    const { fetchAddressUtxos } = useChronik()

    for (const wallet of sharedWallets.value) {
      try {
        const utxos = await fetchAddressUtxos(wallet.sharedAddress)
        wallet.utxos = utxos
        wallet.balance = utxos.reduce((sum, u) => sum + BigInt(u.value), 0n)
        wallet.updatedAt = Date.now()
      } catch (e) {
        console.error(`Failed to refresh balance for ${wallet.name}:`, e)
      }
    }

    saveSharedWallets()
  }

  // Funding (Phase 2)
  async function fundSharedWallet(
    walletId: string,
    amount: bigint,
  ): Promise<string> {
    const wallet = sharedWallets.value.find(w => w.id === walletId)
    if (!wallet) throw new Error('Wallet not found')

    // Use regular send to shared address
    const draftStore = useDraftStore()
    draftStore.initializeDraft()
    draftStore.updateRecipientAddress(
      draftStore.recipients[0].id,
      wallet.sharedAddress,
    )
    draftStore.updateRecipientAmount(draftStore.recipients[0].id, amount)

    const result = await draftStore.send()

    // Refresh balance after funding
    await refreshSharedWalletBalances()

    return result.txid
  }

  // Spending (Phase 3)
  async function proposeSpend(
    walletId: string,
    proposal: SpendProposal,
  ): Promise<string> {
    const wallet = sharedWallets.value.find(w => w.id === walletId)
    if (!wallet) throw new Error('Wallet not found')

    // Build unsigned transaction
    const { Transaction } = getBitcoreSDK()
    const tx = new Transaction()

    // Add inputs from shared wallet UTXOs
    for (const utxo of wallet.utxos) {
      tx.from({
        txId: utxo.txid,
        outputIndex: utxo.outIdx,
        script: utxo.script,
        satoshis: parseInt(utxo.value),
      })
    }

    // Add outputs
    tx.to(proposal.recipient, Number(proposal.amount))
    tx.change(wallet.sharedAddress)
    tx.fee(Number(proposal.fee || 1000n))

    // Create signing session
    const sessionId = await musig2Coordinator!.createSession({
      transactionType: TransactionType.SPEND,
      participants: wallet.participants
        .filter(p => !p.isMe)
        .map(p => p.peerId!),
      message: tx.serialize(),
      metadata: {
        walletId,
        walletName: wallet.name,
        recipient: proposal.recipient,
        amount: proposal.amount.toString(),
        purpose: proposal.purpose,
      },
    })

    return sessionId
  }

  // Session Management
  async function acceptRequest(requestId: string) {
    const request = incomingRequests.value.find(r => r.id === requestId)
    if (!request) throw new Error('Request not found')

    await musig2Coordinator!.acceptSession(request.sessionId)

    // Move to active sessions
    incomingRequests.value = incomingRequests.value.filter(
      r => r.id !== requestId,
    )
  }

  async function rejectRequest(requestId: string, reason?: string) {
    const request = incomingRequests.value.find(r => r.id === requestId)
    if (!request) throw new Error('Request not found')

    await musig2Coordinator!.rejectSession(request.sessionId, reason)

    incomingRequests.value = incomingRequests.value.filter(
      r => r.id !== requestId,
    )
  }

  async function abortSession(sessionId: string, reason: string) {
    await musig2Coordinator!.abortSession(sessionId, reason)
    activeSessions.value.delete(sessionId)
  }

  // Event Handlers
  function handleSignerDiscovered(signer: SignerAdvertisement) {
    const existing = discoveredSigners.value.findIndex(
      s => s.peerId === signer.peerId,
    )
    if (existing >= 0) {
      discoveredSigners.value[existing] = signer
    } else {
      discoveredSigners.value.push(signer)
    }
  }

  function handleSignerRemoved(peerId: string) {
    discoveredSigners.value = discoveredSigners.value.filter(
      s => s.peerId !== peerId,
    )
  }

  function handleSessionRequest(request: IncomingSigningRequest) {
    incomingRequests.value.push(request)

    // Show notification
    useNotifications().warning(
      'Signing Request',
      `${request.fromNickname || 'Someone'} wants you to co-sign a transaction`,
    )
  }

  function handleSessionUpdate(update: SessionUpdate) {
    const session = activeSessions.value.get(update.sessionId)
    if (session) {
      session.state = update.state
      session.updatedAt = Date.now()

      if (update.state === 'completed') {
        useNotifications().success(
          'Signing Complete',
          'Transaction has been signed and broadcast',
        )
      }
    }
  }

  // Persistence
  function saveSharedWallets() {
    const data = sharedWallets.value.map(w => ({
      ...w,
      balance: w.balance.toString(),
      utxos: w.utxos,
    }))
    localStorage.setItem('lotus_shared_wallets', JSON.stringify(data))
  }

  function loadSharedWallets() {
    const saved = localStorage.getItem('lotus_shared_wallets')
    if (saved) {
      const data = JSON.parse(saved)
      sharedWallets.value = data.map((w: any) => ({
        ...w,
        balance: BigInt(w.balance || '0'),
      }))
    }
  }

  return {
    // State
    initialized,
    error,
    discoveredSigners,
    signerEnabled,
    signerConfig,
    activeSessions,
    incomingRequests,
    outgoingRequests,
    sharedWallets,

    // Actions
    initialize,
    cleanup,
    createSharedWallet,
    deleteSharedWallet,
    refreshSharedWalletBalances,
    fundSharedWallet,
    proposeSpend,
    acceptRequest,
    rejectRequest,
    abortSession,
  }
})
```

---

## Component: CreateSharedWalletModal.vue

```vue
<script setup lang="ts">
const open = defineModel<boolean>('open')

const emit = defineEmits<{
  create: [config: CreateSharedWalletConfig]
}>()

const contactStore = useContactStore()
const { success, error } = useNotifications()

// Form state
const name = ref('')
const description = ref('')
const selectedContacts = ref<string[]>([])

// Get contacts with public keys
const eligibleContacts = computed(() =>
  contactStore.contactList.filter(c => c.publicKey),
)

const canCreate = computed(
  () => name.value.trim() && selectedContacts.value.length > 0,
)

function toggleContact(contactId: string) {
  const index = selectedContacts.value.indexOf(contactId)
  if (index >= 0) {
    selectedContacts.value.splice(index, 1)
  } else {
    selectedContacts.value.push(contactId)
  }
}

function handleCreate() {
  const participants = selectedContacts.value.map(id => {
    const contact = contactStore.contacts.get(id)!
    return {
      publicKey: contact.publicKey!,
      nickname: contact.name,
      peerId: contact.peerId,
      contactId: id,
    }
  })

  emit('create', {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    participants,
  })

  // Reset form
  name.value = ''
  description.value = ''
  selectedContacts.value = []
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    name.value = ''
    description.value = ''
    selectedContacts.value = []
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Create Shared Wallet</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Info -->
          <UAlert color="primary" icon="i-lucide-info">
            <template #description>
              A shared wallet requires all participants to sign every
              transaction. This is a {{ selectedContacts.length + 1 }}-of-{{
                selectedContacts.length + 1
              }}
              multi-signature wallet.
            </template>
          </UAlert>

          <!-- Name -->
          <UFormField label="Wallet Name" required>
            <UInput v-model="name" placeholder="e.g., Family Savings" />
          </UFormField>

          <!-- Description -->
          <UFormField label="Description" hint="Optional">
            <UTextarea
              v-model="description"
              placeholder="What is this wallet for?"
              :rows="2"
            />
          </UFormField>

          <!-- Participants -->
          <UFormField label="Participants" required>
            <p class="text-sm text-muted mb-2">
              Select contacts to include in this shared wallet. Only contacts
              with public keys can be added.
            </p>

            <div
              v-if="eligibleContacts.length"
              class="space-y-2 max-h-48 overflow-y-auto"
            >
              <div
                v-for="contact in eligibleContacts"
                :key="contact.id"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                :class="
                  selectedContacts.includes(contact.id) &&
                  'bg-primary-50 dark:bg-primary-900/20'
                "
                @click="toggleContact(contact.id)"
              >
                <UCheckbox
                  :model-value="selectedContacts.includes(contact.id)"
                  @click.stop
                  @update:model-value="toggleContact(contact.id)"
                />
                <ContactAvatar :contact="contact" size="sm" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ contact.name }}</p>
                  <p class="text-xs text-muted truncate">
                    {{ contact.address }}
                  </p>
                </div>
              </div>
            </div>

            <AppEmptyState
              v-else
              icon="i-lucide-users"
              title="No eligible contacts"
              description="Add contacts with public keys to create shared wallets"
            />
          </UFormField>

          <!-- Summary -->
          <div
            v-if="selectedContacts.length"
            class="p-3 bg-muted/50 rounded-lg"
          >
            <p class="text-sm font-medium mb-1">Wallet Summary</p>
            <p class="text-sm text-muted">
              {{ selectedContacts.length + 1 }} participants (you +
              {{ selectedContacts.length }} others)
            </p>
            <p class="text-sm text-muted">
              All {{ selectedContacts.length + 1 }} signatures required to spend
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton
              class="flex-1"
              color="neutral"
              variant="outline"
              @click="open = false"
            >
              Cancel
            </UButton>
            <UButton
              class="flex-1"
              color="primary"
              :disabled="!canCreate"
              @click="handleCreate"
            >
              Create Wallet
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Component: SharedWalletCard.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  wallet: SharedWallet
}>()

const emit = defineEmits<{
  fund: []
  spend: []
  viewDetails: []
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()

const onlineParticipants = computed(() => {
  // TODO: Check P2P presence for each participant
  return props.wallet.participants.filter(p => p.isMe).length
})
</script>

<template>
  <div
    class="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
    @click="emit('viewDetails')"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
      >
        <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">{{ wallet.name }}</p>
          <UBadge color="primary" variant="subtle" size="xs">
            {{ wallet.threshold }}-of-{{ wallet.participants.length }}
          </UBadge>
        </div>

        <p class="text-2xl font-bold mb-1">{{ formatXPI(wallet.balance) }}</p>

        <p class="text-sm text-muted">
          {{ wallet.participants.length }} participants •
          {{ onlineParticipants }} online • Updated
          {{ timeAgo(wallet.updatedAt) }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-1 flex-shrink-0">
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-plus"
          @click.stop="emit('fund')"
        >
          Fund
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-send"
          :disabled="wallet.balance === 0n"
          @click.stop="emit('spend')"
        >
          Spend
        </UButton>
      </div>
    </div>
  </div>
</template>
```

---

## Component: ProposeSpendModal.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  wallet: SharedWallet | null
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  propose: [proposal: SpendProposal]
}>()

const contactStore = useContactStore()
const { formatXPI, xpiToSats } = useAmount()
const { isValidAddress } = useAddress()

// Form
const recipient = ref('')
const amountInput = ref('')
const purpose = ref('')

const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

const recipientContact = computed(() =>
  contactStore.findByAddress(recipient.value),
)

const isValid = computed(() => {
  if (!props.wallet) return false
  if (!isValidAddress(recipient.value)) return false
  if (amountSats.value <= 0n) return false
  if (amountSats.value > props.wallet.balance) return false
  return true
})

function handlePropose() {
  emit('propose', {
    recipient: recipient.value,
    amount: amountSats.value,
    purpose: purpose.value || undefined,
  })
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    recipient.value = ''
    amountInput.value = ''
    purpose.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="wallet">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
            <span class="font-semibold"
              >Propose Spend from {{ wallet.name }}</span
            >
          </div>
        </template>

        <div class="space-y-4">
          <!-- Balance -->
          <div class="p-3 bg-muted/50 rounded-lg text-center">
            <p class="text-sm text-muted">Available Balance</p>
            <p class="text-2xl font-bold">{{ formatXPI(wallet.balance) }}</p>
          </div>

          <!-- Recipient -->
          <UFormField label="Recipient" required>
            <UInput v-model="recipient" placeholder="lotus_..." />
            <div v-if="recipientContact" class="flex items-center gap-2 mt-2">
              <ContactAvatar :contact="recipientContact" size="xs" />
              <span class="text-sm">{{ recipientContact.name }}</span>
            </div>
          </UFormField>

          <!-- Amount -->
          <UFormField
            label="Amount"
            :hint="`Max: ${formatXPI(wallet.balance)}`"
          >
            <UInput v-model="amountInput" type="number" placeholder="0.00">
              <template #trailing>
                <span class="text-muted">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Purpose -->
          <UFormField
            label="Purpose"
            hint="Helps other signers understand the transaction"
          >
            <UTextarea
              v-model="purpose"
              placeholder="What is this payment for?"
              :rows="2"
            />
          </UFormField>

          <!-- Signers Required -->
          <UAlert color="warning" icon="i-lucide-users">
            <template #description>
              This transaction requires {{ wallet.threshold }} signatures. All
              participants will be notified to approve.
            </template>
          </UAlert>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton
              class="flex-1"
              color="neutral"
              variant="outline"
              @click="open = false"
            >
              Cancel
            </UButton>
            <UButton
              class="flex-1"
              color="primary"
              :disabled="!isValid"
              @click="handlePropose"
            >
              Propose Transaction
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

_Next: [11_SETTINGS_PAGES.md](./11_SETTINGS_PAGES.md)_
