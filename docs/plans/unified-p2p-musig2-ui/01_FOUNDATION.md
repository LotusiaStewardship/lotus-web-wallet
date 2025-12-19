# Phase 1: Foundation & Shared Infrastructure

## Overview

This phase establishes the foundational elements required for both P2P and MuSig2 UI integration. It focuses on navigation structure, shared components, contact model extensions, and route setup.

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 32 & 33 Services Integration (complete)

---

## Objectives

1. Redesign the People hub as the central entry point for collaborative features
2. Create shared components used by both P2P and MuSig2 flows
3. Extend the Contact model with P2P/MuSig2 fields
4. Set up routes for shared wallets section

---

## Task 1.1: People Hub Redesign

The People section (`/people/`) becomes the hub for all collaborative features.

### Current State

```
/people/
├── index.vue      # Minimal redirect
├── contacts.vue   # Contact management
└── p2p.vue        # P2P network page
```

### Target State

```
/people/
├── index.vue              # Hub with overview stats and navigation
├── contacts.vue           # Contact management (existing)
├── p2p.vue                # P2P network hub (enhanced)
└── shared-wallets/
    ├── index.vue          # Shared wallets list
    └── [id].vue           # Wallet detail (dynamic route)
```

### Implementation: `pages/people/index.vue`

```vue
<script setup lang="ts">
definePageMeta({
  title: 'People',
})

const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()

// Stats for quick overview
const stats = computed(() => ({
  contacts: contactStore.contacts?.length || 0,
  contactsWithPublicKey: contactStore.contactsWithPublicKeys?.length || 0,
  sharedWallets: musig2Store.sharedWallets?.length || 0,
  onlineSigners:
    musig2Store.discoveredSigners?.filter(s => s.isOnline)?.length || 0,
  pendingRequests: musig2Store.incomingRequests?.length || 0,
  activeSessions: musig2Store.activeSessions?.size || 0,
}))

// P2P connection status
const isP2PConnected = computed(() => p2pStore.connected)
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
    >
      <template #actions>
        <UButton
          color="warning"
          variant="soft"
          size="sm"
          @click="navigateTo('/people/p2p?tab=requests')"
        >
          View Requests
        </UButton>
      </template>
    </UAlert>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink to="/people/contacts">
        <AppStatCard
          :value="stats.contacts"
          label="Contacts"
          icon="i-lucide-contact"
        />
      </NuxtLink>

      <NuxtLink to="/people/shared-wallets">
        <AppStatCard
          :value="stats.sharedWallets"
          label="Shared Wallets"
          icon="i-lucide-shield"
        />
      </NuxtLink>

      <NuxtLink to="/people/p2p?tab=signers">
        <AppStatCard
          :value="stats.onlineSigners"
          label="Online Signers"
          icon="i-lucide-radio"
        />
      </NuxtLink>

      <AppStatCard
        :value="isP2PConnected ? 'Online' : 'Offline'"
        label="P2P Status"
        icon="i-lucide-wifi"
        :icon-class="isP2PConnected ? 'text-green-500' : 'text-gray-400'"
      />
    </div>

    <!-- Section Links -->
    <div class="space-y-3">
      <NuxtLink to="/people/contacts" class="block">
        <AppCard class="hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-contact" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium">Contacts</p>
              <p class="text-sm text-muted-foreground">
                {{ stats.contacts }} contacts •
                {{ stats.contactsWithPublicKey }} MuSig2-ready
              </p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="w-5 h-5 text-muted-foreground"
            />
          </div>
        </AppCard>
      </NuxtLink>

      <NuxtLink to="/people/shared-wallets" class="block">
        <AppCard class="hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium">Shared Wallets</p>
              <p class="text-sm text-muted-foreground">
                {{ stats.sharedWallets }} multi-signature wallets
              </p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="w-5 h-5 text-muted-foreground"
            />
          </div>
        </AppCard>
      </NuxtLink>

      <NuxtLink to="/people/p2p" class="block">
        <AppCard class="hover:bg-muted/50 transition-colors">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-radio" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium">P2P Network</p>
              <p class="text-sm text-muted-foreground">
                {{ isP2PConnected ? 'Connected' : 'Disconnected' }} •
                {{ stats.onlineSigners }} signers available
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="w-2 h-2 rounded-full"
                :class="isP2PConnected ? 'bg-green-500' : 'bg-gray-400'"
              />
              <UIcon
                name="i-lucide-chevron-right"
                class="w-5 h-5 text-muted-foreground"
              />
            </div>
          </div>
        </AppCard>
      </NuxtLink>
    </div>

    <!-- Active Sessions (if any) -->
    <AppCard
      v-if="stats.activeSessions > 0"
      title="Active Sessions"
      icon="i-lucide-loader"
    >
      <p class="text-sm text-muted-foreground mb-3">
        {{ stats.activeSessions }} signing session{{
          stats.activeSessions > 1 ? 's' : ''
        }}
        in progress
      </p>
      <UButton
        color="primary"
        variant="soft"
        size="sm"
        @click="navigateTo('/people/p2p?tab=sessions')"
      >
        View Sessions
      </UButton>
    </AppCard>
  </div>
</template>
```

