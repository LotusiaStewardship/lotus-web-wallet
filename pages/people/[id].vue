<script setup lang="ts">
/**
 * Person Detail Page
 *
 * Shows detailed information about a contact.
 */
import { usePeopleStore } from '~/stores/people'
import { useActivityStore } from '~/stores/activity'
import { truncateAddress, formatXPI, formatRelativeTime } from '~/utils/formatting'

definePageMeta({
  title: 'Contact',
})

const route = useRoute()
const peopleStore = usePeopleStore()
const activityStore = useActivityStore()

// Initialize stores
onMounted(() => {
  peopleStore.initialize()
  activityStore.initialize()
})

const personId = computed(() => route.params.id as string)
const person = computed(() => peopleStore.getById(personId.value))

const notes = ref('')

// Overlay management via useOverlays
const { openSendModal, openShareContactModal } = useOverlays()

// Sync notes when person changes
watch(person, (p) => {
  if (p) notes.value = p.notes || ''
}, { immediate: true })

// Shared wallets this person is part of
const sharedWallets = computed(() => {
  if (!person.value) return []
  return person.value.sharedWalletIds
    .map(id => peopleStore.getWallet(id))
    .filter((w): w is NonNullable<typeof w> => w !== undefined)
})

// Recent activity with this person
const recentActivity = computed(() => {
  if (!person.value) return []
  return activityStore.allItems
    .filter(item => {
      const data = item.data as Record<string, unknown>
      return data.contactId === person.value!.id ||
        data.address === person.value!.address
    })
    .slice(0, 5)
})

const truncatedAddr = computed(() => {
  if (!person.value) return ''
  return truncateAddress(person.value.address)
})

function copyAddress() {
  if (person.value) {
    navigator.clipboard.writeText(person.value.address)
  }
}

async function openSendTo() {
  if (person.value) {
    await openSendModal({ initialRecipient: person.value.address })
  }
}

function openCreateWallet() {
  navigateTo(`/people/wallets?create=true&with=${person.value?.id}`)
}

async function showQR() {
  if (person.value) {
    await openShareContactModal({ person: person.value })
  }
}

function saveNotes() {
  if (person.value && notes.value !== person.value.notes) {
    peopleStore.updatePerson(person.value.id, { notes: notes.value })
  }
}

function removeTag(tag: string) {
  if (person.value) {
    const newTags = person.value.tags.filter(t => t !== tag)
    peopleStore.updatePerson(person.value.id, { tags: newTags })
  }
}

function confirmDelete() {
  // TODO: Show confirmation dialog (Phase 9)
  if (person.value && confirm(`Delete ${person.value.name}?`)) {
    peopleStore.removePerson(person.value.id)
    navigateTo('/people')
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

      <h1 class="text-2xl font-bold mt-4">{{ person.name }}</h1>

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
      <UButton v-if="person.canSign" color="neutral" variant="outline" icon="i-lucide-shield" @click="openCreateWallet">
        Wallet
      </UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-share-2" @click="showQR">
        Share
      </UButton>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
      <div class="text-center">
        <p class="text-2xl font-bold">{{ person.transactionCount }}</p>
        <p class="text-xs text-gray-500">Transactions</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-error">
          {{ formatXPI(person.totalSent, { minDecimals: 2 }) }}
        </p>
        <p class="text-xs text-gray-500">Sent</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-success">
          {{ formatXPI(person.totalReceived, { minDecimals: 2 }) }}
        </p>
        <p class="text-xs text-gray-500">Received</p>
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
      <UTextarea class="w-full" v-model="notes" placeholder="Add notes about this person..." :rows="3"
        @blur="saveNotes" />
    </div>

    <!-- Tags -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Tags</h2>
      <div class="flex flex-wrap gap-2">
        <UBadge v-for="tag in person.tags" :key="tag" variant="subtle" class="cursor-pointer" @click="removeTag(tag)">
          {{ tag }}
          <UIcon name="i-lucide-x" class="w-3 h-3 ml-1" />
        </UBadge>
        <!-- TODO: "Add Tag" button doesn't do anything -->
        <UButton variant="ghost" size="xs" icon="i-lucide-plus">
          Add Tag
        </UButton>
      </div>
    </div>

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
