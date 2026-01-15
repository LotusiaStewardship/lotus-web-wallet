<script setup lang="ts">
/**
 * Person Detail Page
 *
 * Shows detailed information about a contact.
 */
import { usePersonContext } from '~/composables/usePersonContext'
import { useActivityStore } from '~/stores/activity'
import { truncateAddress, formatXPI, formatRelativeTime } from '~/utils/formatting'

definePageMeta({
  title: 'Contact',
})

const route = useRoute()
const activityStore = useActivityStore()


// Person context
const personId = computed(() => route.params.id as string)
const {
  person,
  displayName,
  address,
  isOnline,
  isFavorite,
  canSign,
  sharedWallets,
  transactionCount,
  notes,
  tags,
  send,
  remove,
  createSharedWallet,
  copyAddress,
  update,
} = usePersonContext(personId)

// Overlay management
const { openShareContactModal, openAddContactModal } = useOverlays()

// Local notes ref for editing
const editableNotes = ref('')

// Sync notes when person changes
watch(notes, (newNotes) => {
  editableNotes.value = newNotes || ''
}, { immediate: true })

// Recent activity with this person
const recentActivity = computed(() => {
  if (!person.value) return []
  return activityStore.allItems
    .filter(item => {
      const data = item.data as unknown
      if (typeof data === 'object' && data !== null) {
        const record = data as Record<string, unknown>
        return record.contactId === person.value!.id ||
          record.address === address.value
      }
      return false
    })
    .slice(0, 5)
})

const truncatedAddr = computed(() => {
  const addr = address.value
  return addr ? truncateAddress(addr) : ''
})

// Net balance calculations
const netBalance = computed(() => {
  if (!person.value) return 0n
  return person.value.totalReceived - person.value.totalSent
})

const netBalanceClass = computed(() => {
  const balance = netBalance.value
  if (balance > 0n) return 'text-success'
  if (balance < 0n) return 'text-error'
  return 'text-gray-500'
})

const netBalanceColor = computed(() => {
  const balance = netBalance.value
  if (balance > 0n) return 'success'
  if (balance < 0n) return 'error'
  return 'neutral'
})

const netBalanceLabel = computed(() => {
  const balance = netBalance.value
  if (balance > 0n) return 'Net Received'
  if (balance < 0n) return 'Net Sent'
  return 'Balanced'
})

const netBalanceBorderClass = computed(() => {
  const balance = netBalance.value
  if (balance > 0n) return 'border-success/20 bg-success/5 dark:border-success/30 dark:bg-success/10'
  if (balance < 0n) return 'border-error/20 bg-error/5 dark:border-error/30 dark:bg-error/10'
  return 'border-gray-200 dark:border-gray-800'
})

const netBalanceIcon = computed(() => {
  const balance = netBalance.value
  if (balance > 0n) return 'i-lucide-arrow-down-left'
  if (balance < 0n) return 'i-lucide-arrow-up-right'
  return 'i-lucide-minus'
})

// Smart formatting for large XPI amounts
const formatLargeXPI = (amount: bigint, decimals: number = 2) => {
  const absAmount = amount < 0n ? -amount : amount

  // Define thresholds in satoshis (1 XPI = 100,000,000 satoshis)
  const thresholds = [
    { value: 1000000000n, label: 'B', divisor: 1000000000n }, // Billion XPI
    { value: 100000000n, label: 'M', divisor: 100000000n },   // Million XPI  
    { value: 10000000n, label: '100s', divisor: 10000000n },   // Hundreds of XPI
    { value: 1000000n, label: '10s', divisor: 1000000n },     // Tens of XPI
  ]

  for (const threshold of thresholds) {
    if (absAmount >= threshold.value) {
      const formatted = Number(amount / threshold.divisor).toFixed(decimals)
      return `${formatted}${threshold.label}`
    }
  }

  // For smaller amounts, use regular formatting
  return formatXPI(amount, { minDecimals: decimals, maxDecimals: decimals })
}

