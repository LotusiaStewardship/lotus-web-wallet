# Phase 3: People System

## Overview

The People system is the **relationship layer** of the wallet. It answers: **"Who am I interacting with?"**

This phase builds the People hub that unifies contacts, P2P presence, and shared wallets into a single, relationship-centric experience.

**Prerequisites**: Phase 1 (Foundation), Phase 2 (Activity System)  
**Estimated Effort**: 4-5 days  
**Priority**: P0

---

## Goals

1. Build the unified People store
2. Create the People hub page
3. Implement contact list with recency sorting
4. Add online presence indicators
5. Integrate shared wallets into People
6. Create contact detail view

---

## Design Principles

### 1. Recency Over Alphabetical

People are sorted by **last interaction**, not alphabetically. This surfaces the people you actually interact with.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SORTING PHILOSOPHY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ ALPHABETICAL (Traditional)                                   │
│     Alice, Bob, Carol, Dave, Eve...                              │
│     Problem: "Zach" is always at the bottom even if              │
│              you talked to him 5 minutes ago                     │
│                                                                  │
│  ✅ RECENCY (Human-Centric)                                      │
│     Zach (5m ago), Carol (2h ago), Alice (yesterday)...          │
│     Benefit: People you interact with are always visible         │
│                                                                  │
│  ✅ FAVORITES + RECENCY (Best of Both)                           │
│     ⭐ Favorites first, then by recency                          │
│     Benefit: Pin important people, rest sorted by activity       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Presence is Prominent

Online status is not hidden—it's a first-class indicator that enables real-time collaboration.

### 3. Relationships Have Depth

Not all contacts are equal. Some are just addresses, others are full collaborators with shared wallets.

---

## People Hub Page

