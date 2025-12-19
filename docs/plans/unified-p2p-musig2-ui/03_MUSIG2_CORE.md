# Phase 3: MuSig2 Core Integration

## Overview

This phase implements the core MuSig2 shared wallet functionality, including the wallet list page, wallet creation flow, wallet detail view, and funding flow. This establishes the foundation for collaborative multi-signature wallets.

**Priority**: P0 (Critical)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 1 Foundation, Phase 2 P2P Core

---

## Objectives

1. Implement shared wallets list page with wallet cards
2. Create wallet creation wizard with participant selection
3. Build wallet detail view with balance and participant info
4. Implement funding flow for shared wallets

---

## Task 3.1: Shared Wallet List Component

Update the shared wallet list to display wallets with proper cards.

### File: `components/musig2/SharedWalletList.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallets: SharedWallet[]
  loading?: boolean
}>()

const emit = defineEmits<{
  view: [walletId: string]
  refresh: []
}>()

const { formatXPI } = useAmount()
</script>

<template>
  <div class="space-y-4">
    <!-- Header with refresh -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        {{ wallets.length }} shared wallet{{ wallets.length !== 1 ? 's' : '' }}
      </p>
      <UButton
        variant="ghost"
        size="sm"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="emit('refresh')"
      >
        Refresh
      </UButton>
    </div>

    <!-- Wallet Cards -->
    <div class="space-y-3">
      <Musig2SharedWalletCard
        v-for="wallet in wallets"
        :key="wallet.id"
        :wallet="wallet"
        @click="emit('view', wallet.id)"
      />
    </div>
  </div>
</template>
```

### File: `components/musig2/SharedWalletCard.vue` (update)

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet
  compact?: boolean
}>()

const emit = defineEmits<{
  click: []
  fund: []
  spend: []
}>()

const { formatXPI } = useAmount()
const { toFingerprint } = useAddress()
const contactStore = useContactStore()
const p2pStore = useP2PStore()

// Get participant names
const participantNames = computed(() => {
  return props.wallet.participants.map(p => {
    const contact = contactStore.findByPublicKey(p.publicKeyHex)
    return contact?.name || 'Unknown'
  })
})

// Online participant count
const onlineCount = computed(() => {
  return props.wallet.participants.filter(p => {
    return p2pStore.isPeerOnline?.(p.peerId) ?? false
  }).length
})

// Threshold display
const thresholdDisplay = computed(() => {
  const n = props.wallet.participants.length
  return `${n}-of-${n}`
})
</script>

<template>
  <UCard
    class="cursor-pointer hover:bg-muted/50 transition-colors"
    @click="emit('click')"
  >
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
      >
        <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-semibold truncate">{{ wallet.name }}</h3>
          <UBadge color="primary" variant="subtle" size="xs">
            {{ thresholdDisplay }}
          </UBadge>
        </div>

        <!-- Balance -->
        <p class="text-lg font-bold text-primary mb-2">
          {{ formatXPI(wallet.balance || BigInt(0)) }}
        </p>

        <!-- Participants -->
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <UIcon name="i-lucide-users" class="w-4 h-4" />
          <span>{{ participantNames.slice(0, 2).join(', ') }}</span>
          <span v-if="participantNames.length > 2">
            +{{ participantNames.length - 2 }} more
          </span>
          <span class="mx-1">•</span>
          <span
            class="w-2 h-2 rounded-full"
            :class="onlineCount > 0 ? 'bg-green-500' : 'bg-gray-400'"
          />
          <span>{{ onlineCount }}/{{ wallet.participants.length }} online</span>
        </div>
      </div>

      <!-- Actions (if not compact) -->
      <div v-if="!compact" class="flex gap-2 flex-shrink-0" @click.stop>
        <UButton
          size="sm"
          variant="outline"
          icon="i-lucide-plus"
          @click="emit('fund')"
        >
          Fund
        </UButton>
        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-send"
          :disabled="!wallet.balance || wallet.balance === BigInt(0)"
          @click="emit('spend')"
        >
          Spend
        </UButton>
      </div>
    </div>
  </UCard>
</template>
```

---

## Task 3.2: Wallet Creation Flow

Implement the complete wallet creation wizard.

### File: `components/musig2/CreateSharedWalletModal.vue` (update)

