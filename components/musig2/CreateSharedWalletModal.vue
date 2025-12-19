<script setup lang="ts">
/**
 * CreateSharedWalletModal
 *
 * Wizard-style modal for creating a new shared multi-signature wallet.
 * Steps: 1) Name & Description, 2) Select Participants, 3) Review & Create
 *
 * Phase 5 Enhancements:
 * - Uses MuSig2 account key (not primary wallet key)
 * - Accepts participant public keys for key aggregation
 * - MuSig2 is always n-of-n (all participants must sign)
 * - Shows n-of-n preview instead of threshold selection
 */
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'
import { AccountPurpose } from '~/types/accounts'
import type { Contact } from '~/types/contact'
import type { OnlineStatus } from '~/types/contact'

const props = defineProps<{
  /** Whether modal is open */
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [wallet: { id: string; name: string }]
}>()

const contactsStore = useContactsStore()
const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const identityStore = useIdentityStore()
const toast = useToast()

/**
 * Phase 4: Get online status for a contact using identity store
 */
function getContactOnlineStatus(contact: Contact): OnlineStatus {
  const pubKey = contact.identityId || contact.publicKey
  if (!pubKey) return 'unknown'
  return identityStore.getOnlineStatus(pubKey)
}

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Wizard state - reduced to 3 steps (no threshold for n-of-n)
const currentStep = ref(1)
const totalSteps = 3

// Form state
const name = ref('')
const description = ref('')
const selectedContactIds = ref<string[]>([])

// My MuSig2 public key (from dedicated account)
const myPublicKey = computed(() => {
  return walletStore.getPublicKeyHex(AccountPurpose.MUSIG2) || ''
})

// Get contacts with public keys (eligible for shared wallets)
// These are contacts that have MuSig2 capabilities (publicKey set)
const eligibleContacts = computed(() =>
  contactsStore.contacts.filter(c => c.publicKey || c.identityId),
)

// Participant count includes self
const participantCount = computed(() => selectedContactIds.value.length + 1)

// All participant public keys (self + selected contacts)
const participantPublicKeys = computed(() => {
  const keys: string[] = []

  // Add selected contacts' keys
  for (const contactId of selectedContactIds.value) {
    const contact = contactsStore.contacts.find(c => c.id === contactId)
    const pubKey = contact?.publicKey || contact?.identityId
    if (pubKey && !keys.includes(pubKey)) {
      keys.push(pubKey)
    }
  }

  return keys
})

// Step validation
const canProceedStep1 = computed(() => name.value.trim().length > 0)
const canProceedStep2 = computed(() => selectedContactIds.value.length >= 1)

// Selected contacts with details
const selectedContacts = computed((): Contact[] =>
  selectedContactIds.value
    .map(id => contactsStore.contacts.find(c => c.id === id))
    .filter((c): c is Contact => !!c)
)

function toggleContact(contactId: string) {
  const index = selectedContactIds.value.indexOf(contactId)
  if (index >= 0) {
    selectedContactIds.value.splice(index, 1)
  } else {
    selectedContactIds.value.push(contactId)
  }
}

function isSelected(contactId: string): boolean {
  return selectedContactIds.value.includes(contactId)
}

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

/**
 * Check if ready for wallet creation
 * Note: P2P is NOT required for wallet creation (only for spending)
 */
const canCreate = computed(() => {
  if (!musig2Store.initialized) return false
  if (!myPublicKey.value) return false
  if (!canProceedStep1.value) return false
  if (!canProceedStep2.value) return false
  if (participantPublicKeys.value.length < 1) return false
  return true
})

/**
 * Readiness message for wallet creation
 */
const readinessMessage = computed(() => {
  if (!myPublicKey.value) return 'Wallet not initialized'
  if (!musig2Store.initialized) return 'MuSig2 service not ready'
  if (participantPublicKeys.value.length < 1) return 'Select at least one participant'
  return null
})

/**
 * Create wallet via store with MuSig2 key aggregation
 */
const isCreating = ref(false)

async function handleCreate() {
  if (!canCreate.value) return

  isCreating.value = true
  try {
    // Create the shared wallet via store with public keys
    const wallet = await musig2Store.createSharedWallet({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      participantPublicKeys: participantPublicKeys.value,
    })

    // Notify wallet created
    musig2Store.notifyWalletCreated(wallet)

    toast.add({
      title: 'Wallet Created',
      description: `"${wallet.name}" is ready to use with ${wallet.participants.length} participants`,
      color: 'success',
    })

    emit('created', { id: wallet.id, name: wallet.name })
    resetForm()
  } catch (err) {
    toast.add({
      title: 'Creation Failed',
      description: err instanceof Error ? err.message : 'Failed to create wallet',
      color: 'error',
    })
  } finally {
    isCreating.value = false
  }
}

function resetForm() {
  currentStep.value = 1
  name.value = ''
  description.value = ''
  selectedContactIds.value = []
}

// Reset on close
watch(isOpen, open => {
  if (!open) {
    resetForm()
  }
})

