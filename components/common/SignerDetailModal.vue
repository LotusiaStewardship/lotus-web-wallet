<script setup lang="ts">
/**
 * CommonSignerDetailModal
 *
 * Unified modal for viewing signer details.
 * Used by both P2P and Shared Wallets contexts.
 *
 * Phase 5.5: Created as part of UI Component Consolidation.
 */
import { useContactsStore } from '~/stores/contacts'
import type { SignerCapabilities } from '~/types/musig2'

interface SignerData {
  id: string
  peerId: string
  publicKey?: string
  publicKeyHex?: string
  nickname?: string
  reputation?: number
  isOnline?: boolean
  responseTime?: number
  capabilities?: SignerCapabilities | Record<string, boolean>
  transactionTypes?: string[]
  fee?: number | string
  walletAddress?: string
  discoveredAt?: number
  lastSeen?: number
}

const props = defineProps<{
  signer: SignerData | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  request: []
  addToWallet: []
  saveContact: []
}>()

const { formatXPI } = useAmount()
const contactsStore = useContactsStore()

const isContact = computed(() =>
  props.signer
    ? contactsStore.contacts.some(c => c.peerId === props.signer?.peerId)
    : false,
)

const publicKey = computed(
  () => props.signer?.publicKeyHex || props.signer?.publicKey || '',
)

const txTypeLabels = computed(() => {
  if (!props.signer) return []
  if (props.signer.capabilities) {
    return Object.entries(props.signer.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => formatTxType(type))
  }
  if (props.signer.transactionTypes) {
    return props.signer.transactionTypes.map(formatTxType)
  }
  return []
})

function formatTxType(type: string): string {
  const labels: Record<string, string> = {
    spend: 'Spend',
    swap: 'Swap',
    coinjoin: 'CoinJoin',
    custody: 'Custody',
    escrow: 'Escrow',
    channel: 'Channel',
  }
  return labels[type.toLowerCase()] || type
}

const initials = computed(() => {
  if (!props.signer?.nickname) return null
  const parts = props.signer.nickname.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.signer.nickname.slice(0, 2).toUpperCase()
})

function close() {
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-user" class="w-5 h-5 text-primary" />
        <span>Signer Details</span>
      </div>
    </template>

    <div v-if="signer" class="p-4 space-y-4">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <span v-if="initials" class="text-xl font-semibold text-primary">
            {{ initials }}
          </span>
          <UIcon v-else name="i-lucide-user" class="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">
            {{ signer.nickname || 'Anonymous' }}
          </h3>
          <div class="flex items-center gap-2 mt-1">
            <UBadge :color="signer.isOnline ? 'success' : 'neutral'" variant="subtle" size="sm">
              {{ signer.isOnline ? 'Online' : 'Offline' }}
            </UBadge>
            <UBadge v-if="signer.reputation" color="warning" variant="subtle" size="sm">
              ⭐ {{ signer.reputation }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Capabilities -->
      <div v-if="txTypeLabels.length">
        <p class="text-sm text-muted mb-2">Capabilities</p>
        <div class="flex flex-wrap gap-1">
          <UBadge v-for="type in txTypeLabels" :key="type" color="neutral" variant="outline" size="sm">
            {{ type }}
          </UBadge>
        </div>
      </div>

      <!-- Details -->
      <div class="space-y-3">
        <div v-if="signer.walletAddress">
          <p class="text-sm text-muted">Wallet Address</p>
          <p class="font-mono text-sm break-all">{{ signer.walletAddress }}</p>
        </div>

        <div v-if="publicKey">
          <p class="text-sm text-muted">Public Key</p>
          <p class="font-mono text-xs break-all">{{ publicKey }}</p>
        </div>

        <div v-if="signer.peerId">
          <p class="text-sm text-muted">Peer ID</p>
          <p class="font-mono text-xs break-all">{{ signer.peerId }}</p>
        </div>

        <div class="flex gap-6">
          <div v-if="signer.fee !== undefined">
            <p class="text-sm text-muted">Fee</p>
            <p class="font-medium">
              {{ signer.fee ? formatXPI(BigInt(signer.fee)) : 'Free' }}
            </p>
          </div>
          <div v-if="signer.responseTime">
            <p class="text-sm text-muted">Avg Response</p>
            <p class="font-medium">{{ signer.responseTime }}s</p>
          </div>
          <div v-if="signer.reputation">
            <p class="text-sm text-muted">Reputation</p>
            <p class="font-medium">⭐ {{ signer.reputation }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between gap-2">
        <UButton color="neutral" variant="ghost" @click="close">
          Close
        </UButton>
        <div class="flex gap-2">
          <UButton v-if="!isContact" color="neutral" variant="outline" icon="i-lucide-user-plus"
            @click="emit('saveContact')">
            Save Contact
          </UButton>
          <slot name="primary-action" />
        </div>
      </div>
    </template>
  </UModal>
</template>
