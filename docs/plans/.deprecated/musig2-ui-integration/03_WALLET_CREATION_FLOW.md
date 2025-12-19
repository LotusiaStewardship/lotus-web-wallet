# 03: Wallet Creation Flow

## Overview

This document details the shared wallet creation wizard. Creating a shared wallet is the most critical user flow as it establishes the foundation for all subsequent MuSig2 operations.

---

## Creation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CREATE SHARED WALLET FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Create Shared Wallet"
         │
         ▼
┌─────────────────────┐
│ Step 1: Name Wallet │
│ • Enter name        │
│ • Enter description │
│ • (Optional)        │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 2: Add Members │
│ • Your key (auto)   │
│ • Select contacts   │
│ • Or enter pub keys │
│ • Min 2 total       │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 3: Review      │
│ • Show all members  │
│ • Show n-of-n type  │
│ • Explain MuSig2    │
│ • Confirm creation  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 4: Processing  │
│ • Aggregate keys    │
│ • Generate address  │
│ • Save to store     │
│ • Show progress     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 5: Success     │
│ • Show address      │
│ • QR code           │
│ • Copy button       │
│ • Fund now option   │
└─────────────────────┘
```

---

## Modal Design

### Step 1: Name Your Wallet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Create Shared Wallet                                          Step 1/3  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Name your shared wallet                                                    │
│                                                                             │
│  Wallet Name *                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Family Savings                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Description (optional)                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Joint savings account for family expenses                            │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                                             │
│                                              [Cancel]  [Next: Add Members]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 2: Add Participants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Create Shared Wallet                                          Step 2/3  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Add participants to "Family Savings"                                       │
│                                                                             │
│  ℹ️ All participants must sign every transaction. Only add contacts         │
│     you trust and who have shared their public key with you.                │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Participants (2)                                                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 You                                                    ✓ Added    │   │
│  │    02abc123...def456 (your public key)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Alice                                                  ✓ Added    │   │
│  │    02xyz789...ghi012                                       [Remove]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Add from contacts:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search contacts with public keys...                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Bob                                                      [+ Add]  │   │
│  │    02jkl345...mno678                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Carol                                                    [+ Add]  │   │
│  │    02pqr901...stu234                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Or enter a public key manually:                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 02...                                                       [+ Add]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                [Back]  [Next: Review]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Review & Confirm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Create Shared Wallet                                          Step 3/3  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Review your shared wallet                                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔐 Family Savings                                                    │   │
│  │                                                                       │   │
│  │ Type: 2-of-2 MuSig2                                                  │   │
│  │ All 2 participants must sign every transaction                       │   │
│  │                                                                       │   │
│  │ Participants:                                                         │   │
│  │ • You (02abc123...def456)                                            │   │
│  │ • Alice (02xyz789...ghi012)                                          │   │
│  │                                                                       │   │
│  │ Description:                                                          │   │
│  │ Joint savings account for family expenses                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚠️ Important                                                               │
│                                                                             │
│  • This wallet requires ALL participants to be online to sign              │
│  • If any participant loses access, funds may be unrecoverable             │
│  • Make sure all participants have backed up their keys                    │
│                                                                             │
│  ☐ I understand that all participants must sign to spend funds             │
│                                                                             │
│                                              [Back]  [Create Shared Wallet] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Success State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ Shared Wallet Created!                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   [QR CODE]     │                                 │
│                         │                 │                                 │
│                         │                 │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│  Family Savings                                                             │
│  2-of-2 MuSig2 Wallet                                                       │
│                                                                             │
│  Shared Address:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ lotus_16PSJKqoPbvGLWdNhKCrCkP5KrPi9...                      [Copy]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Share this address with participants so they can fund the wallet.          │
│                                                                             │
│                                                                             │
│                                    [Fund Now]  [View Wallet]  [Done]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Implementation

### File: `components/musig2/CreateSharedWalletModal.vue`

```vue
<script setup lang="ts">
import type { Contact } from '~/types/contact'

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  created: [walletId: string]
}>()

const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const walletStore = useWalletStore()
const { success, error: showError } = useNotifications()

// Steps
type Step = 'name' | 'participants' | 'review' | 'creating' | 'success'
const currentStep = ref<Step>('name')

