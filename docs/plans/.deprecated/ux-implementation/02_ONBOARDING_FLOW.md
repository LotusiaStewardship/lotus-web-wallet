# Phase 2: Onboarding Flow

## Overview

New users are currently dropped into the wallet with no guidance. This phase implements a comprehensive onboarding experience that helps users understand what the wallet does, guides them through initial setup, and provides ongoing feature discovery.

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 (Layout), existing onboarding components in `components/onboarding/`

---

## Goals

1. Welcome screen for first-time users
2. Wallet creation/restoration choice
3. Backup verification flow
4. Getting started checklist
5. Contextual feature discovery tooltips
6. "What's New" for returning users

---

## 1. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FIRST VISIT                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Welcome Screen                               │
│  "Welcome to Lotus Wallet - Your gateway to the Lotus ecosystem" │
│                                                                  │
│  [Create New Wallet]          [Restore Existing Wallet]          │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Create New Wallet     │     │   Restore Wallet        │
│   - Generate seed       │     │   - Enter seed phrase   │
│   - Show seed phrase    │     │   - Validate            │
│   - Verify backup       │     │   - Import              │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Getting Started Checklist                      │
│  ☐ Back up your wallet (if not done)                            │
│  ☐ Add your first contact                                        │
│  ☐ Receive your first Lotus                                      │
│  ☐ Send your first transaction                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Home Page                                 │
│  (with contextual tooltips on first visit to each feature)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Onboarding State Management

### File: `stores/onboarding.ts`

```ts
import { defineStore } from 'pinia'

interface OnboardingState {
  // Has user completed initial onboarding?
  completed: boolean
  // Has user verified their backup?
  backupVerified: boolean
  // Checklist items completed
  checklist: {
    backup: boolean
    addContact: boolean
    receiveFirst: boolean
    sendFirst: boolean
  }
  // Feature tooltips shown
  tooltipsShown: {
    send: boolean
    receive: boolean
    contacts: boolean
    p2p: boolean
    social: boolean
    explorer: boolean
  }
  // Last version user saw "What's New" for
  lastSeenVersion: string | null
  // Timestamp of first visit
  firstVisit: number | null
}

export const useOnboardingStore = defineStore('onboarding', {
  state: (): OnboardingState => ({
    completed: false,
    backupVerified: false,
    checklist: {
      backup: false,
      addContact: false,
      receiveFirst: false,
      sendFirst: false,
    },
    tooltipsShown: {
      send: false,
      receive: false,
      contacts: false,
      p2p: false,
      social: false,
      explorer: false,
    },
    lastSeenVersion: null,
    firstVisit: null,
  }),

  getters: {
    isNewUser: state => !state.completed,

    checklistProgress: state => {
      const items = Object.values(state.checklist)
      const completed = items.filter(Boolean).length
      return { completed, total: items.length }
    },

    showBackupReminder: state => {
      // Show reminder if not backed up and it's been more than 1 hour
      if (state.backupVerified) return false
      if (!state.firstVisit) return false
      const hoursSinceFirst = (Date.now() - state.firstVisit) / (1000 * 60 * 60)
      return hoursSinceFirst > 1
    },

    shouldShowWhatsNew: state => {
      const currentVersion = useRuntimeConfig().public.appVersion
      return state.completed && state.lastSeenVersion !== currentVersion
    },
  },

  actions: {
    initialize() {
      // Load from localStorage
      const saved = localStorage.getItem('onboarding')
      if (saved) {
        const data = JSON.parse(saved)
        this.$patch(data)
      } else {
        this.firstVisit = Date.now()
        this.save()
      }
    },

    save() {
      localStorage.setItem('onboarding', JSON.stringify(this.$state))
    },

    completeOnboarding() {
      this.completed = true
      this.save()
    },

    verifyBackup() {
      this.backupVerified = true
      this.checklist.backup = true
      this.save()
    },

    completeChecklistItem(item: keyof OnboardingState['checklist']) {
      this.checklist[item] = true
      this.save()
    },

    markTooltipShown(feature: keyof OnboardingState['tooltipsShown']) {
      this.tooltipsShown[feature] = true
      this.save()
    },

    dismissWhatsNew() {
      this.lastSeenVersion = useRuntimeConfig().public.appVersion
      this.save()
    },

    reset() {
      this.$reset()
      localStorage.removeItem('onboarding')
    },
  },
})
```