---

## Task 1.2: Shared Wallets Route Setup

Create the shared wallets pages.

### File: `pages/people/shared-wallets/index.vue`

```vue
<script setup lang="ts">
definePageMeta({
  title: 'Shared Wallets',
})

const musig2Store = useMuSig2Store()
const route = useRoute()

// Check if we should open create modal with pre-selected contact
const createWithContactId = computed(
  () => route.query.createWith as string | undefined,
)

// Modal state
const showCreateModal = ref(false)

// Open create modal if query param present
onMounted(() => {
  if (createWithContactId.value) {
    showCreateModal.value = true
  }
})

// Shared wallets list
const sharedWallets = computed(() => musig2Store.sharedWallets || [])
const isLoading = computed(() => musig2Store.loading)

// Refresh wallets
async function refreshWallets() {
  await musig2Store.refreshSharedWalletBalances()
}

// Navigate to wallet detail
function viewWallet(walletId: string) {
  navigateTo(`/people/shared-wallets/${walletId}`)
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 p-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <AppHeroCard
        icon="i-lucide-shield"
        title="Shared Wallets"
        subtitle="Multi-signature wallets for collaborative spending"
        class="flex-1"
      />
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="showCreateModal = true"
      >
        Create Wallet
      </UButton>
    </div>

    <!-- Wallet List -->
    <AppCard>
      <template v-if="isLoading">
        <AppLoadingState message="Loading shared wallets..." />
      </template>

      <template v-else-if="sharedWallets.length > 0">
        <Musig2SharedWalletList
          :wallets="sharedWallets"
          @view="viewWallet"
          @refresh="refreshWallets"
        />
      </template>

      <template v-else>
        <AppEmptyState
          icon="i-lucide-shield"
          title="No shared wallets yet"
          description="Create a shared wallet with your contacts to enable collaborative spending with multi-signature security."
        >
          <template #action>
            <UButton
              color="primary"
              icon="i-lucide-plus"
              @click="showCreateModal = true"
            >
              Create Your First Shared Wallet
            </UButton>
          </template>
        </AppEmptyState>
      </template>
    </AppCard>

    <!-- Create Modal -->
    <Musig2CreateSharedWalletModal
      v-model:open="showCreateModal"
      :pre-selected-contact-id="createWithContactId"
      @created="refreshWallets"
    />
  </div>
</template>
```

### File: `pages/people/shared-wallets/[id].vue`