```vue
<script setup lang="ts">
const props = defineProps<{
  preSelectedContactId?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: [walletId: string]
}>()

const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const walletStore = useWalletStore()
const { success, error } = useNotifications()

// Form state
const step = ref<'participants' | 'details' | 'confirm'>('participants')
const selectedContactIds = ref<string[]>([])
const walletName = ref('')
const walletDescription = ref('')
const isCreating = ref(false)

// Pre-select contact if provided
onMounted(() => {
  if (props.preSelectedContactId) {
    selectedContactIds.value = [props.preSelectedContactId]
  }
})

// Eligible contacts (with public keys)
const eligibleContacts = computed(
  () => contactStore.contactsWithPublicKeys || [],
)

// Selected contacts
const selectedContacts = computed(() => {
  return eligibleContacts.value.filter(c =>
    selectedContactIds.value.includes(c.id),
  )
})

// Validation
const canProceedToDetails = computed(() => selectedContactIds.value.length >= 1)
const canProceedToConfirm = computed(() => walletName.value.trim().length >= 1)

// All participants (including self)
const allParticipants = computed(() => {
  const self = {
    id: 'self',
    name: 'You',
    publicKey: walletStore.publicKey,
    isMe: true,
  }
  const contacts = selectedContacts.value.map(c => ({
    id: c.id,
    name: c.name,
    publicKey: c.publicKey,
    isMe: false,
  }))
  return [self, ...contacts]
})

// Navigation
function goToDetails() {
  if (canProceedToDetails.value) {
    step.value = 'details'
  }
}

function goToConfirm() {
  if (canProceedToConfirm.value) {
    step.value = 'confirm'
  }
}

function goBack() {
  if (step.value === 'confirm') {
    step.value = 'details'
  } else if (step.value === 'details') {
    step.value = 'participants'
  }
}

// Create wallet
async function createWallet() {
  isCreating.value = true
  try {
    const publicKeys = allParticipants.value
      .map(p => p.publicKey)
      .filter((pk): pk is string => !!pk)

    const walletId = await musig2Store.createSharedWallet({
      name: walletName.value.trim(),
      description: walletDescription.value.trim() || undefined,
      participantPublicKeys: publicKeys,
    })

    success(
      'Wallet Created',
      `${walletName.value} has been created successfully`,
    )
    emit('created', walletId)
    resetAndClose()
  } catch (err) {
    error(
      'Creation Failed',
      err instanceof Error ? err.message : 'Failed to create wallet',
    )
  } finally {
    isCreating.value = false
  }
}

// Reset and close
function resetAndClose() {
  step.value = 'participants'
  selectedContactIds.value = props.preSelectedContactId
    ? [props.preSelectedContactId]
    : []
  walletName.value = ''
  walletDescription.value = ''
  open.value = false
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    step.value = 'participants'
    if (!props.preSelectedContactId) {
      selectedContactIds.value = []
    }
    walletName.value = ''
    walletDescription.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-shield-plus" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">Create Shared Wallet</h3>
          <p class="text-sm text-muted-foreground">
            {{
              step === 'participants'
                ? 'Step 1: Select participants'
                : step === 'details'
                ? 'Step 2: Wallet details'
                : 'Step 3: Confirm'
            }}
          </p>
        </div>
      </div>
    </template>

    <div class="p-4">
      <!-- Step 1: Participants -->
      <template v-if="step === 'participants'">
        <SharedParticipantSelector
          :contacts="eligibleContacts"
          v-model:selected="selectedContactIds"
          :min-participants="1"
        />

        <UAlert
          v-if="eligibleContacts.length === 0"
          color="warning"
          icon="i-lucide-alert-triangle"
          class="mt-4"
        >
          <template #title>No eligible contacts</template>
          <template #description>
            Add public keys to your contacts or discover signers on the P2P
            network.
            <NuxtLink to="/people/p2p?tab=signers" class="underline">
              Discover signers
            </NuxtLink>
          </template>
        </UAlert>
      </template>

      <!-- Step 2: Details -->
      <template v-else-if="step === 'details'">
        <div class="space-y-4">
          <UFormField label="Wallet Name" required>
            <UInput
              v-model="walletName"
              placeholder="e.g., Family Treasury"
              autofocus
            />
          </UFormField>

          <UFormField label="Description" hint="Optional">
            <UTextarea
              v-model="walletDescription"
              placeholder="What is this wallet for?"
              :rows="2"
            />
          </UFormField>

          <!-- Participants summary -->
          <div class="p-3 bg-muted/30 rounded-lg">
            <p class="text-sm font-medium mb-2">Participants</p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="p in allParticipants"
                :key="p.id"
                :color="p.isMe ? 'primary' : 'neutral'"
                variant="subtle"
              >
                {{ p.name }}
              </UBadge>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ allParticipants.length }}-of-{{
                allParticipants.length
              }}
              multi-signature
            </p>
          </div>
        </div>
      </template>

      <!-- Step 3: Confirm -->
      <template v-else-if="step === 'confirm'">
        <div class="space-y-4">
          <UAlert color="primary" icon="i-lucide-info">
            <template #description>
              Review your shared wallet configuration before creating.
            </template>
          </UAlert>

          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Name</span>
              <span class="font-medium">{{ walletName }}</span>
            </div>
            <div v-if="walletDescription" class="flex justify-between">
              <span class="text-muted-foreground">Description</span>
              <span>{{ walletDescription }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Type</span>
              <span
                >{{ allParticipants.length }}-of-{{
                  allParticipants.length
                }}
                Multi-Sig</span
              >
            </div>
            <div>
              <span class="text-muted-foreground">Participants</span>
              <div class="mt-2 space-y-1">
                <div
                  v-for="p in allParticipants"
                  :key="p.id"
                  class="flex items-center gap-2 text-sm"
                >
                  <UIcon
                    :name="p.isMe ? 'i-lucide-user' : 'i-lucide-user-check'"
                    class="w-4 h-4"
                  />
                  <span>{{ p.name }}</span>
                  <UBadge
                    v-if="p.isMe"
                    color="primary"
                    variant="subtle"
                    size="xs"
                    >You</UBadge
                  >
                </div>
              </div>
            </div>
          </div>

          <UAlert color="warning" icon="i-lucide-alert-triangle">
            <template #description>
              All participants must approve every transaction. Make sure you
              trust all participants before creating this wallet.
            </template>
          </UAlert>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton v-if="step !== 'participants'" variant="ghost" @click="goBack">
          Back
        </UButton>
        <div v-else />

        <div class="flex gap-2">
          <UButton variant="ghost" @click="resetAndClose">Cancel</UButton>

          <UButton
            v-if="step === 'participants'"
            color="primary"
            :disabled="!canProceedToDetails"
            @click="goToDetails"
          >
            Next
          </UButton>

          <UButton
            v-else-if="step === 'details'"
            color="primary"
            :disabled="!canProceedToConfirm"
            @click="goToConfirm"
          >
            Next
          </UButton>

          <UButton
            v-else
            color="primary"
            :loading="isCreating"
            @click="createWallet"
          >
            Create Wallet
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

---

## Task 3.3: Wallet Detail View

Implement the full wallet detail component.

### File: `components/musig2/SharedWalletDetail.vue` (update)

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet
}>()

const emit = defineEmits<{
  fund: []
  spend: []
  delete: []
}>()

const { formatXPI } = useAmount()
const { toFingerprint } = useAddress()
const { copy } = useClipboard()
const contactStore = useContactStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

// Participants with contact info
const participants = computed(() => {
  return props.wallet.participants.map(p => {
    const contact = contactStore.findByPublicKey(p.publicKeyHex)
    const isOnline = p2pStore.isPeerOnline?.(p.peerId) ?? false
    const isMe = p.publicKeyHex === walletStore.publicKey
    return {
      ...p,
      contact,
      isOnline,
      isMe,
      displayName: isMe ? 'You' : contact?.name || 'Unknown',
    }
  })
})

// Active sessions for this wallet
const activeSessions = computed(() => {
  return Array.from(musig2Store.activeSessions?.values() || []).filter(
    s => s.walletId === props.wallet.id,
  )
})

// Transaction history (placeholder)
const transactions = computed(() => props.wallet.transactions || [])

// Copy address
function copyAddress() {
  if (props.wallet.sharedAddress) {
    copy(props.wallet.sharedAddress)
  }
}

// Delete confirmation
const showDeleteConfirm = ref(false)

function confirmDelete() {
  emit('delete')
  showDeleteConfirm.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Balance Hero -->
    <div class="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-1">{{ wallet.name }}</h1>
          <p v-if="wallet.description" class="text-muted-foreground mb-4">
            {{ wallet.description }}
          </p>
          <p class="text-4xl font-bold text-primary">
            {{ formatXPI(wallet.balance || BigInt(0)) }}
          </p>
        </div>
        <UBadge color="primary" variant="subtle" size="lg">
          {{ wallet.participants.length }}-of-{{ wallet.participants.length }}
        </UBadge>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 mt-6">
        <UButton color="primary" icon="i-lucide-plus" @click="emit('fund')">
          Fund Wallet
        </UButton>
        <UButton
          variant="outline"
          icon="i-lucide-send"
          :disabled="!wallet.balance || wallet.balance === BigInt(0)"
          @click="emit('spend')"
        >
          Propose Spend
        </UButton>
      </div>
    </div>

    <!-- Shared Address -->
    <AppCard title="Shared Address" icon="i-lucide-qr-code">
      <div class="flex items-center gap-3">
        <code
          class="flex-1 p-3 bg-muted/30 rounded-lg text-sm font-mono truncate"
        >
          {{ wallet.sharedAddress }}
        </code>
        <UButton variant="ghost" icon="i-lucide-copy" @click="copyAddress" />
      </div>
      <p class="text-xs text-muted-foreground mt-2">
        Send funds to this address to fund the shared wallet
      </p>
    </AppCard>

    <!-- Participants -->
    <AppCard title="Participants" icon="i-lucide-users">
      <div class="space-y-3">
        <div
          v-for="p in participants"
          :key="p.publicKeyHex"
          class="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <div class="relative">
              <ContactsContactAvatar
                v-if="p.contact"
                :contact="p.contact"
                size="sm"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <UIcon name="i-lucide-user" class="w-4 h-4" />
              </div>
              <span
                class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                :class="p.isOnline ? 'bg-green-500' : 'bg-gray-400'"
              />
            </div>
            <div>
              <p class="font-medium">
                {{ p.displayName }}
                <UBadge
                  v-if="p.isMe"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-1"
                >
                  You
                </UBadge>
              </p>
              <code class="text-xs text-muted-foreground">
                {{ toFingerprint(p.publicKeyHex) }}
              </code>
            </div>
          </div>
          <UBadge
            :color="p.isOnline ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ p.isOnline ? 'Online' : 'Offline' }}
          </UBadge>
        </div>
      </div>
    </AppCard>

    <!-- Active Sessions -->
    <AppCard
      v-if="activeSessions.length > 0"
      title="Active Sessions"
      icon="i-lucide-loader"
    >
      <div class="space-y-3">
        <div
          v-for="session in activeSessions"
          :key="session.id"
          class="p-3 bg-muted/30 rounded-lg"
        >
          <SharedSigningProgress
            :state="session.state"
            :participants="
              participants.map(p => ({
                id: p.peerId,
                name: p.displayName,
                isMe: p.isMe,
                hasNonce: session.participants.find(
                  sp => sp.peerId === p.peerId,
                )?.hasNonce,
                hasSignature: session.participants.find(
                  sp => sp.peerId === p.peerId,
                )?.hasSignature,
                isOnline: p.isOnline,
              }))
            "
          />
        </div>
      </div>
    </AppCard>

    <!-- Transaction History -->
    <AppCard title="Transaction History" icon="i-lucide-history">
      <template v-if="transactions.length > 0">
        <div class="space-y-2">
          <!-- Transaction items would go here -->
          <p class="text-sm text-muted-foreground">
            {{ transactions.length }} transaction{{
              transactions.length !== 1 ? 's' : ''
            }}
          </p>
        </div>
      </template>
      <AppEmptyState
        v-else
        icon="i-lucide-history"
        title="No transactions yet"
        description="Transactions from this shared wallet will appear here"
      />
    </AppCard>

    <!-- Danger Zone -->
    <AppCard title="Danger Zone" icon="i-lucide-alert-triangle">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-red-500">Delete Wallet</p>
          <p class="text-sm text-muted-foreground">
            Remove this shared wallet from your device
          </p>
        </div>
        <UButton color="error" variant="soft" @click="showDeleteConfirm = true">
          Delete
        </UButton>
      </div>
    </AppCard>

    <!-- Delete Confirmation -->
    <AppConfirmModal
      v-model:open="showDeleteConfirm"
      title="Delete Shared Wallet?"
      :message="`Are you sure you want to delete '${wallet.name}'? This will only remove it from your device. Other participants will still have access.`"
      confirm-text="Delete"
      confirm-color="error"
      @confirm="confirmDelete"
    />
  </div>
</template>
```

