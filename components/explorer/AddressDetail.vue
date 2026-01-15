<script setup lang="ts">
/**
 * Address Detail Component
 *
 * Displays detailed address information including balance, transaction history,
 * and contact integration.
 */
import type { Tx } from 'chronik-client'

const props = defineProps<{
  address: string
}>()

const { fetchAddressBalance, fetchAddressHistory } = useExplorerApi()
const peopleStore = usePeopleStore()
const toast = useToast()
const { openSendModal, openAddContactModal } = useOverlays()

const loading = ref(true)
const balance = ref<string | null>(null)
const transactions = ref<Tx[]>([])
const numPages = ref(0)
const currentPage = ref(1)

const contact = computed(() => peopleStore.getByAddress(props.address))

onMounted(async () => {
  await fetchAddressData()
})

watch(() => props.address, fetchAddressData)

async function fetchAddressData() {
  loading.value = true

  try {
    // Fetch balance
    const balanceResult = await fetchAddressBalance(props.address)
    if (balanceResult !== null) {
      balance.value = balanceResult
    }

    // Fetch transaction history
    const historyResult = await fetchAddressHistory(props.address, 1, 20)
    if (historyResult) {
      transactions.value = historyResult.txs
      numPages.value = historyResult.numPages
    }
  } catch (error) {
    console.error('Failed to fetch address data:', error)
  } finally {
    loading.value = false
  }
}

function copyAddress() {
  navigator.clipboard.writeText(props.address)
  toast.add({ title: 'Copied!', color: 'success' })
}

async function sendTo() {
  await openSendModal({ initialRecipient: props.address })
}

async function addToContacts() {
  await openAddContactModal({ initialAddress: props.address })
}

function viewContact() {
  if (contact.value) {
    navigateTo(`/people/${contact.value.id}`)
  }
}

function formatXPI(sats: string | number): string {
  const val = typeof sats === 'string' ? parseInt(sats) : sats
  return (val / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

function formatTime(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  const diff = Date.now() / 1000 - ts
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts * 1000).toLocaleDateString()
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header with Contact Info -->
      <div class="flex items-center gap-3">
        <template v-if="contact">
          <PeoplePersonAvatar :person="contact" size="lg" />
          <div>
            <h2 class="text-xl font-bold">{{ contact.name }}</h2>
            <p class="text-sm text-gray-500">Contact</p>
          </div>
        </template>
        <template v-else>
          <div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <UIcon name="i-lucide-wallet" class="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <h2 class="font-semibold">Address</h2>
            <p class="text-sm text-gray-500">Unknown</p>
          </div>
        </template>
      </div>

      <!-- Address -->
      <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <div class="flex items-center gap-2">
          <code class="text-sm font-mono break-all flex-1">{{ address }}</code>
          <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyAddress" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <UButton color="primary" class="flex-1" icon="i-lucide-send" @click="sendTo">
          Send
        </UButton>
        <UButton v-if="!contact" variant="outline" class="flex-1" icon="i-lucide-user-plus" @click="addToContacts">
          Add Contact
        </UButton>
        <UButton v-else variant="outline" class="flex-1" icon="i-lucide-user" @click="viewContact">
          View Contact
        </UButton>
      </div>

      <!-- Balance -->
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p class="text-sm text-gray-500 mb-1">Balance</p>
        <p class="text-2xl font-bold font-mono">
          {{ balance !== null ? formatXPI(balance) : '—' }} XPI
        </p>
      </div>

      <!-- Transaction History -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Transactions</h3>
          <UBadge v-if="numPages > 1" variant="subtle">
            Page {{ currentPage }} of {{ numPages }}
          </UBadge>
        </div>

        <div v-if="transactions.length > 0" class="space-y-2">
          <NuxtLink v-for="tx in transactions" :key="tx.txid" :to="`/explore/tx/${tx.txid}`"
            class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary/30 transition-colors">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-arrow-right-left" class="w-4 h-4 text-gray-500" />
              <code class="text-sm font-mono">{{ truncate(tx.txid, 16) }}</code>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-500">
                {{ tx.block ? formatTime(tx.block.timestamp) : 'Pending' }}
              </p>
            </div>
          </NuxtLink>
        </div>

        <p v-else class="text-sm text-gray-500 text-center py-4">
          No transactions found
        </p>
      </div>
    </template>
  </div>
</template>