</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          <span class="font-semibold">Create Shared Wallet</span>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm">
          Step {{ currentStep }} of {{ totalSteps }}
        </UBadge>
      </div>
    </template>

    <template #body>
      <!-- Step Progress -->
      <div class="flex items-center gap-2 mb-6">
        <div v-for="step in totalSteps" :key="step" class="flex-1 h-1 rounded-full transition-colors" :class="[
          step <= currentStep ? 'bg-primary' : 'bg-muted',
        ]" />
      </div>

      <!-- Step 1: Name & Description -->
      <div v-if="currentStep === 1" class="space-y-4">
        <div class="text-center mb-4">
          <UIcon name="i-lucide-edit-3" class="w-10 h-10 text-primary mx-auto mb-2" />
          <h3 class="font-semibold">Name Your Wallet</h3>
          <p class="text-sm text-muted">Give your shared wallet a memorable name</p>
        </div>

        <UFormField label="Wallet Name" required>
          <UInput v-model="name" placeholder="e.g., Family Savings" autofocus size="lg" />
        </UFormField>

        <UFormField label="Description" hint="Optional">
          <UTextarea v-model="description" placeholder="What is this wallet for?" :rows="3" />
        </UFormField>
      </div>

      <!-- Step 2: Select Participants -->
      <div v-else-if="currentStep === 2" class="space-y-4">
        <div class="text-center mb-4">
          <UIcon name="i-lucide-users" class="w-10 h-10 text-primary mx-auto mb-2" />
          <h3 class="font-semibold">Select Participants</h3>
          <p class="text-sm text-muted">Choose who can sign transactions</p>
        </div>

        <!-- Self (always included) -->
        <div
          class="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary/20">
          <UCheckbox :model-value="true" disabled />
          <CommonAvatar :name="p2pStore.myPresenceConfig?.nickname || 'You'" size="sm" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-medium">{{ p2pStore.myPresenceConfig?.nickname || 'You' }}</p>
              <UBadge color="primary" variant="subtle" size="xs">Required</UBadge>
            </div>
            <p class="text-xs text-muted">Your wallet</p>
          </div>
        </div>

        <!-- Contacts -->
        <div v-if="eligibleContacts.length" class="space-y-2 max-h-48 overflow-y-auto">
          <div v-for="contact in eligibleContacts" :key="contact.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-default hover:bg-muted/50 cursor-pointer transition-colors"
            :class="isSelected(contact.id) && 'bg-primary-50 dark:bg-primary-900/20 border-primary/20'"
            @click="toggleContact(contact.id)">
            <UCheckbox :model-value="isSelected(contact.id)" @click.stop
              @update:model-value="toggleContact(contact.id)" />
            <CommonAvatar :name="contact.name" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ contact.name }}</p>
              <p class="text-xs text-muted truncate font-mono">{{ contact.address }}</p>
            </div>
            <CommonOnlineStatusBadge v-if="getContactOnlineStatus(contact) !== 'unknown'"
              :status="getContactOnlineStatus(contact)" show-label />
          </div>
        </div>

        <UiAppEmptyState v-else icon="i-lucide-users" title="No eligible contacts"
          description="Add contacts with public keys to create shared wallets" />

        <div v-if="selectedContactIds.length" class="p-3 bg-muted/50 rounded-lg text-sm">
          <span class="font-medium">{{ participantCount }}</span> participants selected
        </div>
      </div>

      <!-- Step 3: Review & Create (n-of-n) -->
      <div v-else-if="currentStep === 3" class="space-y-4">
        <div class="text-center mb-4">
          <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-primary mx-auto mb-2" />
          <h3 class="font-semibold">Review & Create</h3>
          <p class="text-sm text-muted">Confirm your shared wallet settings</p>
        </div>

        <div class="space-y-3">
          <!-- Name -->
          <div class="p-3 bg-muted/50 rounded-lg">
            <p class="text-xs text-muted mb-1">Wallet Name</p>
            <p class="font-medium">{{ name }}</p>
            <p v-if="description" class="text-sm text-muted mt-1">{{ description }}</p>
          </div>

          <!-- N-of-N Info -->
          <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary/20">
            <p class="text-xs text-muted mb-1">Signature Requirement</p>
            <p class="font-medium text-primary">{{ participantCount }}-of-{{ participantCount }} (All must sign)</p>
            <p class="text-xs text-muted mt-1">
              MuSig2 requires all participants to sign every transaction.
            </p>
          </div>

          <!-- Participants -->
          <div class="p-3 bg-muted/50 rounded-lg">
            <p class="text-xs text-muted mb-2">Participants ({{ participantCount }})</p>
            <div class="space-y-2">
              <!-- Self -->
              <div class="flex items-center gap-2">
                <CommonAvatar :name="p2pStore.myPresenceConfig?.nickname || 'You'" size="xs" />
                <span class="text-sm font-medium">{{ p2pStore.myPresenceConfig?.nickname || 'You' }}</span>
                <UBadge color="primary" variant="subtle" size="xs">You</UBadge>
              </div>
              <!-- Others -->
              <div v-for="contact in selectedContacts" :key="contact.id" class="flex items-center gap-2">
                <CommonAvatar :name="contact.name" size="xs" />
                <span class="text-sm">{{ contact.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <UAlert color="warning" icon="i-lucide-alert-triangle">
          <template #description>
            Once created, the wallet configuration cannot be changed. Make sure all settings are correct.
          </template>
        </UAlert>

        <!-- Readiness Warning -->
        <UAlert v-if="readinessMessage" color="error" icon="i-lucide-alert-circle">
          <template #description>
            {{ readinessMessage }}
          </template>
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3">
        <!-- Back / Cancel -->
        <UButton class="flex-1" color="neutral" variant="outline" :disabled="isCreating"
          @click="currentStep > 1 ? prevStep() : isOpen = false">
          {{ currentStep > 1 ? 'Back' : 'Cancel' }}
        </UButton>

        <!-- Next / Create -->
        <UButton v-if="currentStep < totalSteps" class="flex-1" color="primary"
          :disabled="(currentStep === 1 && !canProceedStep1) || (currentStep === 2 && !canProceedStep2)"
          @click="nextStep">
          Next
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
        </UButton>
        <UButton v-else class="flex-1" color="primary" :disabled="!canCreate" :loading="isCreating"
          @click="handleCreate">
          <UIcon name="i-lucide-shield-check" class="w-4 h-4" />
          Create Wallet
        </UButton>
      </div>
    </template>
  </UModal>
</template>
