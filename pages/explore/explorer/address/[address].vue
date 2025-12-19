<script setup lang="ts">
/**
 * Address Detail Page
 *
 * Display detailed information about an address.
 */
import type { AddressTx } from '~/composables/useExplorerApi'
import { useWalletStore } from '~/stores/wallet'
import { useContactsStore } from '~/stores/contacts'

definePageMeta({
  title: 'Address',
})

const route = useRoute()
const address = computed(() => route.params.address as string)

const explorerApi = useExplorerApi()
const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const { copy } = useClipboard()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()
const { toFingerprint } = useAddress()
const { share, canShare } = useShare()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const balance = ref<string | null>(null)
const transactions = ref<AddressTx[]>([])
const numPages = ref(0)
const currentPage = ref(1)
const loadingMore = ref(false)
const filter = ref<'all' | 'sent' | 'received'>('all')

// Check if this is the user's own address
const isOwnAddress = computed(() => walletStore.address === address.value)

// Check if address is a contact
const contact = computed(() => contactsStore.contacts.find(c => c.address === address.value))

// Display name
const displayName = computed(() => {
  if (isOwnAddress.value) return 'Your Address'
  if (contact.value) return contact.value.name
  return toFingerprint(address.value)
})

// Fetch address data
async function fetchAddressData() {
  loading.value = true
  error.value = null
  try {
    const [balanceResult, historyResult] = await Promise.all([
      explorerApi.fetchAddressBalance(address.value),
      explorerApi.fetchAddressHistory(address.value, 1, 20),
    ])

    balance.value = balanceResult
    if (historyResult) {
      transactions.value = historyResult.history.txs
      numPages.value = historyResult.history.numPages
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load address'
  } finally {
    loading.value = false
  }
}

// Load more transactions
async function loadMore() {
  if (loadingMore.value || currentPage.value >= numPages.value) return

  loadingMore.value = true
  try {
    const result = await explorerApi.fetchAddressHistory(
      address.value,
      currentPage.value + 1,
      20,
    )
    if (result) {
      transactions.value = [...transactions.value, ...result.history.txs]
      currentPage.value++
    }
  } catch (e) {
    console.error('Failed to load more transactions:', e)
  } finally {
    loadingMore.value = false
  }
}

onMounted(fetchAddressData)

// Watch for route changes
watch(address, () => {
  currentPage.value = 1
  fetchAddressData()
})

// Filtered transactions
const filteredTransactions = computed(() => {
  if (filter.value === 'all') return transactions.value

  return transactions.value.filter(tx => {
    const isInput = tx.inputs.some(i => i.outputScript?.includes(address.value))
    const isOutput = tx.outputs.some(o => o.outputScript?.includes(address.value))

    if (filter.value === 'sent') return isInput
    if (filter.value === 'received') return isOutput && !isInput
    return true
  })
})

// Transaction counts
const sentCount = computed(() =>
  transactions.value.filter(tx =>
    tx.inputs.some(i => i.outputScript?.includes(address.value)),
  ).length,
)

const receivedCount = computed(() =>
  transactions.value.filter(tx => {
    const isInput = tx.inputs.some(i => i.outputScript?.includes(address.value))
    const isOutput = tx.outputs.some(o => o.outputScript?.includes(address.value))
    return isOutput && !isInput
  }).length,
)

// Copy and share functions
function copyAddr() {
  copy(address.value, 'Address')
}

function shareAddr() {
  share({
    title: `Lotus Address`,
    text: `View address on Lotus Explorer`,
    url: window.location.href,
  })
}

// Retry on error
function retry() {
  fetchAddressData()
}

// Add to contacts modal
const showAddContact = ref(false)
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/explore/explorer">
        Back to Explorer
      </UButton>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <UiAppCard>
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
        </div>
      </UiAppCard>
    </template>

    <!-- Error State -->
    <template v-else-if="error">
      <UAlert color="error" variant="subtle" icon="i-lucide-alert-circle" :title="error">
        <template #actions>
          <UButton color="error" variant="soft" size="sm" @click="retry">
            Retry
          </UButton>
        </template>
      </UAlert>
    </template>

    <!-- Address Content -->
    <template v-else>
      <!-- Summary Card -->
      <UiAppCard>
        <div class="flex items-start gap-4">
          <!-- Avatar/Icon -->
          <div
            class="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <ContactsAvatar v-if="contact" :contact="contact" size="lg" />
            <UIcon v-else-if="isOwnAddress" name="i-lucide-user" class="w-7 h-7 text-primary" />
            <UIcon v-else name="i-lucide-wallet" class="w-7 h-7 text-primary" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-semibold">{{ displayName }}</h2>
              <UBadge v-if="isOwnAddress" color="primary" variant="subtle">
                You
              </UBadge>
              <UBadge v-else-if="contact" color="success" variant="subtle">
                Contact
              </UBadge>
            </div>

            <!-- Balance -->
            <div v-if="balance !== null" class="mt-2">
              <p class="text-2xl font-bold font-mono">{{ formatXPI(balance) }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy" @click="copyAddr" />
            <UButton v-if="canShare" color="neutral" variant="ghost" icon="i-lucide-share-2" @click="shareAddr" />
            <UButton v-if="!isOwnAddress && !contact" color="primary" variant="soft" icon="i-lucide-user-plus"
              @click="showAddContact = true">
              Add Contact
            </UButton>
          </div>
        </div>

        <!-- Address -->
        <div class="mt-4 p-3 bg-muted/30 rounded-lg">
          <p class="text-xs text-muted mb-1">Address</p>
          <code class="text-sm font-mono break-all">{{ address }}</code>
        </div>
      </UiAppCard>

      <!-- QR Code Card -->
      <UiAppCard v-if="!isOwnAddress" title="QR Code" icon="i-lucide-qr-code">
        <div class="flex justify-center py-4">
          <CommonQRCode :value="address" :size="300" />
        </div>
        <div class="text-center">
          <UButton color="primary" variant="soft" icon="i-lucide-send" :to="`/transact/send?to=${address}`">
            Send To
          </UButton>
        </div>
      </UiAppCard>

      <!-- Transaction History -->
      <UiAppCard title="Transaction History" icon="i-lucide-history">
        <!-- Filter Tabs -->
        <div class="flex gap-2 mb-4">
          <UButton :color="filter === 'all' ? 'primary' : 'neutral'" :variant="filter === 'all' ? 'soft' : 'ghost'"
            size="sm" @click="filter = 'all'">
            All ({{ transactions.length }})
          </UButton>
          <UButton :color="filter === 'sent' ? 'primary' : 'neutral'" :variant="filter === 'sent' ? 'soft' : 'ghost'"
            size="sm" @click="filter = 'sent'">
            Sent ({{ sentCount }})
          </UButton>
          <UButton :color="filter === 'received' ? 'primary' : 'neutral'"
            :variant="filter === 'received' ? 'soft' : 'ghost'" size="sm" @click="filter = 'received'">
            Received ({{ receivedCount }})
          </UButton>
        </div>

        <!-- Transaction List -->
        <div v-if="filteredTransactions.length" class="divide-y divide-default -mx-4">
          <NuxtLink v-for="tx in filteredTransactions" :key="tx.txid" :to="`/explore/explorer/tx/${tx.txid}`"
            class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
            <!-- Icon -->
            <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="tx.isCoinbase ? 'bg-warning-100 dark:bg-warning-900/30' : 'bg-muted/50'">
              <UIcon :name="tx.isCoinbase ? 'i-lucide-pickaxe' : 'i-lucide-arrow-right-left'"
                :class="tx.isCoinbase ? 'text-warning' : 'text-muted'" class="w-5 h-5" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="font-mono text-sm truncate">
                {{ tx.txid.slice(0, 8) }}...{{ tx.txid.slice(-8) }}
              </p>
              <p class="text-sm text-muted">
                {{ tx.inputs.length }} in → {{ tx.outputs.length }} out
              </p>
            </div>

            <!-- Amount & Time -->
            <div class="text-right flex-shrink-0">
              <p v-if="BigInt(tx.sumBurnedSats || '0') > 0n" class="text-sm text-warning font-mono">
                -{{ formatXPI(tx.sumBurnedSats) }}
              </p>
              <p class="text-xs text-muted">
                {{ tx.block ? timeAgo(Number(tx.block.timestamp)) : 'Pending' }}
              </p>
            </div>

            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted flex-shrink-0" />
          </NuxtLink>
        </div>

        <!-- Empty State -->
        <UiAppEmptyState v-else icon="i-lucide-inbox" title="No transactions"
          description="This address has no transaction history" />

        <!-- Load More -->
        <div v-if="currentPage < numPages" class="mt-4 text-center">
          <UButton color="neutral" variant="ghost" :loading="loadingMore" @click="loadMore">
            Load More
          </UButton>
        </div>
      </UiAppCard>
    </template>

    <!-- Add Contact Modal -->
    <ContactsFormModal v-if="showAddContact" v-model:open="showAddContact" :initial-address="address" />
  </div>
</template>
