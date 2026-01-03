# Phase 6: Shared Wallets

## Overview

Shared Wallets are the **collaborative relationship** feature of the wallet. They represent the deepest level of trust between people—jointly controlled funds requiring multiple approvals.

This phase builds the shared wallet experience integrated into the People system.

**Prerequisites**: Phase 1-5  
**Estimated Effort**: 5-6 days  
**Priority**: P0

---

## Goals

1. Build shared wallet list page
2. Create shared wallet detail page
3. Implement wallet creation wizard
4. Build spending proposal flow
5. Implement signing request handling
6. Integrate with activity system

---

## Shared Wallet List Page

```vue
<!-- pages/people/wallets/index.vue -->
<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          icon="i-lucide-arrow-left"
          @click="navigateTo('/people')"
        />
        <h1 class="text-xl font-bold">Shared Wallets</h1>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreateWallet">
        Create
      </UButton>
    </div>

    <!-- Pending Requests Banner -->
    <div
      v-if="pendingRequests.length > 0"
      class="p-4 rounded-xl bg-warning/10 border border-warning/20"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center"
        >
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-warning" />
        </div>
        <div class="flex-1">
          <p class="font-medium">
            {{ pendingRequests.length }} pending request{{
              pendingRequests.length > 1 ? 's' : ''
            }}
          </p>
          <p class="text-sm text-muted">Signatures needed</p>
        </div>
        <UButton size="sm" @click="scrollToRequests">View</UButton>
      </div>
    </div>

    <!-- Wallet List -->
    <div v-if="wallets.length > 0" class="space-y-3">
      <SharedWalletCard
        v-for="wallet in wallets"
        :key="wallet.id"
        :wallet="wallet"
        @click="navigateTo(`/people/wallets/${wallet.id}`)"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div
        class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-lucide-shield" class="w-8 h-8 text-primary" />
      </div>
      <h2 class="text-lg font-semibold mb-2">No shared wallets yet</h2>
      <p class="text-muted text-sm mb-6 max-w-xs mx-auto">
        Create a wallet that requires multiple people to approve transactions.
        Perfect for family savings, business accounts, or extra security.
      </p>
      <UButton color="primary" @click="openCreateWallet">
        Create Your First Shared Wallet
      </UButton>
    </div>

    <!-- Pending Signing Requests Section -->
    <div
      v-if="pendingRequests.length > 0"
      ref="requestsSection"
      class="space-y-3"
    >
      <h2 class="text-lg font-semibold">Pending Requests</h2>
      <SigningRequestCard
        v-for="request in pendingRequests"
        :key="request.id"
        :request="request"
        @approve="handleApprove"
        @reject="handleReject"
      />
    </div>

    <!-- Create Wallet Modal -->
    <CreateWalletModal v-model:open="createOpen" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Shared Wallets',
})

const route = useRoute()
const peopleStore = usePeopleStore()
const musig2Store = useMuSig2Store()

const createOpen = ref(false)
const requestsSection = ref<HTMLElement>()

// Check for create query param
onMounted(() => {
  if (route.query.create === 'true') {
    createOpen.value = true
  }
})

const wallets = computed(() => peopleStore.allWallets)

const pendingRequests = computed(() =>
  musig2Store.pendingSessions.filter(s => !s.isInitiator),
)

function openCreateWallet() {
  createOpen.value = true
}

function scrollToRequests() {
  requestsSection.value?.scrollIntoView({ behavior: 'smooth' })
}

async function handleApprove(request: SigningRequest) {
  await musig2Store.approveRequest(request.sessionId)
}

async function handleReject(request: SigningRequest) {
  await musig2Store.rejectRequest(request.sessionId)
}
</script>
```

---

## Shared Wallet Detail Page

