<script setup lang="ts">
/**
 * People Hub Page
 *
 * Central hub for contacts, shared wallets, and P2P presence.
 */
import { usePeopleStore } from '~/stores/people'

definePageMeta({
  title: 'People',
})

const peopleStore = usePeopleStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<'all' | 'favorites' | 'online' | 'signers' | 'wallets'>('all')

// Overlay management via useOverlays
const { openSendModal, openAddContactModal, openShareMyContactModal } = useOverlays()

// Watch for query params to open add contact modal
watch(() => route.query, async (query) => {
  if (query.add === 'true') {
    // Clean query params immediately
    await router.replace({ query: { ...route.query, add: undefined, address: undefined, name: undefined, pubkey: undefined } })

    await openAddContactModal({
      initialAddress: (query.address as string) || undefined,
      initialName: (query.name as string) || undefined,
      initialPublicKey: (query.pubkey as string) || undefined,
    })
  }
}, { immediate: true })

const tabs = computed(() => [
  { id: 'all' as const, label: 'All', icon: 'i-lucide-users', count: peopleStore.allPeople.length },
  { id: 'favorites' as const, label: 'Favorites', icon: 'i-lucide-star', count: peopleStore.favorites.length },
  { id: 'online' as const, label: 'Online', icon: 'i-lucide-wifi', count: peopleStore.onlinePeople.length },
  { id: 'signers' as const, label: 'Signers', icon: 'i-lucide-shield', count: peopleStore.signers.length },
  { id: 'wallets' as const, label: 'Wallets', icon: 'i-lucide-wallet', count: peopleStore.allWallets.length },
])

const displayedPeople = computed(() => {
  switch (activeTab.value) {
    case 'favorites':
      return peopleStore.favorites
    case 'online':
      return peopleStore.onlinePeople
    case 'signers':
      return peopleStore.signers
    default:
      return peopleStore.filteredPeople
  }
})

const emptyStateTitle = computed(() => {
  switch (activeTab.value) {
    case 'favorites':
      return 'No favorites yet'
    case 'online':
      return 'No one online'
    case 'signers':
      return 'No signers found'
    default:
      return 'No contacts yet'
  }
})

const emptyStateMessage = computed(() => {
  switch (activeTab.value) {
    case 'favorites':
      return 'Star contacts to add them to your favorites.'
    case 'online':
      return 'Contacts with P2P enabled will appear here when online.'
    case 'signers':
      return 'Contacts with public keys can participate in shared wallets.'
    default:
      return 'Add people you transact with to keep track of your relationships.'
  }
})

async function openAddContact() {
  await openAddContactModal()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">People</h1>
      <div class="flex gap-2">
        <UButton variant="outline" icon="i-lucide-share-2" @click="openShareMyContactModal()">
          Share Me
        </UButton>
        <UButton icon="i-lucide-user-plus" color="primary" @click="openAddContact">
          Add
        </UButton>
      </div>
    </div>

    <!-- Search -->
    <UInput v-model="peopleStore.searchQuery" icon="i-lucide-search" placeholder="Search people..." />

    <!-- Tabs -->
    <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
      <UButton v-for="tab in tabs" :key="tab.id" :color="activeTab === tab.id ? 'primary' : 'neutral'"
        :variant="activeTab === tab.id ? 'solid' : 'ghost'" size="sm" :icon="tab.icon" @click="activeTab = tab.id">
        {{ tab.label }}
        <UBadge v-if="tab.count > 0" :color="activeTab === tab.id ? 'neutral' : 'primary'" size="xs" class="ml-1">
          {{ tab.count }}
        </UBadge>
      </UButton>
    </div>

    <!-- Online Now Section -->
    <div v-if="activeTab === 'all' && peopleStore.onlinePeople.length > 0" class="space-y-2">
      <h3 class="text-sm font-medium text-gray-500 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-success animate-pulse" />
        Online Now
      </h3>
      <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <PeoplePersonChip v-for="person in peopleStore.onlinePeople" :key="person.id" :person="person"
          @click="navigateTo(`/people/${person.id}`)" />
      </div>
    </div>

    <!-- Shared Wallets Tab -->
    <template v-if="activeTab === 'wallets'">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-500">Shared Wallets</h3>
          <UButton variant="ghost" size="xs" icon="i-lucide-plus" @click="navigateTo('/people/wallets?create=true')">
            Create
          </UButton>
        </div>

        <PeopleSharedWalletCard v-for="wallet in peopleStore.allWallets" :key="wallet.id" :wallet="wallet"
          @click="navigateTo(`/people/wallets/${wallet.id}`)" />

        <div v-if="peopleStore.allWallets.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-shield" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 class="text-lg font-medium mb-1">No shared wallets</h3>
          <p class="text-gray-500 text-sm mb-4">
            Create a wallet that requires multiple people to approve transactions.
          </p>
          <UButton color="primary" @click="navigateTo('/people/wallets?create=true')">
            Create Shared Wallet
          </UButton>
        </div>
      </div>
    </template>

    <!-- People List -->
    <template v-else>
      <div v-if="displayedPeople.length > 0" class="space-y-2">
        <PeoplePersonCard v-for="person in displayedPeople" :key="person.id" :person="person"
          @click="navigateTo(`/people/${person.id}`)" />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <UIcon name="i-lucide-users" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-medium mb-1">{{ emptyStateTitle }}</h3>
        <p class="text-gray-500 text-sm mb-4">{{ emptyStateMessage }}</p>
        <UButton v-if="activeTab === 'all'" color="primary" @click="openAddContact">
          Add Your First Contact
        </UButton>
      </div>
    </template>

    <!-- All modals are managed by useOverlays composable -->
  </div>
</template>