// Form state
const walletName = ref('')
const walletDescription = ref('')
const selectedContactIds = ref<string[]>([])
const manualPublicKey = ref('')
const manualParticipants = ref<{ publicKey: string; nickname: string }[]>([])
const acknowledged = ref(false)

// Created wallet
const createdWallet = ref<{ id: string; address: string } | null>(null)

// Computed
const myPublicKey = computed(() => walletStore.getPublicKeyHex?.() || '')

const eligibleContacts = computed(() =>
  contactStore.contactList.filter(
    c => c.publicKey && c.publicKey !== myPublicKey.value,
  ),
)

const selectedContacts = computed(() =>
  eligibleContacts.value.filter(c => selectedContactIds.value.includes(c.id)),
)

const allParticipants = computed(() => {
  const participants: {
    publicKey: string
    nickname: string
    isMe: boolean
    contactId?: string
  }[] = [{ publicKey: myPublicKey.value, nickname: 'You', isMe: true }]

  // Add selected contacts
  for (const contact of selectedContacts.value) {
    participants.push({
      publicKey: contact.publicKey!,
      nickname: contact.name,
      isMe: false,
      contactId: contact.id,
    })
  }

  // Add manual participants
  for (const p of manualParticipants.value) {
    participants.push({
      publicKey: p.publicKey,
      nickname: p.nickname || 'Unknown',
      isMe: false,
    })
  }

  return participants
})

const participantCount = computed(() => allParticipants.value.length)

const canProceedFromName = computed(() => walletName.value.trim().length > 0)
const canProceedFromParticipants = computed(() => participantCount.value >= 2)
const canCreate = computed(
  () => acknowledged.value && canProceedFromParticipants.value,
)

// Contact search
const contactSearch = ref('')
const filteredContacts = computed(() => {
  if (!contactSearch.value) return eligibleContacts.value
  const search = contactSearch.value.toLowerCase()
  return eligibleContacts.value.filter(
    c =>
      c.name.toLowerCase().includes(search) ||
      c.publicKey?.toLowerCase().includes(search),
  )
})

// Actions
function nextStep() {
  if (currentStep.value === 'name' && canProceedFromName.value) {
    currentStep.value = 'participants'
  } else if (
    currentStep.value === 'participants' &&
    canProceedFromParticipants.value
  ) {
    currentStep.value = 'review'
  }
}

function prevStep() {
  if (currentStep.value === 'participants') {
    currentStep.value = 'name'
  } else if (currentStep.value === 'review') {
    currentStep.value = 'participants'
  }
}

function toggleContact(contactId: string) {
  const index = selectedContactIds.value.indexOf(contactId)
  if (index >= 0) {
    selectedContactIds.value.splice(index, 1)
  } else {
    selectedContactIds.value.push(contactId)
  }
}

function addManualParticipant() {
  const pubKey = manualPublicKey.value.trim()
  if (!pubKey) return

  // Validate public key format (basic check)
  if (!/^0[23][0-9a-fA-F]{64}$/.test(pubKey)) {
    showError(
      'Invalid Public Key',
      'Please enter a valid compressed public key (66 hex characters starting with 02 or 03)',
    )
    return
  }

  // Check for duplicates
  if (allParticipants.value.some(p => p.publicKey === pubKey)) {
    showError('Duplicate', 'This public key is already added')
    return
  }

  manualParticipants.value.push({
    publicKey: pubKey,
    nickname: `Participant ${manualParticipants.value.length + 1}`,
  })

  manualPublicKey.value = ''
}

function removeManualParticipant(index: number) {
  manualParticipants.value.splice(index, 1)
}

async function createWallet() {
  if (!canCreate.value) return

  currentStep.value = 'creating'

  try {
    const wallet = await musig2Store.createSharedWallet({
      name: walletName.value.trim(),
      description: walletDescription.value.trim() || undefined,
      participantPeerIds: allParticipants.value
        .filter(p => !p.isMe)
        .map(p => p.contactId || p.publicKey), // Use contactId or publicKey as identifier
    })

    createdWallet.value = {
      id: wallet.id,
      address: wallet.sharedAddress,
    }

    currentStep.value = 'success'
    success(
      'Wallet Created',
      `${walletName.value} has been created successfully`,
    )
    emit('created', wallet.id)
  } catch (e) {
    showError(
      'Creation Failed',
      e instanceof Error ? e.message : 'Failed to create shared wallet',
    )
    currentStep.value = 'review'
  }
}