```vue
<!-- pages/people/wallets/[id].vue -->
<template>
  <div v-if="wallet" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        @click="navigateTo('/people/wallets')"
      />
      <h1 class="text-xl font-bold flex-1 truncate">{{ wallet.name }}</h1>
      <UDropdownMenu :items="menuItems">
        <UButton variant="ghost" icon="i-lucide-more-vertical" />
      </UDropdownMenu>
    </div>

    <!-- Balance Card -->
    <div
      class="p-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white"
    >
      <p class="text-primary-100 text-sm mb-1">Balance</p>
      <p class="text-3xl font-bold font-mono">
        {{ formatXPI(wallet.balanceSats) }}
        <span class="text-xl text-primary-200">XPI</span>
      </p>

      <div class="flex gap-3 mt-6">
        <UButton
          color="white"
          variant="solid"
          class="flex-1"
          icon="i-lucide-arrow-up-right"
          @click="openSpendModal"
        >
          Spend
        </UButton>
        <UButton
          color="white"
          variant="outline"
          class="flex-1"
          icon="i-lucide-arrow-down-left"
          @click="openFundModal"
        >
          Fund
        </UButton>
      </div>
    </div>

    <!-- Wallet Info -->
    <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-3">
      <div class="flex justify-between">
        <span class="text-muted">Type</span>
        <span class="font-medium"
          >{{ wallet.threshold }}-of-{{
            wallet.participantIds.length
          }}
          Multi-sig</span
        >
      </div>
      <div class="flex justify-between">
        <span class="text-muted">Address</span>
        <div class="flex items-center gap-1">
          <code class="text-sm">{{ truncateAddress(wallet.address) }}</code>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            @click="copyAddress"
          />
        </div>
      </div>
      <div class="flex justify-between">
        <span class="text-muted">Created</span>
        <span>{{ formatDate(wallet.createdAt) }}</span>
      </div>
    </div>

    <!-- Participants -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Participants</h2>
      <div class="space-y-2">
        <div
          v-for="participant in participants"
          :key="participant.id"
          class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
        >
          <div class="relative">
            <PersonAvatar :person="participant" size="sm" />
            <span
              v-if="participant.isOnline"
              class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-white dark:border-gray-900"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ participant.name }}
              <span v-if="participant.isMe" class="text-muted">(You)</span>
            </p>
            <p class="text-xs text-muted">
              {{ participant.isOnline ? 'Online' : 'Offline' }}
            </p>
          </div>
          <UButton
            v-if="!participant.isMe"
            variant="ghost"
            size="xs"
            icon="i-lucide-user"
            @click="navigateTo(`/people/${participant.id}`)"
          />
        </div>
      </div>
    </div>

    <!-- Pending Requests -->
    <div v-if="pendingRequests.length > 0" class="space-y-3">
      <h2 class="text-lg font-semibold">Pending Requests</h2>
      <SigningRequestCard
        v-for="request in pendingRequests"
        :key="request.id"
        :request="request"
        @approve="handleApprove"
        @reject="handleReject"
        @view="openRequestDetail(request)"
      />
    </div>

    <!-- Transaction History -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">History</h2>
        <UButton
          variant="ghost"
          size="xs"
          @click="navigateTo(`/activity?wallet=${wallet.id}`)"
        >
          View All
        </UButton>
      </div>

      <div v-if="recentTransactions.length > 0" class="space-y-2">
        <ActivityItemCompact
          v-for="tx in recentTransactions"
          :key="tx.id"
          :item="tx"
        />
      </div>

      <p v-else class="text-sm text-muted text-center py-4">
        No transactions yet
      </p>
    </div>

    <!-- Modals -->
    <SpendModal
      v-model:open="spendOpen"
      :wallet="wallet"
      :participants="participants"
    />
    <FundModal v-model:open="fundOpen" :wallet="wallet" />
    <RequestDetailModal
      v-model:open="requestDetailOpen"
      :request="selectedRequest"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </div>

  <!-- Not Found -->
  <div v-else class="text-center py-12">
    <UIcon name="i-lucide-shield-x" class="w-12 h-12 mx-auto text-muted mb-4" />
    <h2 class="text-lg font-medium mb-1">Wallet not found</h2>
    <UButton @click="navigateTo('/people/wallets')">Back to Wallets</UButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Shared Wallet',
})

const route = useRoute()
const peopleStore = usePeopleStore()
const musig2Store = useMuSig2Store()
const activityStore = useActivityStore()
const toast = useToast()

const walletId = computed(() => route.params.id as string)
const wallet = computed(() => peopleStore.getWallet(walletId.value))

const spendOpen = ref(false)
const fundOpen = ref(false)
const requestDetailOpen = ref(false)
const selectedRequest = ref<SigningRequest | null>(null)

const participants = computed(() => {
  if (!wallet.value) return []
  return wallet.value.participantIds
    .map(id => {
      const person = peopleStore.getById(id)
      return {
        ...person,
        isMe: id === 'self', // TODO: Check against own identity
      }
    })
    .filter(Boolean)
})

const pendingRequests = computed(() =>
  musig2Store.pendingSessions.filter(
    s => s.walletId === walletId.value && !s.isInitiator,
  ),
)

const recentTransactions = computed(() =>
  activityStore.allItems
    .filter(
      item =>
        item.data.type === 'transaction' ||
        (item.data.type === 'signing_complete' &&
          item.data.walletId === walletId.value),
    )
    .slice(0, 5),
)

const menuItems = [
  [
    { label: 'Copy Address', icon: 'i-lucide-copy', click: copyAddress },
    { label: 'Show QR', icon: 'i-lucide-qr-code', click: showQR },
  ],
  [
    { label: 'Rename', icon: 'i-lucide-edit', click: renameWallet },
    { label: 'Archive', icon: 'i-lucide-archive', click: archiveWallet },
  ],
]

function formatXPI(sats: bigint): string {
  const xpi = Number(sats) / 1_000_000
  return xpi.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-6)}`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