---

## 3. Onboarding Page

### File: `pages/onboarding.vue`

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  layout: false, // No sidebar during onboarding
  title: 'Welcome',
})

const onboardingStore = useOnboardingStore()
const walletStore = useWalletStore()
const router = useRouter()

// Redirect if already completed onboarding
onMounted(() => {
  if (onboardingStore.completed) {
    router.replace('/')
  }
})

// Current step
const currentStep = ref<
  'welcome' | 'create' | 'restore' | 'backup' | 'verify' | 'checklist'
>('welcome')

// Seed phrase for new wallet
const seedPhrase = ref<string[]>([])
const seedPhraseInput = ref('')

// Handle wallet creation
async function createWallet() {
  currentStep.value = 'create'
  // Generate new wallet
  await walletStore.generateNewWallet()
  seedPhrase.value = walletStore.seedPhrase?.split(' ') || []
  currentStep.value = 'backup'
}

// Handle wallet restoration
function startRestore() {
  currentStep.value = 'restore'
}

async function restoreWallet() {
  const words = seedPhraseInput.value.trim().split(/\s+/)
  if (words.length !== 12 && words.length !== 24) {
    // Show error
    return
  }
  await walletStore.restoreFromSeed(seedPhraseInput.value.trim())
  onboardingStore.verifyBackup() // Restored wallets are considered backed up
  currentStep.value = 'checklist'
}

// Backup verification
const verificationWords = ref<{ index: number; word: string }[]>([])
const userVerification = ref<string[]>([])

function startVerification() {
  // Pick 3 random words to verify
  const indices = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * seedPhrase.value.length)
    if (!indices.includes(idx)) indices.push(idx)
  }
  indices.sort((a, b) => a - b)
  verificationWords.value = indices.map(i => ({
    index: i,
    word: seedPhrase.value[i],
  }))
  userVerification.value = ['', '', '']
  currentStep.value = 'verify'
}

function verifyBackup() {
  const correct = verificationWords.value.every(
    (v, i) =>
      userVerification.value[i].toLowerCase().trim() === v.word.toLowerCase(),
  )
  if (correct) {
    onboardingStore.verifyBackup()
    currentStep.value = 'checklist'
  } else {
    // Show error, let them try again
  }
}

function skipVerification() {
  // Allow skip but show warning
  currentStep.value = 'checklist'
}

function finishOnboarding() {
  onboardingStore.completeOnboarding()
  router.push('/')
}
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4"
  >
    <div class="w-full max-w-lg">
      <!-- Welcome Step -->
      <OnboardingWelcome
        v-if="currentStep === 'welcome'"
        @create="createWallet"
        @restore="startRestore"
      />

      <!-- Create Wallet - Show Seed -->
      <OnboardingBackup
        v-else-if="currentStep === 'backup'"
        :seed-phrase="seedPhrase"
        @continue="startVerification"
      />

      <!-- Verify Backup -->
      <OnboardingVerify
        v-else-if="currentStep === 'verify'"
        :verification-words="verificationWords"
        v-model:answers="userVerification"
        @verify="verifyBackup"
        @skip="skipVerification"
      />

      <!-- Restore Wallet -->
      <OnboardingRestore
        v-else-if="currentStep === 'restore'"
        v-model="seedPhraseInput"
        @restore="restoreWallet"
        @back="currentStep = 'welcome'"
      />

      <!-- Getting Started Checklist -->
      <OnboardingChecklist
        v-else-if="currentStep === 'checklist'"
        @finish="finishOnboarding"
      />
    </div>
  </div>
</template>
```

---

## 4. Onboarding Components

### 4.1 Welcome Screen

**File**: `components/onboarding/OnboardingWelcome.vue`

```vue
<script setup lang="ts">
const emit = defineEmits<{
  create: []
  restore: []
}>()
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
    <!-- Logo -->
    <div class="mb-6">
      <UIcon name="i-lucide-flower-2" class="w-20 h-20 text-primary mx-auto" />
    </div>

    <!-- Title -->
    <h1 class="text-3xl font-bold mb-2">Welcome to Lotus Wallet</h1>
    <p class="text-gray-500 dark:text-gray-400 mb-8">
      Your gateway to the Lotus blockchain ecosystem
    </p>

    <!-- Features -->
    <div class="space-y-4 mb-8 text-left">
      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <div class="font-semibold">Send & Receive</div>
          <div class="text-sm text-gray-500">
            Transfer Lotus instantly to anyone
          </div>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-thumbs-up" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <div class="font-semibold">Vote on Content</div>
          <div class="text-sm text-gray-500">
            Support creators with RANK votes
          </div>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <div class="font-semibold">Connect P2P</div>
          <div class="text-sm text-gray-500">
            Multi-signature transactions with other wallets
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-3">
      <UButton color="primary" size="lg" block @click="emit('create')">
        Create New Wallet
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        block
        @click="emit('restore')"
      >
        Restore Existing Wallet
      </UButton>
    </div>
  </div>