function handleDone() {
  resetForm()
  open.value = false
}

function handleViewWallet() {
  if (createdWallet.value) {
    navigateTo(`/people/shared-wallets/${createdWallet.value.id}`)
  }
  handleDone()
}

function handleFundNow() {
  // TODO: Open fund modal or navigate to fund page
  handleViewWallet()
}

function resetForm() {
  currentStep.value = 'name'
  walletName.value = ''
  walletDescription.value = ''
  selectedContactIds.value = []
  manualPublicKey.value = ''
  manualParticipants.value = []
  acknowledged.value = false
  createdWallet.value = null
  contactSearch.value = ''
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    // Delay reset to allow close animation
    setTimeout(resetForm, 300)
  }
})

// Truncate public key for display
function truncateKey(key: string): string {
  if (key.length <= 16) return key
  return `${key.slice(0, 8)}...${key.slice(-8)}`
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #content>
      <UCard>
        <!-- Header -->
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Create Shared Wallet</span>
            </div>
            <span
              v-if="currentStep !== 'creating' && currentStep !== 'success'"
              class="text-sm text-muted"
            >
              Step
              {{
                currentStep === 'name'
                  ? 1
                  : currentStep === 'participants'
                  ? 2
                  : 3
              }}/3
            </span>
          </div>
        </template>

        <!-- Step 1: Name -->
        <div v-if="currentStep === 'name'" class="space-y-4">
          <p class="text-muted">Name your shared wallet</p>

          <UFormField label="Wallet Name" required>
            <UInput
              v-model="walletName"
              placeholder="e.g., Family Savings"
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
        </div>

        <!-- Step 2: Participants -->
        <div v-else-if="currentStep === 'participants'" class="space-y-4">
          <p class="text-muted">Add participants to "{{ walletName }}"</p>

          <UAlert color="primary" icon="i-lucide-info">
            <template #description>
              All participants must sign every transaction. Only add contacts
              you trust and who have shared their public key with you.
            </template>
          </UAlert>

          <!-- Current Participants -->
          <div class="space-y-2">
            <p class="text-sm font-medium">
              Participants ({{ participantCount }})
            </p>

            <!-- You (always first) -->
            <div
              class="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20"
            >
              <UIcon name="i-lucide-user" class="w-5 h-5 text-primary" />
              <div class="flex-1 min-w-0">
                <p class="font-medium">You</p>
                <p class="text-xs text-muted truncate">
                  {{ truncateKey(myPublicKey) }}
                </p>
              </div>
              <UBadge color="primary" size="xs">Added</UBadge>
            </div>

            <!-- Selected contacts -->
            <div
              v-for="contact in selectedContacts"
              :key="contact.id"
              class="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <ContactAvatar :contact="contact" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="font-medium">{{ contact.name }}</p>
                <p class="text-xs text-muted truncate">
                  {{ truncateKey(contact.publicKey!) }}
                </p>
              </div>
              <UButton
                variant="ghost"
                color="red"
                size="xs"
                icon="i-lucide-x"
                @click="toggleContact(contact.id)"
              />
            </div>

            <!-- Manual participants -->
            <div
              v-for="(p, index) in manualParticipants"
              :key="p.publicKey"
              class="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <UIcon name="i-lucide-user" class="w-5 h-5 text-muted" />
              <div class="flex-1 min-w-0">
                <p class="font-medium">{{ p.nickname }}</p>
                <p class="text-xs text-muted truncate">
                  {{ truncateKey(p.publicKey) }}
                </p>
              </div>
              <UButton
                variant="ghost"
                color="red"
                size="xs"
                icon="i-lucide-x"
                @click="removeManualParticipant(index)"
              />
            </div>
          </div>

          <!-- Add from contacts -->
          <div v-if="eligibleContacts.length > 0" class="space-y-2">
            <p class="text-sm font-medium">Add from contacts</p>

            <UInput
              v-model="contactSearch"
              placeholder="Search contacts with public keys..."
              icon="i-lucide-search"
            />

            <div class="max-h-40 overflow-y-auto space-y-1">
              <div
                v-for="contact in filteredContacts"
                :key="contact.id"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                :class="selectedContactIds.includes(contact.id) && 'opacity-50'"
                @click="
                  !selectedContactIds.includes(contact.id) &&
                    toggleContact(contact.id)
                "
              >
                <ContactAvatar :contact="contact" size="sm" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ contact.name }}</p>
                  <p class="text-xs text-muted truncate">
                    {{ truncateKey(contact.publicKey!) }}
                  </p>
                </div>
                <UButton
                  v-if="!selectedContactIds.includes(contact.id)"
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-plus"
                >
                  Add
                </UButton>
                <UBadge v-else color="neutral" size="xs">Added</UBadge>
              </div>
            </div>
          </div>

          <!-- Manual entry -->
          <div class="space-y-2">
            <p class="text-sm font-medium">Or enter a public key manually</p>
            <div class="flex gap-2">
              <UInput
                v-model="manualPublicKey"
                placeholder="02..."
                class="flex-1"
              />
              <UButton
                icon="i-lucide-plus"
                :disabled="!manualPublicKey.trim()"
                @click="addManualParticipant"
              >
                Add
              </UButton>
            </div>
          </div>
        </div>

        <!-- Step 3: Review -->
        <div v-else-if="currentStep === 'review'" class="space-y-4">
          <p class="text-muted">Review your shared wallet</p>

          <UCard>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
                <span class="font-semibold">{{ walletName }}</span>
              </div>

              <div class="text-sm space-y-1">
                <p>
                  <span class="text-muted">Type:</span>
                  {{ participantCount }}-of-{{ participantCount }} MuSig2
                </p>
                <p class="text-muted">
                  All {{ participantCount }} participants must sign every
                  transaction
                </p>
              </div>

              <div>
                <p class="text-sm font-medium mb-2">Participants:</p>
                <ul class="text-sm space-y-1">
                  <li
                    v-for="p in allParticipants"
                    :key="p.publicKey"
                    class="flex items-center gap-2"
                  >
                    <span>•</span>
                    <span>{{ p.nickname }}</span>
                    <span class="text-muted"
                      >({{ truncateKey(p.publicKey) }})</span
                    >
                  </li>
                </ul>
              </div>

              <div v-if="walletDescription">
                <p class="text-sm font-medium">Description:</p>
                <p class="text-sm text-muted">{{ walletDescription }}</p>
              </div>
            </div>
          </UCard>

          <UAlert color="warning" icon="i-lucide-alert-triangle">
            <template #title>Important</template>
            <template #description>
              <ul class="text-sm space-y-1 mt-1">
                <li>
                  • This wallet requires ALL participants to be online to sign
                </li>
                <li>
                  • If any participant loses access, funds may be unrecoverable
                </li>
                <li>• Make sure all participants have backed up their keys</li>
              </ul>
            </template>
          </UAlert>

          <UCheckbox
            v-model="acknowledged"
            label="I understand that all participants must sign to spend funds"
          />
        </div>

        <!-- Creating State -->
        <div v-else-if="currentStep === 'creating'" class="py-8 text-center">
          <UIcon
            name="i-lucide-loader-2"
            class="w-12 h-12 animate-spin text-primary mx-auto mb-4"
          />
          <p class="font-medium">Creating Shared Wallet...</p>
          <p class="text-sm text-muted">
            Aggregating keys and generating address
          </p>
        </div>

        <!-- Success State -->
        <div
          v-else-if="currentStep === 'success' && createdWallet"
          class="space-y-4 text-center"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-16 h-16 text-green-500 mx-auto"
          />

          <div>
            <p class="text-xl font-bold">{{ walletName }}</p>
            <p class="text-muted">
              {{ participantCount }}-of-{{ participantCount }} MuSig2 Wallet
            </p>
          </div>

          <!-- QR Code placeholder -->
          <div class="flex justify-center">
            <div
              class="w-40 h-40 bg-muted rounded-lg flex items-center justify-center"
            >
              <UIcon name="i-lucide-qr-code" class="w-20 h-20 text-muted" />
            </div>
          </div>

          <div>
            <p class="text-sm font-medium mb-2">Shared Address:</p>
            <div class="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <code class="text-xs flex-1 truncate">{{
                createdWallet.address
              }}</code>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-copy"
                @click="navigator.clipboard.writeText(createdWallet.address)"
              />
            </div>
          </div>

          <p class="text-sm text-muted">
            Share this address with participants so they can fund the wallet.
          </p>
        </div>

        <!-- Footer -->
        <template #footer>
          <div class="flex gap-3">
            <!-- Step 1 -->
            <template v-if="currentStep === 'name'">
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
                :disabled="!canProceedFromName"
                @click="nextStep"
              >
                Next: Add Members
              </UButton>
            </template>

            <!-- Step 2 -->
            <template v-else-if="currentStep === 'participants'">
              <UButton
                class="flex-1"
                color="neutral"
                variant="outline"
                @click="prevStep"
              >
                Back
              </UButton>
              <UButton
                class="flex-1"
                color="primary"
                :disabled="!canProceedFromParticipants"
                @click="nextStep"
              >
                Next: Review
              </UButton>
            </template>

            <!-- Step 3 -->
            <template v-else-if="currentStep === 'review'">
              <UButton
                class="flex-1"
                color="neutral"
                variant="outline"
                @click="prevStep"
              >
                Back
              </UButton>
              <UButton
                class="flex-1"
                color="primary"
                :disabled="!canCreate"
                @click="createWallet"
              >
                Create Shared Wallet
              </UButton>
            </template>

            <!-- Success -->
            <template v-else-if="currentStep === 'success'">
              <UButton color="primary" variant="outline" @click="handleFundNow">
                Fund Now
              </UButton>
              <UButton
                color="primary"
                variant="outline"
                @click="handleViewWallet"
              >
                View Wallet
              </UButton>
              <UButton color="primary" @click="handleDone"> Done </UButton>
            </template>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Contact Public Key Requirement