function copyAddress() {
  if (wallet.value) {
    navigator.clipboard.writeText(wallet.value.address)
    toast.add({ title: 'Address copied!' })
  }
}

function showQR() {
  // Open QR modal
}

function renameWallet() {
  // Open rename modal
}

function archiveWallet() {
  // Confirm and archive
}

function openSpendModal() {
  spendOpen.value = true
}

function openFundModal() {
  fundOpen.value = true
}

function openRequestDetail(request: SigningRequest) {
  selectedRequest.value = request
  requestDetailOpen.value = true
}

async function handleApprove(request: SigningRequest) {
  await musig2Store.approveRequest(request.sessionId)
  requestDetailOpen.value = false
}

async function handleReject(request: SigningRequest) {
  await musig2Store.rejectRequest(request.sessionId)
  requestDetailOpen.value = false
}
</script>
```

---

## Create Wallet Modal

```vue
<!-- components/wallets/CreateWalletModal.vue -->
<template>
  <UModal
    v-model:open="open"
    :ui="{ width: 'max-w-md' }"
    :prevent-close="step !== 'name'"
  >
    <!-- Step 1: Name & Description -->
    <template v-if="step === 'name'">
      <div class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Create Shared Wallet</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Intro -->
        <div class="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-shield"
              class="w-6 h-6 text-primary flex-shrink-0"
            />
            <div>
              <p class="font-medium">Multi-signature security</p>
              <p class="text-sm text-muted mt-1">
                Shared wallets require multiple people to approve transactions,
                providing extra security for your funds.
              </p>
            </div>
          </div>
        </div>

        <UFormField label="Wallet Name" required>
          <UInput
            v-model="form.name"
            placeholder="e.g., Family Savings"
            autofocus
          />
        </UFormField>

        <UButton
          color="primary"
          block
          :disabled="!form.name.trim()"
          @click="step = 'participants'"
        >
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 2: Select Participants -->
    <template v-else-if="step === 'participants'">
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'name'"
          />
          <h2 class="text-lg font-semibold">Select Participants</h2>
        </div>

        <p class="text-sm text-muted">
          Choose contacts who will co-own this wallet. They must have a public
          key.
        </p>

        <!-- You (always included) -->
        <div class="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold"
            >
              You
            </div>
            <div class="flex-1">
              <p class="font-medium">You</p>
              <p class="text-xs text-muted">Always included</p>
            </div>
            <UIcon name="i-lucide-check" class="w-5 h-5 text-primary" />
          </div>
        </div>

        <!-- Eligible Contacts -->
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <button
            v-for="person in eligibleContacts"
            :key="person.id"
            :class="[
              'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
              isSelected(person)
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent',
            ]"
            @click="toggleParticipant(person)"
          >
            <PersonAvatar :person="person" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ person.name }}</p>
              <p class="text-xs text-muted">
                {{ person.isOnline ? '🟢 Online' : 'Offline' }}
              </p>
            </div>
            <UIcon
              :name="
                isSelected(person) ? 'i-lucide-check-circle' : 'i-lucide-circle'
              "
              :class="[
                'w-5 h-5',
                isSelected(person) ? 'text-primary' : 'text-muted',
              ]"
            />
          </button>
        </div>

        <!-- No eligible contacts -->
        <div v-if="eligibleContacts.length === 0" class="text-center py-6">
          <UIcon
            name="i-lucide-users"
            class="w-8 h-8 mx-auto text-muted mb-2"
          />
          <p class="text-sm text-muted">No eligible contacts</p>
          <p class="text-xs text-muted mt-1">
            Contacts need a public key to participate in shared wallets.
          </p>
        </div>

        <!-- Selection summary -->
        <div v-if="form.participantIds.length > 0" class="pt-3 border-t">
          <p class="text-sm text-muted">
            {{ form.participantIds.length + 1 }} participants selected
          </p>
        </div>

        <UButton
          color="primary"
          block
          :disabled="form.participantIds.length === 0"
          @click="step = 'threshold'"
        >
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 3: Set Threshold -->
    <template v-else-if="step === 'threshold'">
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'participants'"
          />
          <h2 class="text-lg font-semibold">Approval Threshold</h2>
        </div>

        <p class="text-sm text-muted">
          How many participants must approve each transaction?
        </p>

        <!-- Threshold Selection -->
        <div class="space-y-2">
          <button
            v-for="option in thresholdOptions"
            :key="option.value"
            :class="[
              'w-full p-4 rounded-xl border-2 transition-colors text-left',
              form.threshold === option.value
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
            ]"
            @click="form.threshold = option.value"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold">{{ option.label }}</p>
                <p class="text-sm text-muted">{{ option.description }}</p>
              </div>
              <div
                :class="[
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                  form.threshold === option.value
                    ? 'border-primary bg-primary'
                    : 'border-gray-300',
                ]"
              >
                <UIcon
                  v-if="form.threshold === option.value"
                  name="i-lucide-check"
                  class="w-4 h-4 text-white"
                />
              </div>
            </div>
          </button>
        </div>

        <UButton color="primary" block @click="step = 'confirm'">
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 4: Confirm -->
    <template v-else-if="step === 'confirm'">
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'threshold'"
          />
          <h2 class="text-lg font-semibold">Confirm Wallet</h2>
        </div>

        <!-- Summary -->
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-4">
          <div class="flex justify-between">
            <span class="text-muted">Name</span>
            <span class="font-medium">{{ form.name }}</span>
          </div>

          <div class="flex justify-between">
            <span class="text-muted">Type</span>
            <span class="font-medium"
              >{{ form.threshold }}-of-{{ totalParticipants }}</span
            >
          </div>

          <div>
            <span class="text-muted">Participants</span>
            <div class="flex flex-wrap gap-2 mt-2">
              <UBadge variant="subtle">You</UBadge>
              <UBadge
                v-for="id in form.participantIds"
                :key="id"
                variant="subtle"
              >
                {{ getParticipantName(id) }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Warning -->
        <div class="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div class="flex gap-2">
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-5 h-5 text-warning flex-shrink-0"
            />
            <p class="text-sm">
              All participants must be online to complete wallet creation.
            </p>
          </div>
        </div>

        <UButton
          color="primary"
          block
          size="lg"
          :loading="creating"
          @click="createWallet"
        >
          Create Wallet
        </UButton>
      </div>
    </template>

    <!-- Step 5: Creating -->
    <template v-else-if="step === 'creating'">
      <div class="p-6 text-center space-y-4">
        <div
          class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 text-primary animate-spin"
          />
        </div>

        <div>
          <h2 class="text-xl font-bold">Creating Wallet</h2>
          <p class="text-muted">{{ creationStatus }}</p>
        </div>

        <!-- Progress -->
        <div class="space-y-2">
          <div
            v-for="(participant, index) in allParticipants"
            :key="index"
            class="flex items-center gap-3 p-2 rounded-lg"
          >
            <UIcon
              :name="
                participant.ready
                  ? 'i-lucide-check-circle'
                  : 'i-lucide-loader-2'
              "
              :class="[
                'w-5 h-5',
                participant.ready ? 'text-success' : 'text-muted animate-spin',
              ]"
            />
            <span>{{ participant.name }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Step 6: Success -->
    <template v-else-if="step === 'success'">
      <div class="p-6 text-center space-y-4">
        <div
          class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
        >
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Wallet Created!</h2>
          <p class="text-muted">{{ form.name }} is ready to use</p>
        </div>

        <div class="space-y-2">
          <UButton color="primary" block @click="viewWallet">
            View Wallet
          </UButton>
          <UButton variant="ghost" block @click="close"> Done </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')

const props = defineProps<{
  preselectedContact?: string
}>()

const peopleStore = usePeopleStore()
const musig2Store = useMuSig2Store()

const step = ref<
  'name' | 'participants' | 'threshold' | 'confirm' | 'creating' | 'success'
>('name')
const creating = ref(false)
const creationStatus = ref('')
const createdWalletId = ref<string | null>(null)

const form = reactive({
  name: '',
  participantIds: [] as string[],
  threshold: 2,
})

// Initialize with preselected contact
watch(open, isOpen => {
  if (isOpen && props.preselectedContact) {
    form.participantIds = [props.preselectedContact]
  }
})

const eligibleContacts = computed(() =>
  peopleStore.signers.filter(p => p.canSign),
)

const totalParticipants = computed(() => form.participantIds.length + 1)

const thresholdOptions = computed(() => {
  const total = totalParticipants.value
  const options = []

  for (let i = 2; i <= total; i++) {
    options.push({
      value: i,
      label: `${i}-of-${total}`,
      description:
        i === total
          ? 'All participants must approve'
          : `${i} of ${total} participants must approve`,
    })
  }

  return options
})

const allParticipants = computed(() => [
  { name: 'You', ready: true },
  ...form.participantIds.map(id => ({
    name: getParticipantName(id),
    ready: false, // Updated during creation
  })),
])

function isSelected(person: Person): boolean {
  return form.participantIds.includes(person.id)
}

function toggleParticipant(person: Person) {
  const index = form.participantIds.indexOf(person.id)
  if (index === -1) {
    form.participantIds.push(person.id)
  } else {
    form.participantIds.splice(index, 1)
  }
}

function getParticipantName(id: string): string {
  return peopleStore.getById(id)?.name || 'Unknown'
}

async function createWallet() {
  creating.value = true
  step.value = 'creating'
  creationStatus.value = 'Connecting to participants...'

  try {
    const wallet = await musig2Store.createSharedWallet({
      name: form.name,
      participantIds: form.participantIds,
      threshold: form.threshold,
    })

    createdWalletId.value = wallet.id
    step.value = 'success'
  } catch (error) {
    creationStatus.value =
      error instanceof Error ? error.message : 'Creation failed'
    // Stay on creating step to show error
  } finally {
    creating.value = false
  }
}

function viewWallet() {
  if (createdWalletId.value) {
    navigateTo(`/people/wallets/${createdWalletId.value}`)
  }
  close()
}

function close() {
  open.value = false
  // Reset after animation
  setTimeout(() => {
    step.value = 'name'
    form.name = ''
    form.participantIds = []
    form.threshold = 2
    createdWalletId.value = null
  }, 300)
}
</script>
```

---

## Spend Modal

```vue
<!-- components/wallets/SpendModal.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <!-- Step 1: Amount & Recipient -->
    <template v-if="step === 'details'">
      <div class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Spend from {{ wallet.name }}</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Balance -->
        <div class="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
          <p class="text-sm text-muted">Available</p>
          <p class="text-xl font-bold font-mono">
            {{ formatXPI(wallet.balanceSats) }} XPI
          </p>
        </div>

        <!-- Recipient -->
        <UFormField label="Send to" required>
          <UInput
            v-model="form.recipient"
            placeholder="Search contacts or enter address..."
          />
        </UFormField>

        <!-- Amount -->
        <UFormField label="Amount" required>
          <UInput
            v-model="form.amount"
            type="number"
            placeholder="0.00"
            suffix="XPI"
          />
        </UFormField>

        <!-- Note -->
        <UFormField label="Note (optional)">
          <UInput v-model="form.note" placeholder="What's this for?" />
        </UFormField>

        <UButton
          color="primary"
          block
          :disabled="!isValid"
          @click="step = 'confirm'"
        >
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 2: Confirm & Request Signatures -->
    <template v-else-if="step === 'confirm'">
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'details'"
          />
          <h2 class="text-lg font-semibold">Confirm & Request</h2>
        </div>

        <!-- Transaction Summary -->
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 space-y-3">
          <div class="flex justify-between">
            <span class="text-muted">Amount</span>
            <span class="font-mono font-medium">{{ form.amount }} XPI</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">To</span>
            <span class="font-mono text-sm">{{
              truncateAddress(form.recipient)
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">From</span>
            <span>{{ wallet.name }}</span>
          </div>
        </div>

        <!-- Signers Required -->
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ wallet.threshold }} of
            {{ wallet.participantIds.length }} signatures required
          </p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <span
                class="w-2 h-2 rounded-full"
                :class="participant.isOnline ? 'bg-success' : 'bg-gray-400'"
              />
              <span class="text-sm">{{ participant.name }}</span>
            </div>
          </div>
        </div>

        <UButton
          color="primary"
          block
          size="lg"
          :loading="requesting"
          @click="requestSignatures"
        >
          Request Signatures
        </UButton>
      </div>
    </template>

    <!-- Step 3: Waiting for Signatures -->
    <template v-else-if="step === 'waiting'">
      <div class="p-6 text-center space-y-4">
        <div
          class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 text-primary animate-spin"
          />
        </div>

        <div>
          <h2 class="text-xl font-bold">Waiting for Signatures</h2>
          <p class="text-muted">
            {{ signatureCount }}/{{ wallet.threshold }} collected
          </p>
        </div>

        <!-- Signer Status -->
        <div class="space-y-2">
          <div
            v-for="signer in signerStatus"
            :key="signer.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <UIcon
              :name="signer.signed ? 'i-lucide-check-circle' : 'i-lucide-clock'"
              :class="signer.signed ? 'text-success' : 'text-muted'"
              class="w-5 h-5"
            />
            <span class="flex-1 text-left">{{ signer.name }}</span>
            <span class="text-sm text-muted">
              {{ signer.signed ? 'Signed' : 'Pending' }}
            </span>
          </div>
        </div>

        <UButton variant="ghost" @click="close">
          Close (will continue in background)
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SharedWallet, Person } from '~/types/people'

