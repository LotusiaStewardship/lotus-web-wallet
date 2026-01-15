<script setup lang="ts">
/**
 * Add Contact Modal Component
 *
 * Modal for adding a new contact with name, address, and optional public key.
 */
import { usePeopleStore } from '~/stores/people'
import type { Person } from '~/utils/types/people'

const props = defineProps<{
  initialAddress?: string
  initialName?: string
  initialPublicKey?: string
  editPerson?: Person // New prop for edit mode
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const peopleStore = usePeopleStore()
const { isValidAddress } = useAddress()

// Reset form on mount
onMounted(() => {
  if (props.editPerson) {
    // Edit mode - populate with existing data
    form.name = props.editPerson.name
    form.address = props.editPerson.address
    form.publicKeyHex = props.editPerson.publicKeyHex || ''
    form.notes = props.editPerson.notes || ''
    form.isFavorite = props.editPerson.isFavorite
  } else {
    // Add mode - use initial values or defaults
    form.name = props.initialName || ''
    form.address = props.initialAddress || ''
    form.publicKeyHex = props.initialPublicKey || ''
    form.notes = ''
    form.isFavorite = false
  }
})

const form = reactive({
  name: '',
  address: '',
  publicKeyHex: '',
  notes: '',
  isFavorite: false,
})

// Watch for initial values changes
watch([() => props.initialAddress, () => props.initialName, () => props.initialPublicKey], ([newAddress, newName, newPubKey]) => {
  if (newAddress) form.address = newAddress
  if (newName) form.name = newName
  if (newPubKey) form.publicKeyHex = newPubKey
}, { immediate: true })

const saving = ref(false)

const addressError = computed(() => {
  if (!form.address) return null
  if (!isValidAddress(form.address)) return 'Invalid address'
  return null
})

const publicKeyError = computed(() => {
  if (!form.publicKeyHex) return null
  if (!/^0[23][a-fA-F0-9]{64}$/.test(form.publicKeyHex)) {
    return 'Invalid public key format'
  }
  return null
})

const isValid = computed(() => {
  return (
    form.name.trim() &&
    form.address.trim() &&
    !addressError.value &&
    !publicKeyError.value
  )
})

async function handleSubmit() {
  if (!isValid.value) return

  saving.value = true

  try {
    if (props.editPerson) {
      // Edit mode - update existing person
      peopleStore.updatePerson(props.editPerson.id, {
        name: form.name.trim(),
        address: form.address.trim(),
        publicKeyHex: form.publicKeyHex.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isFavorite: form.isFavorite,
        canSign: !!form.publicKeyHex,
        level: form.publicKeyHex ? 1 : 0,
      })
    } else {
      // Add mode - create new person
      peopleStore.addPerson({
        name: form.name.trim(),
        address: form.address.trim(),
        publicKeyHex: form.publicKeyHex.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isFavorite: form.isFavorite,
        isOnline: false,
        canSign: !!form.publicKeyHex,
        level: form.publicKeyHex ? 1 : 0,
        tags: [],
        transactionCount: 0,
        totalSent: 0n,
        totalReceived: 0n,
        sharedWalletIds: [],
      })
    }

    close()
  } catch (error) {
    console.error('Failed to save person:', error)
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('close')
}

function close() {
  emit('close')
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>

      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ editPerson ? 'Edit Contact' : 'Add Contact' }}</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Form -->
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <FormInput v-model="form.name" label="Name" required autofocus />

          <FormInput v-model="form.address" label="Address" placeholder="e.g. lotus_JGvNQCVH3NuPRWtmrKom3sq9rEs..."
            :error="addressError" required />

          <FormInput v-model="form.publicKeyHex" label="Public Key"
            description="Optional: Adding the Contact's public key enables shared wallets and signing"
            :error="publicKeyError" />

          <FormTextarea v-model="form.notes" label="Notes" placeholder="Add notes about this contact..." :rows="3" />

          <FormCheckbox v-model="form.isFavorite" label="Add to favorites"
            description="Favorites appear at the top of your contacts list" />
        </form>

        <!-- Action Buttons -->

        <div class="grid grid-cols-2 gap-3 pt-4">
          <UButton variant="outline" block @click="handleCancel">
            Cancel
          </UButton>
          <UButton color="primary" block :loading="saving" @click="handleSubmit">
            {{ editPerson ? 'Save Changes' : 'Add Contact' }}
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
