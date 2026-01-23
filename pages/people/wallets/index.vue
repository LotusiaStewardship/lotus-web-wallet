<script setup lang="ts">
/**
 * Shared Wallets List Page
 *
 * Lists all shared wallets the user participates in.
 * Shared wallets are stored in peopleStore (single source of truth).
 */
import { useMuSig2Store } from '~/stores/musig2'
import { usePeopleStore } from '~/stores/people'
import { formatXPI } from '~/utils/formatting'

definePageMeta({
  title: 'Shared Wallets',
})

const route = useRoute()
const router = useRouter()
const musig2Store = useMuSig2Store()
const peopleStore = usePeopleStore()

// Load shared wallets on mount (from peopleStore - single source of truth)
onMounted(async () => {
  await peopleStore.initialize()
})

const requestsSection = ref<HTMLElement>()

// Overlay management via useOverlays
const { openCreateWalletModal } = useOverlays()

// Watch for create query param
watch(() => route.query, async (query) => {
  if (query.create === 'true') {
    // Clean query params immediately
    await router.replace({ query: { ...route.query, create: undefined, with: undefined } })

    await openCreateWalletModal(undefined)
  }
}, { immediate: true })

const wallets = computed(() => musig2Store.sharedWallets || [])

const pendingRequests = computed(() =>
  musig2Store.activeSessions?.filter(s => !s.isInitiator) || []
)

async function openCreateWallet() {
  await openCreateWalletModal()
}

function scrollToRequests() {
  requestsSection.value?.scrollIntoView({ behavior: 'smooth' })
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
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UButton variant="ghost" icon="i-lucide-arrow-left" @click="navigateTo('/people')" />
        <h1 class="text-xl font-bold">Shared Wallets</h1>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreateWallet">
        Create
      </UButton>
    </div>

    <!-- Pending Requests Banner -->
    <div v-if="pendingRequests.length > 0" class="p-4 rounded-xl bg-warning/10 border border-warning/20">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-warning" />
        </div>
        <div class="flex-1">
          <p class="font-medium">
            {{ pendingRequests.length }} pending request{{ pendingRequests.length > 1 ? 's' : '' }}
          </p>
          <p class="text-sm text-gray-500">Signatures needed</p>
        </div>
        <UButton size="sm" @click="scrollToRequests">View</UButton>
      </div>
    </div>

    <!-- Wallet List -->
    <div v-if="wallets.length > 0" class="space-y-3">
      <NuxtLink v-for="wallet in wallets" :key="wallet.id" :to="`/people/wallets/${wallet.id}`"
        class="block p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-primary/30 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold truncate">{{ wallet.name }}</h3>
            <p class="text-sm text-gray-500">
              {{ wallet.participants?.length || 0 }}-of-{{ wallet.participants?.length || 0 }}
              multi-sig
            </p>
          </div>
          <div class="text-right">
            <p class="font-mono font-medium">
              {{ formatXPI(wallet.balanceSats || 0, { showSymbol: true, minDecimals: 2 }) }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-shield" class="w-8 h-8 text-primary" />
      </div>
      <h2 class="text-lg font-semibold mb-2">No shared wallets yet</h2>
      <p class="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
        Create a wallet that requires multiple people to approve transactions.
      </p>
      <UButton color="primary" @click="openCreateWallet">
        Create Your First Shared Wallet
      </UButton>
    </div>

    <!-- Pending Signing Requests Section -->
    <div v-if="pendingRequests.length > 0" ref="requestsSection" class="space-y-3">
      <h2 class="text-lg font-semibold">Pending Requests</h2>
      <WalletsSigningRequestCard v-for="request in pendingRequests" :key="request.id" :request="{
        id: request.id,
        sessionId: request.id,
        walletId: (request.metadata as any)?.walletId || '',
        walletName: (request.metadata as any)?.walletName || 'Shared Wallet',
        amount: (request.metadata as any)?.amount || '0',
        recipient: (request.metadata as any)?.recipient || '',
        initiator: (request.metadata as any)?.initiator || 'Unknown',
        createdAt: request.createdAt || Date.now(),
        signaturesCollected: request.participants?.filter(p => p.hasPartialSig).length || 0,
        signaturesRequired: request.participants?.length || 2,
      }" @approve="handleApprove" @reject="handleReject" />
    </div>

    <!-- All modals are managed by useOverlays composable -->
  </div>
</template>