const open = defineModel<boolean>('open')

const props = defineProps<{
  wallet: SharedWallet
  participants: Person[]
}>()

const musig2Store = useMuSig2Store()

const step = ref<'details' | 'confirm' | 'waiting'>('details')
const requesting = ref(false)
const sessionId = ref<string | null>(null)

const form = reactive({
  recipient: '',
  amount: '',
  note: '',
})

const isValid = computed(
  () => form.recipient.startsWith('lotus_') && parseFloat(form.amount) > 0,
)

const signatureCount = computed(() => {
  if (!sessionId.value) return 0
  const session = musig2Store.getSession(sessionId.value)
  return session?.signatureCount || 0
})

const signerStatus = computed(() => {
  if (!sessionId.value) return []
  const session = musig2Store.getSession(sessionId.value)
  return props.participants.map(p => ({
    id: p.id,
    name: p.name,
    signed: session?.signedBy?.includes(p.id) || false,
  }))
})

function formatXPI(sats: bigint): string {
  return (Number(sats) / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-6)}`
}

async function requestSignatures() {
  requesting.value = true

  try {
    const session = await musig2Store.proposeSpend({
      walletId: props.wallet.id,
      recipient: form.recipient,
      amountSats: BigInt(Math.floor(parseFloat(form.amount) * 1_000_000)),
      note: form.note,
    })

    sessionId.value = session.id
    step.value = 'waiting'
  } catch (error) {
    // Show error
  } finally {
    requesting.value = false
  }
}

function close() {
  open.value = false
  setTimeout(() => {
    step.value = 'details'
    form.recipient = ''
    form.amount = ''
    form.note = ''
    sessionId.value = null
  }, 300)
}
</script>
```

---

## Tasks Checklist

### Pages

- [ ] Create `pages/people/wallets/index.vue`
- [ ] Create `pages/people/wallets/[id].vue`

### Components

- [ ] Create `components/wallets/CreateWalletModal.vue`
- [ ] Create `components/wallets/SpendModal.vue`
- [ ] Create `components/wallets/FundModal.vue`
- [ ] Create `components/wallets/SigningRequestCard.vue`
- [ ] Create `components/wallets/RequestDetailModal.vue`

### Integration

- [ ] Wire to MuSig2 store for wallet creation
- [ ] Wire to MuSig2 store for spending proposals
- [ ] Wire to activity store for transaction history
- [ ] Add activity events for wallet operations

### P2P Integration

- [ ] Handle participant online status
- [ ] Implement real-time signature collection
- [ ] Handle offline participants gracefully

---

## Verification

- [ ] Wallet list displays correctly
- [ ] Create wallet wizard works end-to-end
- [ ] Participant selection works
- [ ] Threshold selection works
- [ ] Wallet detail shows all information
- [ ] Spend flow works
- [ ] Signature requests are sent
- [ ] Signature collection updates in real-time
- [ ] Activity history displays correctly

---

_Next: [07_SETTINGS.md](./07_SETTINGS.md)_
