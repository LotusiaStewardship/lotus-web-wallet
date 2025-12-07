<script setup lang="ts">
import type { AddressTx } from '~/composables/useExplorerApi'
import { useContactsStore } from '~/stores/contacts'

definePageMeta({
  title: 'Address Details',
})

const route = useRoute()
const { fetchAddressHistory, fetchAddressBalance } = useExplorerApi()
const { formatTimestamp, truncateTxid } = useExplorerFormat()
const { formatXPI } = useLotusUnits()
const { formatFingerprint, parseAddress, getAddressTypeLabel } = useAddressFormat()
const { copy } = useClipboard()
const walletStore = useWalletStore()
const contactsStore = useContactsStore()

// State
const txs = ref<AddressTx[]>([])
const balance = ref<string | null>(null)
const lastSeen = ref<string | null>(null)
const numPages = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(25)

// Get address from route
const address = computed(() => route.params.address as string)
const addressTypeInfo = computed(() => getAddressTypeLabel(address.value))

// Check if this is the user's address
const isOwnAddress = computed(() => {
  return walletStore.address === address.value
})

// Find contact by address
const contact = computed(() => {
  return contactsStore.getContactByAddress(address.value)
})

// Parse address info
const addressInfo = computed(() => parseAddress(address.value))

// Fingerprint display
const fingerprint = computed(() => formatFingerprint(address.value))

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [historyData, balanceData] = await Promise.all([
      fetchAddressHistory(address.value, page.value, pageSize.value),
      fetchAddressBalance(address.value),
    ])
    if (historyData) {
      txs.value = historyData.history.txs
      lastSeen.value = historyData.lastSeen
      numPages.value = historyData.history.numPages
    }
    if (balanceData) {
      balance.value = balanceData
    }
  } catch (e) {
    error.value = 'Failed to fetch address data'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Watch for page changes
watch([page, pageSize], () => {
  fetchData()
})

onMounted(() => {
  contactsStore.initialize()
  fetchData()
})

// Watch for route changes
watch(address, () => {
  page.value = 1
  fetchData()
})

// Page size options
const pageSizeOptions = [10, 25, 50, 100]

// Address type display
const addressTypeDisplay = computed(() => {
  if (!addressInfo.value) return 'Unknown'
  switch (addressInfo.value.type) {
    case 'pubkeyhash':
      return 'P2PKH'
    case 'scripthash':
      return 'P2SH'
    case 'taproot':
      return 'P2TR'
    default:
      return addressInfo.value.type
  }
})

// Network display
const networkDisplay = computed(() => {
  if (!addressInfo.value) return 'Unknown'
  switch (addressInfo.value.networkName) {
    case 'livenet':
      return 'Mainnet'
    case 'testnet':
      return 'Testnet'
    case 'regtest':
      return 'Regtest'
    default:
      return addressInfo.value.networkName
  }
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back link -->
    <NuxtLink to="/explorer" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Explorer
    </NuxtLink>

    <!-- Error State -->
    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error">
      <template #actions>
        <UButton color="error" variant="soft" size="xs" @click="fetchData">Retry</UButton>
      </template>
    </UAlert>

    <!-- Loading State -->
    <div v-if="loading && txs.length === 0" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else>
      <!-- Address Header (like Balance Display) -->
      <UCard>
        <div class="text-center py-6">
          <!-- Avatar/Icon -->
          <template v-if="contact">
            <ContactAvatar :name="contact.name" :avatar="contact.avatar" size="xl" class="mx-auto mb-4" />
          </template>
          <template v-else-if="isOwnAddress">
            <div
              class="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-lucide-wallet" class="w-8 h-8 text-success-500" />
            </div>
          </template>
          <template v-else>
            <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-lucide-user" class="w-8 h-8 text-primary" />
            </div>
          </template>

          <!-- Name or Fingerprint -->
          <h1 v-if="contact" class="text-2xl font-bold mb-1">{{ contact.name }}</h1>
          <h1 v-else-if="isOwnAddress" class="text-2xl font-bold mb-1">Your Wallet</h1>
          <h1 v-else class="text-2xl font-bold font-mono mb-1">{{ fingerprint }}</h1>

          <!-- Balance -->
          <div class="text-4xl font-bold font-mono mb-2">
            <ExplorerAmountXPI v-if="balance" :sats="balance" :show-unit="false" />
            <span v-else>0</span>
            <span class="text-xl text-muted">&nbsp;XPI</span>
          </div>

          <!-- Badges -->
          <div class="flex items-center justify-center gap-2 mb-4">
            <UBadge v-if="isOwnAddress" color="success" variant="subtle" size="md">
              <UIcon name="i-lucide-check" class="w-3 h-3 mr-1" />
              Your Wallet
            </UBadge>
            <UBadge variant="soft" :color="addressTypeInfo.color" :icon="addressTypeInfo.icon"
              :label="addressTypeInfo.short" />
            <UBadge v-if="contact" color="primary" variant="subtle" size="md">
              <UIcon name="i-lucide-user" class="w-3 h-3 mr-1" />
              Contact
            </UBadge>
          </div>

          <!-- Address (copyable) -->
          <button class="font-mono text-sm text-muted hover:text-primary break-all max-w-full px-4"
            @click="copy(address, 'Address copied')">
            {{ address }}
          </button>

          <!-- Add to Contacts button -->
          <div v-if="!isOwnAddress && !contact" class="mt-4">
            <AddToContactButton :address="address" variant="button" size="md" />
          </div>
        </div>
      </UCard>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-3">
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ addressTypeDisplay }}</div>
          <div class="text-xs text-muted">Type</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ networkDisplay }}</div>
          <div class="text-xs text-muted">Network</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ txs.length }}</div>
          <div class="text-xs text-muted">Txs (page)</div>
        </UCard>
      </div>

      <!-- Last Activity -->
      <UCard v-if="lastSeen">
        <div class="flex items-center justify-between">
          <span class="text-muted text-sm">Last Activity</span>
          <span class="text-sm">{{ formatTimestamp(lastSeen) }}</span>
        </div>
      </UCard>

      <!-- Transaction History -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-history" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Transactions</span>
            </div>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="loading"
              @click="fetchData" />
          </div>
        </template>

        <div v-if="txs.length === 0" class="text-center py-8 text-muted">
          No transactions found
        </div>

        <div v-else class="divide-y divide-default">
          <NuxtLink v-for="tx in txs" :key="tx.txid" :to="`/explorer/tx/${tx.txid}`"
            class="flex items-center gap-3 py-3 -mx-4 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              :class="tx.isCoinbase ? 'bg-success-100 dark:bg-success-900/20' : 'bg-primary/10'">
              <UIcon :name="tx.isCoinbase ? 'i-lucide-pickaxe' : 'i-lucide-file-text'"
                :class="tx.isCoinbase ? 'text-success-500' : 'text-primary'" class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm truncate">{{ truncateTxid(tx.txid) }}</div>
              <div class="text-xs text-muted">{{ formatTimestamp(tx.block?.timestamp || tx.timeFirstSeen) }}</div>
            </div>
            <div class="text-right shrink-0">
              <UBadge :color="tx.block ? 'success' : 'warning'" variant="subtle" size="xs">
                {{ tx.block ? 'Confirmed' : 'Pending' }}
              </UBadge>
              <div v-if="Number(tx.sumBurnedSats) > 0" class="font-mono text-warning-500 text-xs mt-1">
                {{ formatXPI(tx.sumBurnedSats) }} burned
              </div>
            </div>
          </NuxtLink>
        </div>

        <template v-if="numPages > 1" #footer>
          <div class="flex items-center justify-center gap-2">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" :disabled="page <= 1"
              @click="page--" />
            <span class="text-sm text-muted">{{ page }} / {{ numPages }}</span>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right"
              :disabled="page >= numPages" @click="page++" />
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