</template>
```

### 4.2 Backup Screen

**File**: `components/onboarding/OnboardingBackup.vue`

```vue
<script setup lang="ts">
defineProps<{
  seedPhrase: string[]
}>()

const emit = defineEmits<{
  continue: []
}>()

const copied = ref(false)
const confirmed = ref(false)

function copyToClipboard() {
  navigator.clipboard.writeText(props.seedPhrase.join(' '))
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
    <!-- Header -->
    <div class="text-center mb-6">
      <div
        class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-lucide-key" class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-2xl font-bold">Back Up Your Wallet</h2>
      <p class="text-gray-500 mt-2">
        Write down these 12 words in order. This is the only way to recover your
        wallet.
      </p>
    </div>

    <!-- Warning -->
    <UAlert
      color="warning"
      icon="i-lucide-alert-triangle"
      title="Important"
      description="Never share your seed phrase. Anyone with these words can access your funds."
      class="mb-6"
    />

    <!-- Seed Phrase Grid -->
    <div
      class="grid grid-cols-3 gap-2 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
    >
      <div
        v-for="(word, index) in seedPhrase"
        :key="index"
        class="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
      >
        <span class="text-xs text-gray-400 w-5">{{ index + 1 }}.</span>
        <span class="font-mono font-medium">{{ word }}</span>
      </div>
    </div>

    <!-- Copy Button -->
    <UButton
      color="neutral"
      variant="soft"
      block
      class="mb-6"
      @click="copyToClipboard"
    >
      <UIcon
        :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        class="w-4 h-4 mr-2"
      />
      {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
    </UButton>

    <!-- Confirmation Checkbox -->
    <label class="flex items-start gap-3 mb-6 cursor-pointer">
      <input
        v-model="confirmed"
        type="checkbox"
        class="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span class="text-sm text-gray-600 dark:text-gray-400">
        I have written down my seed phrase and stored it in a safe place.
      </span>
    </label>

    <!-- Continue Button -->
    <UButton
      color="primary"
      size="lg"
      block
      :disabled="!confirmed"
      @click="emit('continue')"
    >
      Continue to Verification
    </UButton>
  </div>
</template>
```

### 4.3 Verification Screen

**File**: `components/onboarding/OnboardingVerify.vue`

```vue
<script setup lang="ts">
defineProps<{
  verificationWords: { index: number; word: string }[]
}>()

const answers = defineModel<string[]>('answers', { required: true })

const emit = defineEmits<{
  verify: []
  skip: []
}>()

const error = ref(false)

function handleVerify() {
  error.value = false
  emit('verify')
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
    <!-- Header -->
    <div class="text-center mb-6">
      <div
        class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-lucide-shield-check" class="w-8 h-8 text-primary" />
      </div>
      <h2 class="text-2xl font-bold">Verify Your Backup</h2>
      <p class="text-gray-500 mt-2">
        Enter the following words from your seed phrase to confirm you've saved
        it.
      </p>
    </div>

    <!-- Verification Inputs -->
    <div class="space-y-4 mb-6">
      <div v-for="(item, i) in verificationWords" :key="item.index">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Word #{{ item.index + 1 }}
        </label>
        <input
          v-model="answers[i]"
          type="text"
          :placeholder="`Enter word ${item.index + 1}`"
          class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
          autocomplete="off"
          autocapitalize="none"
        />
      </div>
    </div>

    <!-- Error Message -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-x-circle"
      title="Incorrect"
      description="One or more words don't match. Please check your backup and try again."
      class="mb-6"
    />

    <!-- Actions -->
    <div class="space-y-3">
      <UButton color="primary" size="lg" block @click="handleVerify">
        Verify Backup
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        block
        @click="emit('skip')"
      >
        Skip for Now (Not Recommended)
      </UButton>
    </div>
  </div>
</template>
```

### 4.4 Restore Screen

**File**: `components/onboarding/OnboardingRestore.vue`

```vue
<script setup lang="ts">
const seedPhrase = defineModel<string>({ required: true })

const emit = defineEmits<{
  restore: []
  back: []
}>()

const wordCount = computed(() => {
  const words = seedPhrase.value.trim().split(/\s+/).filter(Boolean)
  return words.length
})

const isValid = computed(() => wordCount.value === 12 || wordCount.value === 24)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
    <!-- Header -->
    <div class="text-center mb-6">
      <div
        class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-lucide-download" class="w-8 h-8 text-primary" />
      </div>
      <h2 class="text-2xl font-bold">Restore Your Wallet</h2>
      <p class="text-gray-500 mt-2">
        Enter your 12 or 24 word seed phrase to restore your wallet.
      </p>
    </div>

    <!-- Seed Phrase Input -->
    <div class="mb-4">
      <textarea
        v-model="seedPhrase"
        rows="4"
        placeholder="Enter your seed phrase, separated by spaces..."
        class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
      />
      <div class="flex justify-between mt-2 text-sm">
        <span :class="isValid ? 'text-green-600' : 'text-gray-500'">
          {{ wordCount }} words
        </span>
        <span class="text-gray-500"> Expected: 12 or 24 words </span>
      </div>
    </div>

    <!-- Security Note -->
    <UAlert
      color="info"
      icon="i-lucide-info"
      description="Your seed phrase is never sent to any server. All wallet operations happen locally in your browser."
      class="mb-6"
    />

    <!-- Actions -->
    <div class="space-y-3">
      <UButton
        color="primary"
        size="lg"
        block
        :disabled="!isValid"
        @click="emit('restore')"
      >
        Restore Wallet
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        block
        @click="emit('back')"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4 mr-2" />
        Back
      </UButton>
    </div>
  </div>
</template>
```

### 4.5 Getting Started Checklist

**File**: `components/onboarding/OnboardingChecklist.vue`

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'

const emit = defineEmits<{
  finish: []
}>()

const onboardingStore = useOnboardingStore()

const checklistItems = computed(() => [
  {
    key: 'backup',
    label: 'Back up your wallet',
    description: 'Secure your seed phrase to prevent losing access',
    icon: 'i-lucide-shield',
    completed: onboardingStore.checklist.backup,
    action: { label: 'Backup Now', to: '/settings/backup' },
  },
  {
    key: 'addContact',
    label: 'Add your first contact',
    description: 'Save addresses for easy sending',
    icon: 'i-lucide-user-plus',
    completed: onboardingStore.checklist.addContact,
    action: { label: 'Add Contact', to: '/people/contacts?add=true' },
  },
  {
    key: 'receiveFirst',
    label: 'Receive your first Lotus',
    description: 'Share your address to receive funds',
    icon: 'i-lucide-qr-code',
    completed: onboardingStore.checklist.receiveFirst,
    action: { label: 'Get Address', to: '/transact/receive' },
  },
  {
    key: 'sendFirst',
    label: 'Send your first transaction',
    description: 'Experience instant Lotus transfers',
    icon: 'i-lucide-send',
    completed: onboardingStore.checklist.sendFirst,
    action: { label: 'Send Lotus', to: '/transact/send' },
  },
])

const progress = computed(() => onboardingStore.checklistProgress)
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
    <!-- Header -->
    <div class="text-center mb-6">
      <div
        class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-lucide-rocket" class="w-8 h-8 text-green-600" />
      </div>
      <h2 class="text-2xl font-bold">You're All Set!</h2>
      <p class="text-gray-500 mt-2">
        Complete these steps to get the most out of your wallet.
      </p>
    </div>

    <!-- Progress Bar -->
    <div class="mb-6">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-gray-500">Progress</span>
        <span class="font-medium"
          >{{ progress.completed }}/{{ progress.total }}</span
        >
      </div>
      <div
        class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <div
          class="h-full bg-primary transition-all duration-300"
          :style="{ width: `${(progress.completed / progress.total) * 100}%` }"
        />
      </div>
    </div>

    <!-- Checklist Items -->
    <div class="space-y-3 mb-6">
      <div
        v-for="item in checklistItems"
        :key="item.key"
        class="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        :class="{
          'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800':
            item.completed,
        }"
      >
        <!-- Status Icon -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          :class="
            item.completed
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
          "
        >
          <UIcon
            :name="item.completed ? 'i-lucide-check' : item.icon"
            class="w-5 h-5"
            :class="item.completed ? 'text-green-600' : 'text-gray-500'"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div
            class="font-medium"
            :class="{ 'line-through text-gray-400': item.completed }"
          >
            {{ item.label }}
          </div>
          <div class="text-sm text-gray-500">{{ item.description }}</div>
        </div>

        <!-- Action -->
        <NuxtLink v-if="!item.completed" :to="item.action.to" class="shrink-0">
          <UButton color="primary" variant="soft" size="sm">
            {{ item.action.label }}
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Continue Button -->
    <UButton color="primary" size="lg" block @click="emit('finish')">
      Go to Wallet
    </UButton>
  </div>
</template>
```

---

## 5. Backup Reminder Component

**File**: `components/onboarding/BackupReminder.vue`

Display this on the home page if backup not verified:

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'

const onboardingStore = useOnboardingStore()
const dismissed = ref(false)
</script>

<template>
  <UAlert
    v-if="onboardingStore.showBackupReminder && !dismissed"
    color="warning"
    icon="i-lucide-alert-triangle"
    class="mb-6"
  >
    <template #title>Back Up Your Wallet</template>
    <template #description>
      <p class="mb-3">
        You haven't verified your backup yet. If you lose access to this device,
        you'll lose your funds forever.
      </p>
      <div class="flex gap-2">
        <UButton color="warning" size="sm" to="/settings/backup">
          Backup Now
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          @click="dismissed = true"
        >
          Remind Me Later
        </UButton>
      </div>
    </template>
  </UAlert>
</template>
```

---

## 6. Feature Discovery Tooltips

**File**: `components/onboarding/FeatureTooltip.vue`

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'

const props = defineProps<{
  feature: 'send' | 'receive' | 'contacts' | 'p2p' | 'social' | 'explorer'
  title: string
  description: string
}>()

const onboardingStore = useOnboardingStore()

const show = computed(
  () =>
    onboardingStore.completed && !onboardingStore.tooltipsShown[props.feature],
)

function dismiss() {
  onboardingStore.markTooltipShown(props.feature)
}
</script>

<template>
  <UPopover v-if="show" :open="true" @update:open="dismiss">
    <slot />
    <template #content>
      <div class="p-4 max-w-xs">
        <div class="font-semibold mb-1">{{ title }}</div>
        <p class="text-sm text-gray-500 mb-3">{{ description }}</p>
        <UButton size="sm" @click="dismiss">Got it</UButton>
      </div>
    </template>
  </UPopover>
  <slot v-else />
</template>
```

---

## 7. Implementation Checklist

### Store

- [ ] Create `stores/onboarding.ts`
- [ ] Add persistence to localStorage
- [ ] Add checklist tracking

### Pages

- [ ] Create `pages/onboarding.vue`
- [ ] Add redirect logic for new users

### Components

- [ ] Create/update `components/onboarding/OnboardingWelcome.vue`
- [ ] Create/update `components/onboarding/OnboardingBackup.vue`
- [ ] Create/update `components/onboarding/OnboardingVerify.vue`
- [ ] Create/update `components/onboarding/OnboardingRestore.vue`
- [ ] Create/update `components/onboarding/OnboardingChecklist.vue`
- [ ] Create `components/onboarding/BackupReminder.vue`
- [ ] Create `components/onboarding/FeatureTooltip.vue`

### Integration

- [ ] Add onboarding check to `app.vue` or layout
- [ ] Track checklist completion in relevant stores
- [ ] Add backup reminder to home page

---

## 8. App Entry Point Logic

**File**: `app.vue` (or middleware)

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'

const onboardingStore = useOnboardingStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  onboardingStore.initialize()

  // Redirect new users to onboarding (except if already there)
  if (onboardingStore.isNewUser && route.path !== '/onboarding') {
    router.replace('/onboarding')
  }
})
</script>
```

---

## Next Phase

Once this phase is complete, proceed to [03_WALLET_HOME.md](./03_WALLET_HOME.md) to implement the main wallet home page.
