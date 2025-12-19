<script setup lang="ts">
/**
 * ContactDetailSlideover
 *
 * Phase 4: Migrated to use useContactContext facade composable.
 * Slideover showing contact details and activity.
 */
import type { Contact } from '~/stores/contacts'
import { useContactContext } from '~/composables/useContactContext'

const props = defineProps<{
  /** Whether slideover is open */
  open: boolean
  /** Contact to display */
  contact: Contact | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: [contact: Contact]
  delete: [contact: Contact]
  send: [contact: Contact]
}>()

const router = useRouter()
const { formatXPI } = useAmount()
const { copy } = useClipboard()
const { timeAgo } = useTime()
const { truncateAddress } = useAddress()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Use facade composable for unified contact data
const contactId = computed(() => props.contact?.id ?? '')
const {
  identity,
  onlineStatus,
  sharedWallets: sharedWalletsWithContact,
  transactionCount,
  canMuSig2,
  publicKeyHex,
} = useContactContext(contactId)

// Phase 6: Removed isOnline - now using OnlineStatusBadge component directly
const isSigner = computed(() => canMuSig2.value)

// Transaction stats - simplified since we now use transactionCount from facade
const transactionStats = computed(() => {
  return {
    total: transactionCount.value,
    sentCount: 0, // Could be enhanced in facade if needed
    receivedCount: 0,
  }
})

// Can request signature?
const canRequestSignature = computed(() => {
  return (
    canMuSig2.value &&
    props.contact?.signerCapabilities &&
    onlineStatus.value === 'online'
  )
})

// Confirm delete
const confirmDelete = ref(false)

function handleDelete() {
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  if (props.contact) {
    emit('delete', props.contact)
  }
  confirmDelete.value = false
}

// Request signature from contact
function handleRequestSignature() {
  if (!props.contact?.peerId) return
  router.push({
    path: '/people/p2p',
    query: {
      tab: 'signers',
      requestFrom: props.contact.peerId,
    },
  })
  isOpen.value = false
}

// Create shared wallet with contact
function handleCreateSharedWallet() {
  if (!props.contact?.id) return
  router.push({
    path: '/people/shared-wallets',
    query: { createWith: props.contact.id },
  })
  isOpen.value = false
}

// View shared wallet
function viewSharedWallet(walletId: string) {
  router.push(`/people/shared-wallets/${walletId}`)
  isOpen.value = false
}

// Copy public key
function copyPublicKey() {
  if (props.contact?.publicKey) {
    copy(props.contact.publicKey, 'Public Key')
  }
}

// Reset confirm on close
watch(isOpen, open => {
  if (!open) {
    confirmDelete.value = false
  }
})
</script>