```vue
<!-- pages/people/index.vue -->
<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">People</h1>
      <UButton
        icon="i-lucide-user-plus"
        color="primary"
        @click="openAddContact"
      >
        Add
      </UButton>
    </div>

    <!-- Search -->
    <UInput
      v-model="peopleStore.searchQuery"
      icon="i-lucide-search"
      placeholder="Search people..."
    />

    <!-- View Tabs -->
    <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
      <UButton
        v-for="tab in tabs"
        :key="tab.id"
        :color="activeTab === tab.id ? 'primary' : 'neutral'"
        :variant="activeTab === tab.id ? 'solid' : 'ghost'"
        size="sm"
        :icon="tab.icon"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <UBadge
          v-if="tab.count > 0"
          :color="activeTab === tab.id ? 'white' : 'primary'"
          size="xs"
          class="ml-1"
        >
          {{ tab.count }}
        </UBadge>
      </UButton>
    </div>

    <!-- Online Now Section (if any online) -->
    <div
      v-if="activeTab === 'all' && peopleStore.onlinePeople.length > 0"
      class="space-y-2"
    >
      <h3 class="text-sm font-medium text-muted flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-success animate-pulse" />
        Online Now
      </h3>
      <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <PersonChip
          v-for="person in peopleStore.onlinePeople"
          :key="person.id"
          :person="person"
          @click="navigateTo(`/people/${person.id}`)"
        />
      </div>
    </div>

    <!-- Shared Wallets Section (if viewing wallets tab) -->
    <template v-if="activeTab === 'wallets'">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-muted">Shared Wallets</h3>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-plus"
            @click="navigateTo('/people/wallets?create=true')"
          >
            Create
          </UButton>
        </div>

        <SharedWalletCard
          v-for="wallet in peopleStore.allWallets"
          :key="wallet.id"
          :wallet="wallet"
          @click="navigateTo(`/people/wallets/${wallet.id}`)"
        />

        <div
          v-if="peopleStore.allWallets.length === 0"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-shield"
            class="w-12 h-12 mx-auto text-muted mb-4"
          />
          <h3 class="text-lg font-medium mb-1">No shared wallets</h3>
          <p class="text-muted text-sm mb-4">
            Create a wallet that requires multiple people to approve
            transactions.
          </p>
          <UButton
            color="primary"
            @click="navigateTo('/people/wallets?create=true')"
          >
            Create Shared Wallet
          </UButton>
        </div>
      </div>
    </template>

    <!-- People List -->
    <template v-else>
      <div v-if="displayedPeople.length > 0" class="space-y-2">
        <PersonCard
          v-for="person in displayedPeople"
          :key="person.id"
          :person="person"
          @click="navigateTo(`/people/${person.id}`)"
          @send="openSendTo(person)"
          @favorite="toggleFavorite(person)"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <UIcon
          name="i-lucide-users"
          class="w-12 h-12 mx-auto text-muted mb-4"
        />
        <h3 class="text-lg font-medium mb-1">
          {{ emptyStateTitle }}
        </h3>
        <p class="text-muted text-sm mb-4">
          {{ emptyStateMessage }}
        </p>
        <UButton
          v-if="activeTab === 'all'"
          color="primary"
          @click="openAddContact"
        >
          Add Your First Contact
        </UButton>
      </div>
    </template>

    <!-- Add Contact Modal -->
    <AddContactModal v-model:open="addContactOpen" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'People',
})

const peopleStore = usePeopleStore()

const activeTab = ref<'all' | 'favorites' | 'online' | 'signers' | 'wallets'>(
  'all',
)
const addContactOpen = ref(false)

const tabs = computed(() => [
  {
    id: 'all',
    label: 'All',
    icon: 'i-lucide-users',
    count: peopleStore.allPeople.length,
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: 'i-lucide-star',
    count: peopleStore.favorites.length,
  },
  {
    id: 'online',
    label: 'Online',
    icon: 'i-lucide-wifi',
    count: peopleStore.onlinePeople.length,
  },
  {
    id: 'signers',
    label: 'Signers',
    icon: 'i-lucide-shield',
    count: peopleStore.signers.length,
  },
  {
    id: 'wallets',
    label: 'Wallets',
    icon: 'i-lucide-wallet',
    count: peopleStore.allWallets.length,
  },
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

function openAddContact() {
  addContactOpen.value = true
}

function openSendTo(person: Person) {
  // Open send modal with person pre-selected
}

function toggleFavorite(person: Person) {
  peopleStore.updatePerson(person.id, { isFavorite: !person.isFavorite })
}
</script>
```

---

## Person Card Component

```vue
<!-- components/people/PersonCard.vue -->
<template>
  <div
    class="p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
    @click="emit('click')"
  >
    <div class="flex items-center gap-3">
      <!-- Avatar with presence -->
      <div class="relative">
        <PersonAvatar :person="person" size="md" />
        <span
          v-if="person.isOnline"
          class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-white dark:border-gray-900"
        />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold truncate">{{ person.name }}</h3>
          <UIcon
            v-if="person.isFavorite"
            name="i-lucide-star"
            class="w-4 h-4 text-warning flex-shrink-0"
          />
          <UBadge
            v-if="person.canSign"
            color="primary"
            variant="subtle"
            size="xs"
          >
            Signer
          </UBadge>
        </div>

        <p class="text-sm text-muted truncate">
          {{ truncatedAddress }}
        </p>

        <p v-if="lastActivity" class="text-xs text-muted mt-0.5">
          {{ lastActivity }}
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center gap-1">
        <UButton
          color="primary"
          variant="ghost"
          size="xs"
          icon="i-lucide-send"
          @click.stop="emit('send')"
        />
        <UButton
          :color="person.isFavorite ? 'warning' : 'neutral'"
          variant="ghost"
          size="xs"
          :icon="person.isFavorite ? 'i-lucide-star' : 'i-lucide-star'"
          @click.stop="emit('favorite')"
        />
      </div>
    </div>

    <!-- Relationship indicators -->
    <div
      v-if="relationshipIndicators.length > 0"
      class="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800"
    >
      <div
        v-for="indicator in relationshipIndicators"
        :key="indicator.label"
        class="flex items-center gap-1 text-xs text-muted"
      >
        <UIcon :name="indicator.icon" class="w-3 h-3" />
        <span>{{ indicator.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Person } from '~/types/people'

const props = defineProps<{
  person: Person
}>()

const emit = defineEmits<{
  click: []
  send: []
  favorite: []
}>()

const truncatedAddress = computed(() => {
  const addr = props.person.address
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`
})

