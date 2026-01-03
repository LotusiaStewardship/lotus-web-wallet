<script setup lang="ts">
/**
 * Create Wallet Modal Component
 *
 * Multi-step wizard for creating a shared wallet:
 * 1. Name & description
 * 2. Select participants
 * 3. Set threshold
 * 4. Confirm & create
 */
import { usePeopleStore } from '~/stores/people'
import { useMuSig2Store } from '~/stores/musig2'
import { registerBackHandler } from '~/composables/useOverlays'
import type { Person } from '~/types/people'

const props = defineProps<{
  preselectedContact?: string
  backPressed?: number // Counter that increments on each back button press
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const peopleStore = usePeopleStore()
const musig2Store = useMuSig2Store()

// Reset state on mount
onMounted(() => {
  reset()
  if (props.preselectedContact) {
    form.participantIds = [props.preselectedContact]
  }
})

// Register back handler for multi-stage navigation
onMounted(() => {
  registerBackHandler(() => {
    if (step.value === 'participants') {
      step.value = 'name'
      return false // Handled internally
    } else if (step.value === 'threshold') {
      step.value = 'participants'
      return false // Handled internally
    } else if (step.value === 'confirm') {
      step.value = 'threshold'
      return false // Handled internally
    } else if (step.value === 'error') {
      step.value = 'confirm'
      return false // Handled internally
    } else if (step.value === 'creating' || step.value === 'success') {
      return true // Close modal
    } else {
      // On first step (name), allow close
      return true
    }
  })
})

type Step = 'name' | 'participants' | 'threshold' | 'confirm' | 'creating' | 'success' | 'error'

const step = ref<Step>('name')
const creating = ref(false)
const creationStatus = ref('')
const creationError = ref('')
const createdWalletId = ref<string | null>(null)

const form = reactive({
  name: '',
  description: '',
  participantIds: [] as string[],
  threshold: 2,
})


// Contacts that can participate in shared wallets (have public keys)
const eligibleContacts = computed(() =>
  peopleStore.allPeople.filter(p => p.canSign && p.publicKeyHex)
)

const totalParticipants = computed(() => form.participantIds.length + 1) // +1 for self

const thresholdOptions = computed(() => {
  const total = totalParticipants.value
  const options = []

  for (let i = 2; i <= total; i++) {
    options.push({
      value: i,
      label: `${i}-of-${total}`,
      description: i === total
        ? 'All participants must approve'
        : `${i} of ${total} participants must approve`,
    })
  }

  return options
})

const participantReadyStatus = computed(() => {
  return [
    { name: 'You', ready: true },
    ...form.participantIds.map(id => {
      const person = peopleStore.getById(id)
      return {
        name: person?.name || 'Unknown',
        ready: false, // Will be updated during creation
      }
    }),
  ]
})

function isSelected(person: Person): boolean {
  return form.participantIds.includes(person.id)
}

function toggleParticipant(person: Person) {
  const index = form.participantIds.indexOf(person.id)
  if (index === -1) {
    form.participantIds.push(person.id)
  } else {
    form.participantIds.splice(index, 1)
  }

  // Adjust threshold if needed
  if (form.threshold > totalParticipants.value) {
    form.threshold = totalParticipants.value
  }
}

function getParticipantName(id: string): string {
  return peopleStore.getById(id)?.name || 'Unknown'
}

async function createWallet() {
  creating.value = true
  step.value = 'creating'
  creationStatus.value = 'Collecting participant public keys...'
  creationError.value = ''

  try {

    // Collect public keys from selected participants
    const participantPublicKeys: string[] = []
    for (const personId of form.participantIds) {
      const person = peopleStore.getById(personId)
      if (!person?.publicKeyHex) {
        throw new Error(`Participant ${person?.name || personId} does not have a public key`)
      }
      participantPublicKeys.push(person.publicKeyHex)
    }

    if (participantPublicKeys.length === 0) {
      throw new Error('No participants with public keys selected')
    }

    creationStatus.value = 'Generating MuSig2 Taproot address...'

    // Create the shared wallet using musig2Store
    // This computes the aggregated public key and Taproot address locally
    // No P2P connection required - that's only needed for spending
    const wallet = await musig2Store.createSharedWallet({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      participantPublicKeys,
    })

    createdWalletId.value = wallet.id
    step.value = 'success'
  } catch (error) {
    console.error('[CreateWalletModal] Wallet creation failed:', error)
    creationError.value = error instanceof Error ? error.message : 'Creation failed'
    step.value = 'error'
  } finally {
    creating.value = false
  }
}

function viewWallet() {
  if (createdWalletId.value) {
    navigateTo(`/people/wallets/${createdWalletId.value}`)
  }
  close()
}

function close() {
  emit('close')
}

function reset() {
  step.value = 'name'
  form.name = ''
  form.description = ''
  form.participantIds = []
  form.threshold = 2
  createdWalletId.value = null
  creationError.value = ''
  creationStatus.value = ''
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <!-- Step 1: Name & Description -->
      <div v-if="step === 'name'" class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Create Shared Wallet</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Intro -->
        <div class="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div class="flex gap-3">
            <UIcon name="i-lucide-shield" class="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p class="font-medium">Multi-signature security</p>
              <p class="text-sm text-gray-500 mt-1">
                Shared wallets require multiple people to approve transactions,
                providing extra security for your funds.
              </p>
            </div>
          </div>
        </div>

        <FormInput v-model="form.name" label="Wallet Name" placeholder="e.g., Family Savings" required autofocus />

        <FormTextarea v-model="form.description" label="Description" placeholder="What is this wallet for?" :rows="2" />

        <UButton color="primary" block :disabled="!form.name.trim()" @click="step = 'participants'">
          Continue
        </UButton>
      </div>

      <!-- Step 2: Select Participants -->
      <div v-else-if="step === 'participants'" class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'name'" />
          <h2 class="text-lg font-semibold">Select Participants</h2>
        </div>

        <p class="text-sm text-gray-500">
          Choose contacts who will co-own this wallet. They must have a public key.
        </p>

        <!-- You (always included) -->
        <div class="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              You
            </div>
            <div class="flex-1">
              <p class="font-medium">You</p>
              <p class="text-xs text-gray-500">Always included</p>
            </div>
            <UIcon name="i-lucide-check" class="w-5 h-5 text-primary" />
          </div>
        </div>

        <!-- Eligible Contacts -->
        <div v-if="eligibleContacts.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
          <button v-for="person in eligibleContacts" :key="person.id" :class="[
            'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
            isSelected(person)
              ? 'bg-primary/10 border border-primary/30'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent',
          ]" @click="toggleParticipant(person)">
            <PeoplePersonAvatar :person="person" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ person.name }}</p>
              <p class="text-xs text-gray-500">
                {{ person.isOnline ? '🟢 Online' : 'Offline' }}
              </p>
            </div>
            <UIcon :name="isSelected(person) ? 'i-lucide-check-circle' : 'i-lucide-circle'"
              :class="['w-5 h-5', isSelected(person) ? 'text-primary' : 'text-gray-400']" />
          </button>
        </div>

        <!-- No eligible contacts -->
        <div v-else class="text-center py-6">
          <UIcon name="i-lucide-users" class="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p class="text-sm text-gray-500">No eligible contacts</p>
          <p class="text-xs text-gray-400 mt-1">
            Contacts need a public key to participate in shared wallets.
          </p>
        </div>

        <!-- Selection summary -->
        <div v-if="form.participantIds.length > 0" class="pt-3 border-t border-gray-200 dark:border-gray-800">
          <p class="text-sm text-gray-500">
            {{ totalParticipants }} participants selected
          </p>
        </div>

        <UButton color="primary" block :disabled="form.participantIds.length === 0" @click="step = 'threshold'">
          Continue
        </UButton>
      </div>

      <!-- Step 3: Set Threshold -->
      <div v-else-if="step === 'threshold'" class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'participants'" />
          <h2 class="text-lg font-semibold">Approval Threshold</h2>
        </div>

        <p class="text-sm text-gray-500">
          How many participants must approve each transaction?
        </p>

        <!-- Threshold Selection -->
        <div class="space-y-2">
          <button v-for="option in thresholdOptions" :key="option.value" :class="[
            'w-full p-4 rounded-xl border-2 transition-colors text-left',
            form.threshold === option.value
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
          ]" @click="form.threshold = option.value">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold">{{ option.label }}</p>
                <p class="text-sm text-gray-500">{{ option.description }}</p>
              </div>
              <div :class="[
                'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                form.threshold === option.value
                  ? 'border-primary bg-primary'
                  : 'border-gray-300',
              ]">
                <UIcon v-if="form.threshold === option.value" name="i-lucide-check" class="w-4 h-4 text-white" />
              </div>
            </div>
          </button>
        </div>

        <UButton color="primary" block @click="step = 'confirm'">
          Continue
        </UButton>
      </div>

      <!-- Step 4: Confirm -->
      <div v-else-if="step === 'confirm'" class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'threshold'" />
          <h2 class="text-lg font-semibold">Confirm Wallet</h2>
        </div>

        <!-- Summary -->
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-4">
          <div class="flex justify-between">
            <span class="text-gray-500">Name</span>
            <span class="font-medium">{{ form.name }}</span>
          </div>

          <div class="flex justify-between">
            <span class="text-gray-500">Type</span>
            <span class="font-medium">{{ form.threshold }}-of-{{ totalParticipants }}</span>
          </div>

          <div>
            <span class="text-gray-500">Participants</span>
            <div class="flex flex-wrap gap-2 mt-2">
              <UBadge variant="subtle">You</UBadge>
              <UBadge v-for="id in form.participantIds" :key="id" variant="subtle">
                {{ getParticipantName(id) }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div class="flex gap-2">
            <UIcon name="i-lucide-info" class="w-5 h-5 text-primary flex-shrink-0" />
            <p class="text-sm">
              The wallet address is computed locally from public keys. Spending requires all participants to be online
              for MuSig2 signing.
            </p>
          </div>
        </div>

        <UButton color="primary" block size="lg" :loading="creating" @click="createWallet">
          Create Wallet
        </UButton>
      </div>

      <!-- Step 5: Creating -->
      <div v-else-if="step === 'creating'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Creating Wallet</h2>
          <p class="text-gray-500">{{ creationStatus }}</p>
        </div>

        <!-- Progress -->
        <div class="space-y-2">
          <div v-for="(participant, index) in participantReadyStatus" :key="index"
            class="flex items-center gap-3 p-2 rounded-lg">
            <UIcon :name="participant.ready ? 'i-lucide-check-circle' : 'i-lucide-loader-2'"
              :class="['w-5 h-5', participant.ready ? 'text-success' : 'text-gray-400 animate-spin']" />
            <span>{{ participant.name }}</span>
          </div>
        </div>
      </div>

      <!-- Step 6: Success -->
      <div v-else-if="step === 'success'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Wallet Created!</h2>
          <p class="text-gray-500">{{ form.name }} is ready to use</p>
        </div>

        <div class="space-y-2">
          <UButton color="primary" block @click="viewWallet">
            View Wallet
          </UButton>
          <UButton variant="ghost" block @click="close">Done</UButton>
        </div>
      </div>

      <!-- Step 7: Error -->
      <div v-else-if="step === 'error'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-x" class="w-8 h-8 text-error" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Creation Failed</h2>
          <p class="text-gray-500">{{ creationError }}</p>
        </div>

        <div class="space-y-2">
          <UButton color="primary" block @click="step = 'confirm'">Try Again</UButton>
          <UButton variant="ghost" block @click="close">Cancel</UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