```vue
<script setup lang="ts">
definePageMeta({
  title: 'Shared Wallet',
})

const route = useRoute()
const musig2Store = useMuSig2Store()

const walletId = computed(() => route.params.id as string)

// Get wallet
const wallet = computed(() => {
  return musig2Store.sharedWallets?.find(w => w.id === walletId.value)
})

// Modal states
const showFundModal = ref(false)
const showSpendModal = ref(false)

// Redirect if wallet not found
watchEffect(() => {
  if (!wallet.value && !musig2Store.loading) {
    navigateTo('/people/shared-wallets')
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 p-4">
    <!-- Back button -->
    <NuxtLink
      to="/people/shared-wallets"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Shared Wallets
    </NuxtLink>

    <!-- Loading -->
    <AppLoadingState v-if="musig2Store.loading" message="Loading wallet..." />

    <!-- Wallet Detail -->
    <template v-else-if="wallet">
      <Musig2SharedWalletDetail
        :wallet="wallet"
        @fund="showFundModal = true"
        @spend="showSpendModal = true"
      />
    </template>

    <!-- Fund Modal -->
    <Musig2FundWalletModal
      v-if="wallet"
      v-model:open="showFundModal"
      :wallet="wallet"
    />

    <!-- Spend Modal -->
    <Musig2ProposeSpendModal
      v-if="wallet"
      v-model:open="showSpendModal"
      :wallet="wallet"
    />
  </div>
</template>
```

---

## Task 1.3: Contact Model Extension

Extend the Contact interface to support P2P and MuSig2 features.

### File: `types/contact.ts` (additions)

```typescript
// Add to existing Contact interface
export interface Contact {
  // ... existing fields ...

  // P2P & MuSig2 fields
  publicKey?: string // Compressed public key (hex) for MuSig2
  peerId?: string // libp2p peer ID
  signerCapabilities?: SignerCapabilities
  lastSeenOnline?: number // Timestamp of last online presence
}

export interface SignerCapabilities {
  transactionTypes: string[] // ['spend', 'coinjoin', 'escrow', etc.]
  amountRange?: {
    min: number
    max: number
  }
  fee?: number // Base fee in satoshis
  responseTime?: number // Average response time in seconds
  reputation?: number // Reputation score
}
```

### File: `stores/contacts.ts` (additions)

Add these getters and actions to the contacts store:

```typescript
// Getters
getters: {
  // Contacts with public keys (MuSig2-eligible)
  contactsWithPublicKeys: (state) => {
    return state.contacts.filter(c => c.publicKey && /^0[23][0-9a-fA-F]{64}$/.test(c.publicKey))
  },

  // Find contact by peer ID
  findByPeerId: (state) => (peerId: string) => {
    return state.contacts.find(c => c.peerId === peerId)
  },

  // Find contact by public key
  findByPublicKey: (state) => (publicKey: string) => {
    return state.contacts.find(c => c.publicKey === publicKey)
  },

  // Contacts that are signers
  signerContacts: (state) => {
    return state.contacts.filter(c => c.signerCapabilities)
  },
}

// Actions
actions: {
  // Update contact's signer capabilities
  updateSignerCapabilities(contactId: string, capabilities: SignerCapabilities) {
    const contact = this.contacts.find(c => c.id === contactId)
    if (contact) {
      contact.signerCapabilities = capabilities
      contact.updatedAt = Date.now()
      this._saveContacts()
    }
  },

  // Update contact's last seen time
  updateLastSeen(peerId: string) {
    const contact = this.contacts.find(c => c.peerId === peerId)
    if (contact) {
      contact.lastSeenOnline = Date.now()
      this._saveContacts()
    }
  },
}
```

---

## Task 1.4: Shared Components

Create components shared between P2P and MuSig2 flows.

### File: `components/shared/TransactionPreview.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  from?: string
  fromLabel?: string
  to: string
  toLabel?: string
  amount: bigint
  fee: bigint
  purpose?: string
  showInputs?: boolean
  inputs?: Array<{ txid: string; vout: number; value: bigint }>
  outputs?: Array<{ address: string; value: bigint }>
}>()

const { formatXPI } = useAmount()
const { toFingerprint } = useAddress()