const lastActivity = computed(() => {
  if (!props.person.lastActivityAt) return null
  return formatRelativeTime(props.person.lastActivityAt)
})

const relationshipIndicators = computed(() => {
  const indicators = []

  if (props.person.transactionCount > 0) {
    indicators.push({
      icon: 'i-lucide-repeat',
      label: `${props.person.transactionCount} transactions`,
    })
  }

  if (props.person.sharedWalletIds.length > 0) {
    indicators.push({
      icon: 'i-lucide-shield',
      label: `${props.person.sharedWalletIds.length} shared wallet${
        props.person.sharedWalletIds.length > 1 ? 's' : ''
      }`,
    })
  }

  if (props.person.level >= 2) {
    indicators.push({
      icon: 'i-lucide-wifi',
      label: 'P2P enabled',
    })
  }

  return indicators
})

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Active just now'
  if (minutes < 60) return `Active ${minutes}m ago`
  if (hours < 24) return `Active ${hours}h ago`
  if (days < 7) return `Active ${days}d ago`
  if (days < 30) return `Active ${Math.floor(days / 7)}w ago`

  return `Active ${new Date(timestamp).toLocaleDateString()}`
}
</script>
```

---

## Person Chip Component (for Online Now section)

```vue
<!-- components/people/PersonChip.vue -->
<template>
  <button
    class="flex items-center gap-2 px-3 py-2 rounded-full bg-success/10 hover:bg-success/20 transition-colors"
    @click="emit('click')"
  >
    <div class="relative">
      <PersonAvatar :person="person" size="xs" />
      <span
        class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-white dark:border-gray-900"
      />
    </div>
    <span class="text-sm font-medium">{{ person.name }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Person } from '~/types/people'

defineProps<{
  person: Person
}>()

const emit = defineEmits<{
  click: []
}>()
</script>
```

---

## Person Avatar Component

```vue
<!-- components/people/PersonAvatar.vue -->
<template>
  <div
    :class="['rounded-full overflow-hidden flex-shrink-0', sizeClasses[size]]"
  >
    <img
      v-if="person.avatarUrl"
      :src="person.avatarUrl"
      :alt="person.name"
      class="w-full h-full object-cover"
    />
    <div
      v-else
      :class="[
        'w-full h-full flex items-center justify-center',
        'font-semibold',
        bgColorClass,
        textColorClass,
      ]"
    >
      {{ initials }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Person } from '~/types/people'

const props = withDefaults(
  defineProps<{
    person: Person
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    size: 'md',
  },
)

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

const initials = computed(() => {
  const parts = props.person.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return props.person.name.slice(0, 2).toUpperCase()
})