<template>
  <USlideover v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-user" class="w-5 h-5" />
        <span class="font-semibold">Contact Details</span>
      </div>
    </template>

    <template #body>
      <div v-if="contact" class="space-y-6">
        <!-- Header -->
        <div class="text-center">
          <div class="relative inline-block">
            <ContactsContactAvatar :contact="contact" size="xl" class="mx-auto mb-4" />
            <!-- Phase 6: Online Status using OnlineStatusBadge -->
            <div v-if="contact.peerId || contact.identityId" class="absolute bottom-3 right-0">
              <CommonOnlineStatusBadge :status="onlineStatus" size="sm" />
            </div>
          </div>
          <div class="flex items-center justify-center gap-2 mb-1">
            <h2 class="text-xl font-semibold">{{ contact.name }}</h2>
            <UIcon v-if="contact.isFavorite" name="i-lucide-star" class="w-5 h-5 text-warning" />
          </div>
          <div class="flex items-center justify-center gap-1">
            <p class="text-sm text-muted font-mono">
              {{ truncateAddress(contact.address, 12, 8) }}
            </p>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy"
              @click="copy(contact.address, 'Address')" />
          </div>
          <!-- Phase 6: Online Status Text using OnlineStatusBadge with label -->
          <div v-if="contact.peerId || contact.identityId" class="flex items-center justify-center gap-2 mt-1">
            <CommonOnlineStatusBadge :status="onlineStatus" show-label size="sm" />
            <span v-if="contact.lastSeenOnline && onlineStatus === 'offline'" class="text-xs text-muted">
              • Last seen {{ timeAgo(contact.lastSeenOnline) }}
            </span>
          </div>
        </div>

        <!-- Badges -->
        <div v-if="isSigner || contact.tags?.length" class="flex flex-wrap justify-center gap-2">
          <UBadge v-if="isSigner" color="primary" variant="subtle">
            <UIcon name="i-lucide-shield" class="w-3 h-3 mr-1" />
            MuSig2 Ready
          </UBadge>
          <UBadge v-for="tag in contact.tags" :key="tag" color="neutral" variant="subtle">
            {{ tag }}
          </UBadge>
        </div>

        <!-- Quick Actions -->
        <div class="flex gap-2">
          <UButton class="flex-1" color="primary" icon="i-lucide-send" @click="emit('send', contact)">
            Send
          </UButton>
          <UButton v-if="canRequestSignature" class="flex-1" color="primary" variant="outline" icon="i-lucide-pen-tool"
            @click="handleRequestSignature">
            Request Signature
          </UButton>
        </div>

        <!-- P2P & MuSig2 Section -->
        <div v-if="contact.publicKey || contact.peerId" class="border-t border-default pt-4">
          <h3 class="text-sm font-medium flex items-center gap-2 mb-4">
            <UIcon name="i-lucide-radio" class="w-4 h-4 text-primary" />
            P2P & Multi-Signature
          </h3>

          <!-- Public Key -->
          <div v-if="contact.publicKey" class="mb-4">
            <p class="text-xs text-muted mb-1">Public Key</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 p-2 bg-muted/30 rounded text-xs font-mono truncate">
                {{ contact.publicKey }}
              </code>
              <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyPublicKey" />
            </div>
          </div>

          <!-- Signer Capabilities -->
          <div v-if="contact.signerCapabilities" class="mb-4">
            <p class="text-xs text-muted mb-2">Capabilities</p>
            <div class="flex flex-wrap gap-1">
              <UBadge v-if="contact.signerCapabilities.musig2" color="primary" variant="subtle" size="xs">
                MuSig2
              </UBadge>
              <UBadge v-if="contact.signerCapabilities.threshold" color="info" variant="subtle" size="xs">
                {{ contact.signerCapabilities.threshold }}-of-N
              </UBadge>
            </div>
          </div>

          <!-- Shared Wallets with Contact -->
          <div v-if="sharedWalletsWithContact.length > 0" class="mb-4">
            <p class="text-xs text-muted mb-2">Shared Wallets</p>
            <div class="space-y-2">
              <button v-for="wallet in sharedWalletsWithContact" :key="wallet.id"
                class="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                @click="viewSharedWallet(wallet.id)">
                <UIcon name="i-lucide-shield" class="w-4 h-4 text-primary" />
                <span class="flex-1 text-sm truncate">{{ wallet.name }}</span>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          <!-- Create Shared Wallet Action -->
          <UButton v-if="contact.publicKey && sharedWalletsWithContact.length === 0" variant="outline" size="sm"
            class="w-full" icon="i-lucide-plus" @click="handleCreateSharedWallet">
            Create Shared Wallet
          </UButton>

          <!-- No public key prompt -->
          <div v-if="!contact.publicKey && contact.peerId" class="p-3 bg-muted/30 rounded-lg">
            <p class="text-sm text-muted mb-2">
              This contact doesn't have a public key. Add one to enable shared wallets.
            </p>
            <UButton size="sm" variant="outline" @click="emit('edit', contact)">
              Add Public Key
            </UButton>
          </div>
        </div>

        <!-- Transaction History with Contact -->
        <div v-if="transactionStats.total > 0" class="border-t border-default pt-4">
          <h3 class="text-sm font-medium mb-2">Transaction History</h3>
          <p class="text-sm text-muted">
            {{ transactionStats.total }} transactions
            <span class="text-xs">
              ({{ transactionStats.sentCount }} sent, {{ transactionStats.receivedCount }} received)
            </span>
          </p>
          <NuxtLink :to="`/explore/explorer/address/${contact.address}`"
            class="text-sm text-primary hover:underline mt-1 inline-block">
            View in Explorer →
          </NuxtLink>
        </div>

        <!-- Notes -->
        <div v-if="contact.notes" class="border-t border-default pt-4">
          <h3 class="text-sm font-medium mb-2">Notes</h3>
          <p class="text-sm text-muted bg-muted/30 rounded-lg p-3">
            {{ contact.notes }}
          </p>
        </div>

        <!-- P2P Identity (collapsed) -->
        <div v-if="contact.peerId && !contact.publicKey" class="border-t border-default pt-4">
          <h3 class="text-sm font-medium mb-2">P2P Identity</h3>
          <p class="text-xs text-muted font-mono bg-muted/30 rounded-lg p-3 break-all">
            {{ contact.peerId }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <UButton :color="confirmDelete ? 'error' : 'neutral'" :variant="confirmDelete ? 'solid' : 'ghost'"
          icon="i-lucide-trash-2" @click="handleDelete">
          {{ confirmDelete ? 'Confirm Delete' : 'Delete' }}
        </UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-edit" @click="contact && emit('edit', contact)">
          Edit
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