// Formatted computed properties
const formattedSent = computed(() => formatLargeXPI(person.value?.totalSent || 0n))
const formattedReceived = computed(() => formatLargeXPI(person.value?.totalReceived || 0n))
const formattedNetBalance = computed(() => formatLargeXPI(netBalance.value))

async function openSendTo() {
  await send()
}

async function openCreateWallet() {
  await createSharedWallet()
}

async function handleEdit() {
  if (person.value) {
    await openAddContactModal({
      editPerson: person.value
    })
  }
}

async function showQR() {
  if (person.value) {
    await openShareContactModal({ person: person.value })
  }
}

async function saveNotes() {
  if (person.value && editableNotes.value !== notes.value) {
    await update({ notes: editableNotes.value })
  }
}

function removeTag(tag: string) {
  if (person.value) {
    const newTags = tags.value.filter(t => t !== tag)
    update({ tags: newTags })
  }
}

async function confirmDelete() {
  // TODO: Show confirmation dialog (Phase 9)
  if (person.value && confirm(`Delete ${displayName.value}?`)) {
    const deleted = await remove()
    if (deleted) {
      navigateTo('/people')
    }
  }
}
</script>

<template>
  <div v-if="person" class="space-y-6">
    <!-- Back button -->
    <UButton variant="ghost" icon="i-lucide-arrow-left" @click="navigateTo('/people')">
      Back
    </UButton>

    <!-- Profile Header -->
    <div class="text-center">
      <div class="relative inline-block">
        <PeoplePersonAvatar :person="person" size="xl" />
        <span v-if="person.isOnline"
          class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-white dark:border-gray-900" />
      </div>

      <div class="flex items-center justify-center gap-2 mt-4">
        <h1 class="text-2xl font-bold">{{ displayName }}</h1>
        <UButton variant="ghost" size="sm" icon="i-lucide-edit" @click="handleEdit" />
      </div>

      <div class="flex items-center justify-center gap-2 mt-1">
        <code class="text-sm text-gray-500">{{ truncatedAddr }}</code>
        <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyAddress" />
      </div>

      <p v-if="person.isOnline" class="text-sm text-success mt-1">
        🟢 Online now
      </p>
      <p v-else-if="person.lastSeenAt" class="text-sm text-gray-500 mt-1">
        Last seen {{ formatRelativeTime(person.lastSeenAt) }}
      </p>
    </div>

    <!-- Quick Actions -->
    <div class="flex justify-center gap-2">
      <UButton color="primary" icon="i-lucide-send" @click="openSendTo">
        Send
      </UButton>
      <UButton v-if="canSign" color="neutral" variant="outline" icon="i-lucide-shield" @click="openCreateWallet">
        Wallet
      </UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-share-2" @click="showQR">
        Share
      </UButton>
    </div>

    <!-- Transaction Stats -->
    <div class="space-y-3">
      <!-- Compact Stats Bar -->
      <div
        class="grid grid-cols-3 gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <!-- Transaction Count -->
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 mb-1">
            <UIcon name="i-lucide-repeat" class="w-4 h-4 text-primary" />
            <span class="text-xs font-medium text-gray-500">Transactions</span>
          </div>
          <p class="text-xl font-bold text-primary">{{ transactionCount }}</p>
        </div>

        <!-- Total Sent -->
        <div class="text-center border-x border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-center gap-1 mb-1">
            <UIcon name="i-lucide-arrow-up-right" class="w-4 h-4 text-error" />
            <span class="text-xs font-medium text-gray-500">Sent</span>
          </div>
          <p class="text-xl font-bold text-error truncate"
            :title="formatXPI(person.totalSent, { minDecimals: 2, maxDecimals: 2 })">
            {{ formattedSent }}
          </p>
        </div>

        <!-- Total Received -->
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 mb-1">
            <UIcon name="i-lucide-arrow-down-left" class="w-4 h-4 text-success" />
            <span class="text-xs font-medium text-gray-500">Received</span>
          </div>
          <p class="text-xl font-bold text-success truncate"
            :title="formatXPI(person.totalReceived, { minDecimals: 2, maxDecimals: 2 })">
            {{ formattedReceived }}
          </p>
        </div>
      </div>

      <!-- Net Balance Indicator (only if there's activity) -->
      <div v-if="person.totalSent > 0 || person.totalReceived > 0"
        class="flex items-center justify-between p-3 rounded-lg border" :class="netBalanceBorderClass">
        <div class="flex items-center gap-2">
          <UIcon :name="netBalanceIcon" class="w-4 h-4" :class="netBalanceColor" />
          <span class="text-sm font-medium">Net Position</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold truncate" :class="netBalanceClass"
            :title="formatXPI(netBalance, { minDecimals: 2, maxDecimals: 2 })">
            {{ formattedNetBalance }}
          </span>
          <UBadge :color="netBalanceColor" variant="soft" size="xs">
            {{ netBalanceLabel }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Shared Wallets -->
    <div v-if="sharedWallets.length > 0" class="space-y-3">
      <h2 class="text-lg font-semibold">Shared Wallets</h2>
      <PeopleSharedWalletCard v-for="wallet in sharedWallets" :key="wallet.id" :wallet="wallet" compact
        @click="navigateTo(`/people/wallets/${wallet.id}`)" />
    </div>

    <!-- Capabilities -->
    <div v-if="person.canSign" class="space-y-3">
      <h2 class="text-lg font-semibold">Capabilities</h2>
      <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="font-medium">MuSig2 Signer</p>
            <p class="text-sm text-gray-500">Can participate in shared wallets</p>
          </div>
        </div>

        <div v-if="person.signerCapabilities"
          class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-sm space-y-1">
          <p>
            <span class="text-gray-500">Transaction types:</span>
            {{ person.signerCapabilities.transactionTypes.join(', ') }}
          </p>
          <p>
            <span class="text-gray-500">Fee:</span>
            {{ person.signerCapabilities.fee }} sats
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Recent Activity</h2>
        <UButton variant="ghost" size="xs" @click="navigateTo(`/activity?contact=${person.id}`)">
          View All
        </UButton>
      </div>

      <ActivityItem v-for="item in recentActivity" :key="item.id" :item="item" />

      <p v-if="recentActivity.length === 0" class="text-sm text-gray-500 text-center py-4">
        No activity with this person yet.
      </p>
    </div>

    <!-- Notes -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Notes</h2>
      <UTextarea class="w-full" v-model="editableNotes" placeholder="Add notes about this person..." :rows="3"
        @blur="saveNotes" />
    </div>

    <!-- Tags -->
    <!--
    TODO: "Add Tag" button doesn't do anything

    Need to implement the tag system and management
    -->
    <!-- <div class="space-y-3">
      <h2 class="text-lg font-semibold">Tags</h2>
      <div class="flex flex-wrap gap-2">
        <UBadge v-for="tag in person.tags" :key="tag" variant="subtle" class="cursor-pointer" @click="removeTag(tag)">
          {{ tag }}
          <UIcon name="i-lucide-x" class="w-3 h-3 ml-1" />
        </UBadge>
        <UButton variant="ghost" size="xs" icon="i-lucide-plus">
          Add Tag
        </UButton>
      </div>
    </div> -->

    <!-- Danger Zone -->
    <div class="pt-6 border-t border-gray-200 dark:border-gray-800">
      <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="confirmDelete">
        Delete Contact
      </UButton>
    </div>

    <!-- All modals are managed by useOverlays composable -->
  </div>

  <!-- Not Found -->
  <div v-else class="text-center py-12">
    <UIcon name="i-lucide-user-x" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
    <h2 class="text-lg font-medium mb-1">Person not found</h2>
    <UButton @click="navigateTo('/people')">Back to People</UButton>
  </div>
</template>