// Generate consistent color from name
const colorIndex = computed(() => {
  let hash = 0
  for (let i = 0; i < props.person.name.length; i++) {
    hash = props.person.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 6
})

const bgColorClass = computed(() => {
  const colors = [
    'bg-primary/20',
    'bg-success/20',
    'bg-warning/20',
    'bg-error/20',
    'bg-info/20',
    'bg-purple-500/20',
  ]
  return colors[colorIndex.value]
})

const textColorClass = computed(() => {
  const colors = [
    'text-primary',
    'text-success',
    'text-warning',
    'text-error',
    'text-info',
    'text-purple-500',
  ]
  return colors[colorIndex.value]
})
</script>
```

---

## Person Detail Page

```vue
<!-- pages/people/[id].vue -->
<template>
  <div v-if="person" class="space-y-6">
    <!-- Back button -->
    <UButton
      variant="ghost"
      icon="i-lucide-arrow-left"
      @click="navigateTo('/people')"
    >
      Back
    </UButton>

    <!-- Profile Header -->
    <div class="text-center">
      <div class="relative inline-block">
        <PersonAvatar :person="person" size="xl" />
        <span
          v-if="person.isOnline"
          class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-white dark:border-gray-900"
        />
      </div>

      <h1 class="text-2xl font-bold mt-4">{{ person.name }}</h1>

      <div class="flex items-center justify-center gap-2 mt-1">
        <code class="text-sm text-muted">{{ truncatedAddress }}</code>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-copy"
          @click="copyAddress"
        />
      </div>

      <p v-if="person.isOnline" class="text-sm text-success mt-1">
        🟢 Online now
      </p>
      <p v-else-if="person.lastSeenAt" class="text-sm text-muted mt-1">
        Last seen {{ formatRelativeTime(person.lastSeenAt) }}
      </p>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-3 gap-3">
      <UButton color="primary" block icon="i-lucide-send" @click="openSend">
        Send
      </UButton>
      <UButton
        v-if="person.canSign"
        color="neutral"
        variant="outline"
        block
        icon="i-lucide-shield"
        @click="openCreateWallet"
      >
        Wallet
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        block
        icon="i-lucide-qr-code"
        @click="showQR"
      >
        QR
      </UButton>
    </div>

    <!-- Stats -->
    <div
      class="grid grid-cols-3 gap-4 p-4 rounded-xl bg-gray-100 dark:bg-gray-800"
    >
      <div class="text-center">
        <p class="text-2xl font-bold">{{ person.transactionCount }}</p>
        <p class="text-xs text-muted">Transactions</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-error">
          {{ formatXPI(person.totalSent) }}
        </p>
        <p class="text-xs text-muted">Sent</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-success">
          {{ formatXPI(person.totalReceived) }}
        </p>
        <p class="text-xs text-muted">Received</p>
      </div>
    </div>

    <!-- Shared Wallets -->
    <div v-if="sharedWallets.length > 0" class="space-y-3">
      <h2 class="text-lg font-semibold">Shared Wallets</h2>
      <SharedWalletCard
        v-for="wallet in sharedWallets"
        :key="wallet.id"
        :wallet="wallet"
        compact
        @click="navigateTo(`/people/wallets/${wallet.id}`)"
      />
    </div>

    <!-- Capabilities -->
    <div v-if="person.canSign" class="space-y-3">
      <h2 class="text-lg font-semibold">Capabilities</h2>
      <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="font-medium">MuSig2 Signer</p>
            <p class="text-sm text-muted">Can participate in shared wallets</p>
          </div>
        </div>

        <div
          v-if="person.signerCapabilities"
          class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-sm space-y-1"
        >
          <p>
            <span class="text-muted">Transaction types:</span>
            {{ person.signerCapabilities.transactionTypes.join(', ') }}
          </p>
          <p>
            <span class="text-muted">Fee:</span>
            {{ person.signerCapabilities.fee }} sats
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Recent Activity</h2>
        <UButton
          variant="ghost"
          size="xs"
          @click="navigateTo(`/activity?contact=${person.id}`)"
        >
          View All
        </UButton>
      </div>

      <ActivityItem
        v-for="item in recentActivity"
        :key="item.id"
        :item="item"
        compact
      />

      <p
        v-if="recentActivity.length === 0"
        class="text-sm text-muted text-center py-4"
      >
        No activity with this person yet.
      </p>
    </div>

    <!-- Notes -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Notes</h2>
      <UTextarea
        v-model="notes"
        placeholder="Add notes about this person..."
        :rows="3"
        @blur="saveNotes"
      />
    </div>

    <!-- Tags -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Tags</h2>
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="tag in person.tags"
          :key="tag"
          variant="subtle"
          class="cursor-pointer"
          @click="removeTag(tag)"
        >
          {{ tag }}
          <UIcon name="i-lucide-x" class="w-3 h-3 ml-1" />
        </UBadge>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-plus"
          @click="addTagOpen = true"
        >
          Add Tag
        </UButton>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="pt-6 border-t border-gray-200 dark:border-gray-800">
      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        @click="confirmDelete"
      >
        Delete Contact
      </UButton>
    </div>
  </div>

  <!-- Not Found -->
  <div v-else class="text-center py-12">
    <UIcon name="i-lucide-user-x" class="w-12 h-12 mx-auto text-muted mb-4" />
    <h2 class="text-lg font-medium mb-1">Person not found</h2>
    <UButton @click="navigateTo('/people')">Back to People</UButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Contact',
})