---

## Task 3.4: Funding Flow

Implement the funding modal for shared wallets.

### File: `components/musig2/FundWalletModal.vue` (update)

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet
}>()

const open = defineModel<boolean>('open', { default: false })

const walletStore = useWalletStore()
const { formatXPI, xpiToSats, satsToXPI } = useAmount()
const { copy } = useClipboard()
const { success } = useNotifications()

// Funding options
const fundingMethod = ref<'self' | 'share'>('self')

// Amount input (for self-funding)
const amountInput = ref('')
const amountSats = computed(() => {
  const parsed = parseFloat(amountInput.value)
  if (isNaN(parsed) || parsed <= 0) return BigInt(0)
  return xpiToSats(parsed)
})

// Presets
const presets = [
  { label: '100 XPI', value: '100' },
  { label: '500 XPI', value: '500' },
  { label: '1,000 XPI', value: '1000' },
  { label: 'Max', value: 'max' },
]

function setPreset(value: string) {
  if (value === 'max') {
    amountInput.value = satsToXPI(
      walletStore.spendableBalance || BigInt(0),
    ).toString()
  } else {
    amountInput.value = value
  }
}

// Validation
const canFund = computed(() => {
  if (fundingMethod.value === 'share') return true
  return (
    amountSats.value > BigInt(0) &&
    amountSats.value <= (walletStore.spendableBalance || BigInt(0))
  )
})