For the creation flow to work, contacts must have public keys stored. This requires:

### Contact Interface Update

```typescript
// types/contact.ts
export interface Contact {
  id: string
  name: string
  address: string
  publicKey?: string // Required for MuSig2
  // ... other fields
}
```

### Saving Public Key from P2P Discovery

When a user adds a signer from P2P discovery to contacts, the public key should be saved:

```typescript
// In P2P page or signer card
async function saveSignerAsContact(signer: DiscoveredSigner) {
  await contactStore.addContact({
    name: signer.nickname || `Signer ${signer.id.slice(0, 8)}`,
    address: '', // May not have address
    publicKey: signer.publicKeyHex, // Save public key!
    peerId: signer.peerId,
  })
}
```

---

## Implementation Checklist

### Modal Steps

- [ ] Step 1: Name input with validation
- [ ] Step 2: Participant selection from contacts
- [ ] Step 2: Manual public key entry
- [ ] Step 3: Review with acknowledgment checkbox
- [ ] Creating state with spinner
- [ ] Success state with address and QR code

### Validation

- [ ] Wallet name required
- [ ] Minimum 2 participants
- [ ] Public key format validation
- [ ] Duplicate participant check
- [ ] Acknowledgment required before creation

### Integration

- [ ] Connect to musig2Store.createSharedWallet
- [ ] Handle creation errors gracefully
- [ ] Navigate to wallet detail on success
- [ ] Copy address to clipboard

### Contact Integration

- [ ] Filter contacts with public keys
- [ ] Search contacts by name/key
- [ ] Show contact avatars

---

## Files to Create/Modify

| File                                            | Action | Description                   |
| ----------------------------------------------- | ------ | ----------------------------- |
| `components/musig2/CreateSharedWalletModal.vue` | Modify | Implement full wizard flow    |
| `types/contact.ts`                              | Modify | Ensure publicKey field exists |
| `stores/contacts.ts`                            | Verify | Ensure publicKey is persisted |

---

_Next: [04_WALLET_DETAIL_VIEW.md](./04_WALLET_DETAIL_VIEW.md)_