const route = useRoute()
const peopleStore = usePeopleStore()
const activityStore = useActivityStore()

const personId = computed(() => route.params.id as string)
const person = computed(() => peopleStore.getById(personId.value))

const notes = ref(person.value?.notes || '')
const addTagOpen = ref(false)

// Shared wallets this person is part of
const sharedWallets = computed(() => {
  if (!person.value) return []
  return person.value.sharedWalletIds
    .map(id => peopleStore.getWallet(id))
    .filter(Boolean)
})

// Recent activity with this person
const recentActivity = computed(() => {
  if (!person.value) return []
  return activityStore.allItems
    .filter(item => item.contactId === person.value!.id)
    .slice(0, 5)
})

const truncatedAddress = computed(() => {
  if (!person.value) return ''
  const addr = person.value.address
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`
})

function copyAddress() {
  if (person.value) {
    navigator.clipboard.writeText(person.value.address)
    // Show toast
  }
}

function openSend() {
  // Open send modal with person pre-selected
}

function openCreateWallet() {
  navigateTo(`/people/wallets?create=true&with=${person.value?.id}`)
}

function showQR() {
  // Show QR modal
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
  // Show confirmation dialog
}

function formatXPI(sats: bigint): string {
  const xpi = Number(sats) / 1_000_000
  return xpi.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
</script>
```

---

## Add Contact Modal

```vue
<!-- components/people/AddContactModal.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <template #header>
      <h2 class="text-lg font-semibold">Add Contact</h2>
    </template>

    <form class="space-y-4 p-4" @submit.prevent="handleSubmit">
      <!-- Name -->
      <UFormField label="Name" required>
        <UInput v-model="form.name" placeholder="Enter name" autofocus />
      </UFormField>

      <!-- Address -->
      <UFormField label="Address" required>
        <UInput
          v-model="form.address"
          placeholder="lotus_..."
          :error="addressError"
        />
        <template #hint>
          <span class="text-xs text-muted"
            >Lotus address for sending/receiving</span
          >
        </template>
      </UFormField>

      <!-- Public Key (optional) -->
      <UFormField label="Public Key">
        <UInput
          v-model="form.publicKeyHex"
          placeholder="02... or 03..."
          :error="publicKeyError"
        />
        <template #hint>
          <span class="text-xs text-muted"
            >Optional: Enables shared wallets and signing</span
          >
        </template>
      </UFormField>

      <!-- Notes -->
      <UFormField label="Notes">
        <UTextarea v-model="form.notes" placeholder="Add notes..." :rows="2" />
      </UFormField>

      <!-- Favorite -->
      <UCheckbox v-model="form.isFavorite"> Add to favorites </UCheckbox>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="open = false">Cancel</UButton>
        <UButton
          color="primary"
          :loading="saving"
          :disabled="!isValid"
          @click="handleSubmit"
        >
          Add Contact
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')

const peopleStore = usePeopleStore()

const form = reactive({
  name: '',
  address: '',
  publicKeyHex: '',
  notes: '',
  isFavorite: false,
})

const saving = ref(false)

const addressError = computed(() => {
  if (!form.address) return null
  if (!form.address.startsWith('lotus_')) return 'Must start with lotus_'
  return null
})

const publicKeyError = computed(() => {
  if (!form.publicKeyHex) return null
  if (!/^0[23][a-fA-F0-9]{64}$/.test(form.publicKeyHex)) {
    return 'Invalid public key format'
  }
  return null
})

const isValid = computed(() => {
  return (
    form.name.trim() &&
    form.address.trim() &&
    !addressError.value &&
    !publicKeyError.value
  )
})

async function handleSubmit() {
  if (!isValid.value) return

  saving.value = true

  try {
    peopleStore.addPerson({
      name: form.name.trim(),
      address: form.address.trim(),
      publicKeyHex: form.publicKeyHex.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isFavorite: form.isFavorite,
      isOnline: false,
      canSign: !!form.publicKeyHex,
      level: form.publicKeyHex ? 1 : 0,
      tags: [],
      transactionCount: 0,
      totalSent: 0n,
      totalReceived: 0n,
      sharedWalletIds: [],
    })

    // Reset form
    form.name = ''
    form.address = ''
    form.publicKeyHex = ''
    form.notes = ''
    form.isFavorite = false

    open.value = false
  } finally {
    saving.value = false
  }
}
</script>
```

---

## Shared Wallet Card Component

```vue
<!-- components/people/SharedWalletCard.vue -->
<template>
  <div
    :class="[
      'p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
      'hover:shadow-md hover:border-primary/30 transition-all cursor-pointer',
    ]"
    @click="emit('click')"
  >
    <div class="flex items-center gap-3">
      <!-- Icon -->
      <div
        class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold truncate">{{ wallet.name }}</h3>
        <p class="text-sm text-muted">
          {{ wallet.participantIds.length }} participants •
          {{ wallet.threshold }}-of-{{ wallet.participantIds.length }}
        </p>
      </div>

      <!-- Balance -->
      <div class="text-right">
        <p class="font-mono font-medium">{{ formatXPI(wallet.balanceSats) }}</p>
        <p class="text-xs text-muted">XPI</p>
      </div>
    </div>

    <!-- Participants preview (if not compact) -->
    <div v-if="!compact" class="flex -space-x-2 mt-3">
      <PersonAvatar
        v-for="participant in participantPeople.slice(0, 4)"
        :key="participant.id"
        :person="participant"
        size="sm"
        class="ring-2 ring-white dark:ring-gray-900"
      />
      <div
        v-if="wallet.participantIds.length > 4"
        class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-900"
      >
        +{{ wallet.participantIds.length - 4 }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SharedWallet } from '~/types/people'

const props = withDefaults(
  defineProps<{
    wallet: SharedWallet
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const peopleStore = usePeopleStore()

const participantPeople = computed(() =>
  props.wallet.participantIds
    .map(id => peopleStore.getById(id))
    .filter(Boolean),
)

function formatXPI(sats: bigint): string {
  const xpi = Number(sats) / 1_000_000
  return xpi.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>
```

---

## Tasks Checklist

### Store Implementation

- [ ] Create `stores/people.ts` with full implementation
- [ ] Add persistence layer
- [ ] Implement presence tracking
- [ ] Add shared wallet management

### Components

- [ ] Create `components/people/PersonCard.vue`
- [ ] Create `components/people/PersonChip.vue`
- [ ] Create `components/people/PersonAvatar.vue`
- [ ] Create `components/people/AddContactModal.vue`
- [ ] Create `components/people/SharedWalletCard.vue`

### Pages

- [ ] Create `pages/people/index.vue` (People hub)
- [ ] Create `pages/people/[id].vue` (Person detail)
- [ ] Implement search and filtering
- [ ] Implement tab navigation

### Integration

- [ ] Wire P2P presence updates to People store
- [ ] Wire transaction events to update activity stats
- [ ] Connect shared wallets to People

---

## Verification

- [ ] People sorted by recency by default
- [ ] Online indicators show correctly
- [ ] Favorites can be toggled
- [ ] Search filters people correctly
- [ ] Tab filters work
- [ ] Person detail shows all information
- [ ] Add contact creates new person
- [ ] Shared wallets display correctly
- [ ] Activity stats update on transactions

---

_Next: [04_HOME_PAGE.md](./04_HOME_PAGE.md)_