const total = computed(() => props.amount + props.fee)
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="bg-muted/50 px-4 py-2 border-b">
      <span class="font-medium text-sm">Transaction Preview</span>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <!-- From -->
      <div v-if="from" class="flex justify-between items-start">
        <span class="text-sm text-muted-foreground">From</span>
        <div class="text-right">
          <p v-if="fromLabel" class="font-medium">{{ fromLabel }}</p>
          <code class="text-xs text-muted-foreground">{{
            toFingerprint(from)
          }}</code>
        </div>
      </div>

      <!-- To -->
      <div class="flex justify-between items-start">
        <span class="text-sm text-muted-foreground">To</span>
        <div class="text-right">
          <p v-if="toLabel" class="font-medium">{{ toLabel }}</p>
          <code class="text-xs text-muted-foreground">{{
            toFingerprint(to)
          }}</code>
        </div>
      </div>

      <!-- Amount -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-muted-foreground">Amount</span>
        <span class="font-semibold text-primary">{{ formatXPI(amount) }}</span>
      </div>

      <!-- Fee -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-muted-foreground">Network Fee</span>
        <span class="text-sm">{{ formatXPI(fee) }}</span>
      </div>

      <!-- Total -->
      <div class="border-t pt-3 flex justify-between items-center">
        <span class="font-medium">Total</span>
        <span class="font-bold text-lg">{{ formatXPI(total) }}</span>
      </div>

      <!-- Purpose -->
      <div v-if="purpose" class="border-t pt-3">
        <span class="text-sm text-muted-foreground">Purpose</span>
        <p class="mt-1">{{ purpose }}</p>
      </div>

      <!-- Detailed Inputs/Outputs (optional) -->
      <template v-if="showInputs && inputs?.length">
        <div class="border-t pt-3">
          <span class="text-sm text-muted-foreground mb-2 block"
            >Inputs ({{ inputs.length }})</span
          >
          <div class="space-y-1">
            <div
              v-for="(input, i) in inputs"
              :key="i"
              class="flex justify-between text-xs bg-muted/30 p-2 rounded"
            >
              <code>{{ input.txid.slice(0, 8) }}...#{{ input.vout }}</code>
              <span>{{ formatXPI(input.value) }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-if="showInputs && outputs?.length">
        <div class="border-t pt-3">
          <span class="text-sm text-muted-foreground mb-2 block"
            >Outputs ({{ outputs.length }})</span
          >
          <div class="space-y-1">
            <div
              v-for="(output, i) in outputs"
              :key="i"
              class="flex justify-between text-xs bg-muted/30 p-2 rounded"
            >
              <code>{{ toFingerprint(output.address) }}</code>
              <span>{{ formatXPI(output.value) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
```

### File: `components/shared/SigningProgress.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  state:
    | 'created'
    | 'nonces_shared'
    | 'signing'
    | 'completed'
    | 'failed'
    | 'aborted'
  participants: Array<{
    id: string
    name?: string
    isMe?: boolean
    hasNonce?: boolean
    hasSignature?: boolean
    isOnline?: boolean
  }>
  canAbort?: boolean
}>()

const emit = defineEmits<{
  abort: []
}>()

// State configuration
const stateConfig = computed(() => {
  const configs: Record<
    string,
    { label: string; color: string; icon: string; progress: number }
  > = {
    created: {
      label: 'Waiting for participants',
      color: 'warning',
      icon: 'i-lucide-clock',
      progress: 10,
    },
    nonces_shared: {
      label: 'Exchanging nonces',
      color: 'primary',
      icon: 'i-lucide-shuffle',
      progress: 40,
    },
    signing: {
      label: 'Collecting signatures',
      color: 'primary',
      icon: 'i-lucide-pen-tool',
      progress: 70,
    },
    completed: {
      label: 'Transaction signed',
      color: 'success',
      icon: 'i-lucide-check-circle',
      progress: 100,
    },
    failed: {
      label: 'Signing failed',
      color: 'error',
      icon: 'i-lucide-x-circle',
      progress: 0,
    },
    aborted: {
      label: 'Session aborted',
      color: 'neutral',
      icon: 'i-lucide-ban',
      progress: 0,
    },
  }
  return configs[props.state] || configs.created
})

// Participant counts
const nonceCount = computed(
  () => props.participants.filter(p => p.hasNonce).length,
)
const signatureCount = computed(
  () => props.participants.filter(p => p.hasSignature).length,
)
const totalParticipants = computed(() => props.participants.length)
</script>

<template>
  <div class="space-y-4">
    <!-- State Header -->
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="`bg-${stateConfig.color}/10`"
      >
        <UIcon
          :name="stateConfig.icon"
          class="w-5 h-5"
          :class="`text-${stateConfig.color}`"
        />
      </div>
      <div class="flex-1">
        <p class="font-medium">{{ stateConfig.label }}</p>
        <p
          v-if="state === 'nonces_shared'"
          class="text-sm text-muted-foreground"
        >
          {{ nonceCount }}/{{ totalParticipants }} nonces received
        </p>
        <p
          v-else-if="state === 'signing'"
          class="text-sm text-muted-foreground"
        >
          {{ signatureCount }}/{{ totalParticipants }} signatures received
        </p>
      </div>
      <UButton
        v-if="canAbort && !['completed', 'failed', 'aborted'].includes(state)"
        color="error"
        variant="soft"
        size="sm"
        @click="emit('abort')"
      >
        Abort
      </UButton>
    </div>

    <!-- Progress Bar -->
    <UProgress :value="stateConfig.progress" :color="stateConfig.color" />

    <!-- Participants -->
    <div class="space-y-2">
      <p class="text-sm font-medium text-muted-foreground">Participants</p>
      <div
        v-for="participant in participants"
        :key="participant.id"
        class="flex items-center justify-between p-2 rounded-lg bg-muted/30"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="participant.isOnline ? 'bg-green-500' : 'bg-gray-400'"
          />
          <span>{{ participant.name || 'Unknown' }}</span>
          <UBadge
            v-if="participant.isMe"
            color="primary"
            variant="subtle"
            size="xs"
            >You</UBadge
          >
        </div>
        <div class="flex items-center gap-2">
          <UIcon
            v-if="participant.hasNonce"
            name="i-lucide-check"
            class="w-4 h-4 text-green-500"
            title="Nonce shared"
          />
          <UIcon
            v-if="participant.hasSignature"
            name="i-lucide-pen-tool"
            class="w-4 h-4 text-primary"
            title="Signature provided"
          />
        </div>
      </div>
    </div>
  </div>
</template>
```

### File: `components/shared/ParticipantSelector.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'

const props = defineProps<{
  contacts: Contact[]
  selected: string[]
  minParticipants?: number
  maxParticipants?: number
}>()

const emit = defineEmits<{
  'update:selected': [ids: string[]]
}>()

// Filter to only show contacts with public keys
const eligibleContacts = computed(() => {
  return props.contacts.filter(
    c => c.publicKey && /^0[23][0-9a-fA-F]{64}$/.test(c.publicKey),
  )
})

// Toggle selection
function toggleContact(contactId: string) {
  const newSelected = props.selected.includes(contactId)
    ? props.selected.filter(id => id !== contactId)
    : [...props.selected, contactId]

  // Enforce max participants
  if (props.maxParticipants && newSelected.length > props.maxParticipants) {
    return
  }

  emit('update:selected', newSelected)
}

// Check if contact is selected
function isSelected(contactId: string) {
  return props.selected.includes(contactId)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium">
        Select Participants
        <span class="text-muted-foreground"
          >({{ selected.length }} selected)</span
        >
      </p>
      <p v-if="minParticipants" class="text-xs text-muted-foreground">
        Minimum: {{ minParticipants }}
      </p>
    </div>

    <!-- No eligible contacts -->
    <UAlert
      v-if="eligibleContacts.length === 0"
      color="warning"
      icon="i-lucide-alert-triangle"
    >
      <template #title>No eligible contacts</template>
      <template #description>
        You need contacts with public keys to create a shared wallet. Add public
        keys to your contacts or discover signers on the P2P network.
      </template>
    </UAlert>

    <!-- Contact list -->
    <div v-else class="space-y-2 max-h-64 overflow-y-auto">
      <div
        v-for="contact in eligibleContacts"
        :key="contact.id"
        class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
        :class="
          isSelected(contact.id)
            ? 'border-primary bg-primary/5'
            : 'border-border hover:bg-muted/50'
        "
        @click="toggleContact(contact.id)"
      >
        <UCheckbox :model-value="isSelected(contact.id)" />
        <ContactsContactAvatar :contact="contact" size="sm" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ contact.name }}</p>
          <p class="text-xs text-muted-foreground truncate">
            {{ contact.address || 'No address' }}
          </p>
        </div>
        <UBadge color="primary" variant="subtle" size="xs">
          <UIcon name="i-lucide-shield" class="w-3 h-3 mr-1" />
          MuSig2
        </UBadge>
      </div>
    </div>

    <!-- Selection summary -->
    <div v-if="selected.length > 0" class="p-3 bg-muted/30 rounded-lg">
      <p class="text-sm">
        <strong>{{ selected.length + 1 }}-of-{{ selected.length + 1 }}</strong>
        multi-signature
        <span class="text-muted-foreground"
          >(you + {{ selected.length }} contact{{
            selected.length > 1 ? 's' : ''
          }})</span
        >
      </p>
      <p class="text-xs text-muted-foreground mt-1">
        All participants must approve transactions
      </p>
    </div>
  </div>
</template>
```

---

## Task 1.5: Navigation Badge for Pending Requests

Add a badge to the People navigation item when there are pending requests.

### File: `layouts/default.vue` (modification)

Add to the navigation section:

```vue
<script setup lang="ts">
const musig2Store = useMuSig2Store()

// Pending requests count for badge
const pendingRequestCount = computed(
  () => musig2Store.incomingRequests?.length || 0,
)
</script>

<!-- In navigation items -->
<NuxtLink to="/people" class="relative">
  <UIcon name="i-lucide-users" />
  <span>People</span>
  
  <!-- Pending requests badge -->
  <UBadge
    v-if="pendingRequestCount > 0"
    color="error"
    variant="solid"
    size="xs"
    class="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center"
  >
    {{ pendingRequestCount > 9 ? '9+' : pendingRequestCount }}
  </UBadge>
</NuxtLink>
```

---

## Implementation Checklist

### Routes & Pages

- [ ] Create `pages/people/shared-wallets/index.vue`
- [ ] Create `pages/people/shared-wallets/[id].vue`
- [ ] Update `pages/people/index.vue` with hub design

### Shared Components

- [ ] Create `components/shared/TransactionPreview.vue`
- [ ] Create `components/shared/SigningProgress.vue`
- [ ] Create `components/shared/ParticipantSelector.vue`

### Contact Model

- [ ] Add `publicKey` field to Contact interface
- [ ] Add `peerId` field to Contact interface
- [ ] Add `signerCapabilities` field to Contact interface
- [ ] Add `lastSeenOnline` field to Contact interface
- [ ] Add `contactsWithPublicKeys` getter to contacts store
- [ ] Add `findByPeerId` getter to contacts store
- [ ] Add `findByPublicKey` getter to contacts store

### Navigation

- [ ] Add pending requests badge to People nav item
- [ ] Verify navigation works between all People sub-pages

### Testing

- [ ] People hub displays correct stats
- [ ] Shared wallets list page loads
- [ ] Wallet detail page loads with valid ID
- [ ] Wallet detail redirects on invalid ID
- [ ] Pending requests badge shows correct count

---

## Files to Create/Modify

| File                                        | Action | Description             |
| ------------------------------------------- | ------ | ----------------------- |
| `pages/people/index.vue`                    | Modify | Hub redesign with stats |
| `pages/people/shared-wallets/index.vue`     | Create | Shared wallets list     |
| `pages/people/shared-wallets/[id].vue`      | Create | Wallet detail page      |
| `components/shared/TransactionPreview.vue`  | Create | Unified TX preview      |
| `components/shared/SigningProgress.vue`     | Create | Unified progress        |
| `components/shared/ParticipantSelector.vue` | Create | Contact selection       |
| `types/contact.ts`                          | Modify | Add P2P/MuSig2 fields   |
| `stores/contacts.ts`                        | Modify | Add getters/actions     |
| `layouts/default.vue`                       | Modify | Add pending badge       |

---

_Next: [02_P2P_CORE.md](./02_P2P_CORE.md)_