const insufficientBalance = computed(() => {
  return amountSats.value > (walletStore.spendableBalance || BigInt(0))
})

// Copy address
function copyAddress() {
  if (props.wallet.sharedAddress) {
    copy(props.wallet.sharedAddress)
    success('Copied', 'Address copied to clipboard')
  }
}

// Fund from personal wallet
async function fundFromPersonal() {
  // Navigate to send page with pre-filled recipient
  navigateTo({
    path: '/transact/send',
    query: {
      to: props.wallet.sharedAddress,
      amount: amountInput.value,
      label: `Fund: ${props.wallet.name}`,
    },
  })
  open.value = false
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    fundingMethod.value = 'self'
    amountInput.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-plus" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">Fund Wallet</h3>
          <p class="text-sm text-muted-foreground">{{ wallet.name }}</p>
        </div>
      </div>
    </template>

    <div class="p-4 space-y-6">
      <!-- Current Balance -->
      <div class="p-4 bg-muted/30 rounded-lg text-center">
        <p class="text-sm text-muted-foreground">Current Balance</p>
        <p class="text-2xl font-bold text-primary">
          {{ formatXPI(wallet.balance || BigInt(0)) }}
        </p>
      </div>

      <!-- Funding Method -->
      <div class="space-y-3">
        <p class="text-sm font-medium">How would you like to fund?</p>

        <div class="grid grid-cols-2 gap-3">
          <button
            class="p-4 rounded-lg border text-left transition-colors"
            :class="
              fundingMethod === 'self'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            "
            @click="fundingMethod = 'self'"
          >
            <UIcon name="i-lucide-wallet" class="w-6 h-6 text-primary mb-2" />
            <p class="font-medium">From My Wallet</p>
            <p class="text-xs text-muted-foreground">
              Send from your personal wallet
            </p>
          </button>

          <button
            class="p-4 rounded-lg border text-left transition-colors"
            :class="
              fundingMethod === 'share'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            "
            @click="fundingMethod = 'share'"
          >
            <UIcon name="i-lucide-share" class="w-6 h-6 text-primary mb-2" />
            <p class="font-medium">Share Address</p>
            <p class="text-xs text-muted-foreground">
              Share address with others
            </p>
          </button>
        </div>
      </div>

      <!-- Self Funding -->
      <template v-if="fundingMethod === 'self'">
        <div class="space-y-3">
          <UFormField label="Amount">
            <UInput
              v-model="amountInput"
              type="number"
              placeholder="0.00"
              :error="insufficientBalance"
            >
              <template #trailing>
                <span class="text-muted-foreground">XPI</span>
              </template>
            </UInput>
            <template #help>
              <span :class="insufficientBalance && 'text-red-500'">
                Available:
                {{ formatXPI(walletStore.spendableBalance || BigInt(0)) }}
              </span>
            </template>
          </UFormField>

          <!-- Presets -->
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="preset in presets"
              :key="preset.value"
              size="xs"
              variant="outline"
              @click="setPreset(preset.value)"
            >
              {{ preset.label }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Share Address -->
      <template v-else>
        <div class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Share this address with anyone who wants to fund the wallet:
          </p>

          <div class="flex items-center gap-2">
            <code
              class="flex-1 p-3 bg-muted/30 rounded-lg text-sm font-mono truncate"
            >
              {{ wallet.sharedAddress }}
            </code>
            <UButton
              variant="outline"
              icon="i-lucide-copy"
              @click="copyAddress"
            >
              Copy
            </UButton>
          </div>

          <!-- QR Code placeholder -->
          <div class="flex justify-center p-4 bg-muted/30 rounded-lg">
            <div
              class="w-48 h-48 bg-white rounded-lg flex items-center justify-center"
            >
              <UIcon name="i-lucide-qr-code" class="w-32 h-32 text-muted" />
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="ghost" @click="open = false">Cancel</UButton>
        <UButton
          v-if="fundingMethod === 'self'"
          color="primary"
          :disabled="!canFund"
          @click="fundFromPersonal"
        >
          Continue to Send
        </UButton>
        <UButton v-else color="primary" @click="open = false"> Done </UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

## Task 3.5: MuSig2 Store Updates

Ensure the MuSig2 store has all required methods.

### File: `stores/musig2.ts` (additions)

```typescript
// Add these methods if not present

actions: {
  // Create a new shared wallet
  async createSharedWallet(params: {
    name: string
    description?: string
    participantPublicKeys: string[]
  }): Promise<string> {
    const wallet = await serviceCreateSharedWallet(params)
    this.sharedWallets.push(wallet)
    this._saveWallets()
    return wallet.id
  },

  // Delete a shared wallet
  async deleteSharedWallet(walletId: string) {
    this.sharedWallets = this.sharedWallets.filter(w => w.id !== walletId)
    this._saveWallets()
  },

  // Refresh shared wallet balances
  async refreshSharedWalletBalances() {
    this.loading = true
    try {
      for (const wallet of this.sharedWallets) {
        const balance = await serviceGetWalletBalance(wallet.sharedAddress)
        wallet.balance = balance
      }
      this._saveWallets()
    } finally {
      this.loading = false
    }
  },
}
```

---

## Implementation Checklist

### Components

- [ ] Update `SharedWalletList.vue` with refresh and proper layout
- [ ] Update `SharedWalletCard.vue` with participant info and actions
- [ ] Update `CreateSharedWalletModal.vue` with full wizard flow
- [ ] Update `SharedWalletDetail.vue` with all sections
- [ ] Update `FundWalletModal.vue` with funding options

### Store

- [ ] Verify `createSharedWallet` action
- [ ] Verify `deleteSharedWallet` action
- [ ] Verify `refreshSharedWalletBalances` action
- [ ] Verify `sharedWallets` state persistence

### Pages

- [ ] Verify `pages/people/shared-wallets/index.vue` works
- [ ] Verify `pages/people/shared-wallets/[id].vue` works
- [ ] Verify navigation between pages

### Testing

- [ ] Can view shared wallets list
- [ ] Can create new shared wallet with wizard
- [ ] Can view wallet detail
- [ ] Can copy shared address
- [ ] Can navigate to fund flow
- [ ] Can delete wallet with confirmation

---

## Files to Create/Modify

| File                                            | Action | Description                   |
| ----------------------------------------------- | ------ | ----------------------------- |
| `components/musig2/SharedWalletList.vue`        | Modify | Add refresh, proper layout    |
| `components/musig2/SharedWalletCard.vue`        | Modify | Add participant info, actions |
| `components/musig2/CreateSharedWalletModal.vue` | Modify | Full wizard flow              |
| `components/musig2/SharedWalletDetail.vue`      | Modify | All detail sections           |
| `components/musig2/FundWalletModal.vue`         | Modify | Funding options               |
| `stores/musig2.ts`                              | Modify | Add missing actions           |

---

_Previous: [02_P2P_CORE.md](./02_P2P_CORE.md)_
_Next: [04_SIGNING_FLOW.md](./04_SIGNING_FLOW.md)_
