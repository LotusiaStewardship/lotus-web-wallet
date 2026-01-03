<script setup lang="ts">
/**
 * Shared Wallet Detail Page
 *
 * Shows detailed information about a shared wallet.
 * Shared wallets are stored in peopleStore (single source of truth).
 */
import { useMuSig2Store } from '~/stores/musig2'
import { usePeopleStore } from '~/stores/people'
import { useActivityStore } from '~/stores/activity'
import { formatXPI, truncateAddress } from '~/utils/formatting'

definePageMeta({
  title: 'Shared Wallet',
})

const route = useRoute()
const musig2Store = useMuSig2Store()
const activityStore = useActivityStore()
const peopleStore = usePeopleStore()

// Load shared wallets on mount (from peopleStore - single source of truth)
onMounted(async () => {
  await peopleStore.initialize()
  await activityStore.initialize()
})

const walletId = computed(() => route.params.id as string)
const wallet = computed(() =>
  musig2Store.sharedWallets?.find((w) => w.id === walletId.value),
)

const fundOpen = ref(false)

// Overlay management via useOverlays
const { openSpendModal } = useOverlays()

async function handleSpend() {
  if (wallet.value) {
    await openSpendModal({
      wallet: wallet.value,
      participants: participants.value,
    })
  }
}

const participants = computed(() => {
  if (!wallet.value?.participants) return []
  return wallet.value.participants.map(p => {
    // Resolve person name from peopleStore
    const person = p.personId !== 'self' ? peopleStore.getById(p.personId) : null
    return {
      id: p.personId,
      publicKeyHex: p.publicKeyHex,
      name: p.isMe ? 'You' : person?.name || `${p.publicKeyHex.slice(0, 8)}...`,
      isOnline: person?.isOnline || false,
      isMe: p.isMe,
    }
  })
})

const pendingRequests = computed(() =>
  musig2Store.activeSessions?.filter(
    s => (s.metadata as any)?.walletId === walletId.value && !s.isInitiator
  ) || []
)

const recentTransactions = computed(() =>
  activityStore.allItems
    .filter(item => {
      const data = item.data as Record<string, unknown>
      return data.type === 'transaction' ||
        (data.type === 'signing_complete' && data.walletId === walletId.value)
    })
    .slice(0, 5)
)

function copyAddress() {
  if (wallet.value?.address) {
    navigator.clipboard.writeText(wallet.value.address)
  }
}

async function handleApprove(request: any) {
  // TODO: Integrate with musig2Store.approveRequest
  console.log('Approve request:', request)
}

async function handleReject(request: any) {
  // TODO: Integrate with musig2Store.rejectRequest
  console.log('Reject request:', request)
}
</script>

<template>
  <div v-if="wallet" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <UButton variant="ghost" icon="i-lucide-arrow-left" @click="navigateTo('/people/wallets')" />
      <h1 class="text-xl font-bold flex-1 truncate">{{ wallet.name }}</h1>
      <UDropdownMenu :items="[
        [
          { label: 'Copy Address', icon: 'i-lucide-copy', click: copyAddress },
          { label: 'Show QR', icon: 'i-lucide-qr-code' },
        ],
        [
          { label: 'Rename', icon: 'i-lucide-edit' },
          { label: 'Archive', icon: 'i-lucide-archive' },
        ],
      ]">
        <UButton variant="ghost" icon="i-lucide-more-vertical" />
      </UDropdownMenu>
    </div>

    <!-- Balance Card -->
    <div class="p-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
      <p class="text-primary-100 text-sm mb-1">Balance</p>
      <p class="text-3xl font-bold font-mono">
        {{ formatXPI(wallet.balanceSats) }}
        <span class="text-xl text-primary-200">XPI</span>
      </p>

      <div class="flex gap-3 mt-6">
        <UButton color="neutral" variant="solid" class="flex-1" icon="i-lucide-arrow-up-right" @click="handleSpend">
          Spend
        </UButton>
        <UButton color="neutral" variant="outline" class="flex-1" icon="i-lucide-arrow-down-left"
          @click="fundOpen = true">
          Fund
        </UButton>
      </div>
    </div>

    <!-- Wallet Info -->
    <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-3">
      <div class="flex justify-between">
        <span class="text-gray-500">Type</span>
        <span class="font-medium">
          {{ wallet.participants?.length || 0 }}-of-{{ wallet.participants?.length || 0 }} Multi-sig
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Address</span>
        <div class="flex items-center gap-1">
          <code class="text-sm">{{ truncateAddress(wallet.address || '') }}</code>
          <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyAddress" />
        </div>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Created</span>
        <span>{{ new Date(wallet.createdAt).toLocaleDateString() }}</span>
      </div>
    </div>

    <!-- Participants -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Participants</h2>
      <div class="space-y-2">
        <div v-for="participant in participants" :key="participant.id"
          class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {{ participant.name.slice(0, 2).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ participant.name }}
              <span v-if="participant.isMe" class="text-gray-500">(You)</span>
            </p>
          </div>
          <div v-if="participant.isOnline && !participant.isMe" class="w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>
    </div>

    <!-- Pending Requests -->
    <div v-if="pendingRequests.length > 0" class="space-y-3">
      <h2 class="text-lg font-semibold">Pending Requests</h2>
      <WalletsSigningRequestCard v-for="request in pendingRequests" :key="request.id" :request="{
        id: request.id,
        sessionId: request.id,
        walletId: walletId,
        walletName: wallet.name,
        amount: (request.metadata as any)?.amount || '0',
        recipient: (request.metadata as any)?.recipient || '',
        initiator: (request.metadata as any)?.initiator || 'Unknown',
        createdAt: request.createdAt || Date.now(),
        signaturesCollected: request.participants?.filter(p => p.hasPartialSig).length || 0,
        signaturesRequired: request.participants?.length || 2,
      }" @approve="handleApprove" @reject="handleReject" />
    </div>

    <!-- Transaction History -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">History</h2>
        <UButton variant="ghost" size="xs" @click="navigateTo(`/activity?wallet=${wallet.id}`)">
          View All
        </UButton>
      </div>

      <div v-if="recentTransactions.length > 0" class="space-y-2">
        <ActivityItemCompact v-for="tx in recentTransactions" :key="tx.id" :item="tx" />
      </div>

      <p v-else class="text-sm text-gray-500 text-center py-4">
        No transactions yet
      </p>
    </div>

    <!-- All modals are managed by useOverlays composable -->
  </div>

  <!-- Not Found -->
  <div v-else class="text-center py-12">
    <UIcon name="i-lucide-shield-x" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
    <h2 class="text-lg font-medium mb-1">Wallet not found</h2>
    <UButton @click="navigateTo('/people/wallets')">Back to Wallets</UButton>
  </div>
</template>
