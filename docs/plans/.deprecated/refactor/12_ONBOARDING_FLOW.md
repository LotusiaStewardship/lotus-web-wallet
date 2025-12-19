# 12: Onboarding Flow

## Overview

This document details the implementation of a first-time user onboarding experience. Currently, users are dropped into the wallet with no guidance.

---

## Current Problems

1. **No welcome screen** - Users see the wallet immediately
2. **No feature discovery** - Users don't know what's available
3. **No backup prompts** - Users may never back up
4. **No contextual help** - No tooltips or hints
5. **Technical jargon** - Terms like "UTXO" confuse users

---

## Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Welcome                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│                         🪷                                           │
│                                                                      │
│                  Welcome to Lotus Wallet                             │
│                                                                      │
│         A secure, private wallet for the Lotus network               │
│                                                                      │
│                    [Create New Wallet]                               │
│                    [Restore Existing Wallet]                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Create or Restore                                           │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  CREATE: Your wallet has been created!                               │
│                                                                      │
│  ⚠️ IMPORTANT: Back up your seed phrase now                          │
│                                                                      │
│  Your 12-word seed phrase is the ONLY way to recover your wallet.   │
│  Write it down and store it somewhere safe.                          │
│                                                                      │
│                    [Back Up Now]                                     │
│                    [Skip for now (not recommended)]                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Backup Verification                                         │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Verify your backup by entering the requested words:                 │
│                                                                      │
│  Word #3: [________]                                                 │
│  Word #7: [________]                                                 │
│  Word #11: [________]                                                │
│                                                                      │
│                    [Verify]                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Quick Tour                                                  │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│  │  Send   │ │ Receive │ │  P2P    │ │ Social  │                    │
│  │         │ │         │ │         │ │         │                    │
│  │ Send XPI│ │Get your │ │Connect  │ │Vote on  │                    │
│  │to anyone│ │address  │ │with     │ │profiles │                    │
│  │         │ │         │ │others   │ │         │                    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                    │
│                                                                      │
│                    [Start Using Wallet]                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Store: onboarding.ts

```typescript
// stores/onboarding.ts

interface OnboardingState {
  // First time detection
  isFirstTime: boolean
  onboardingComplete: boolean

  // Current step
  currentStep: OnboardingStep | null

  // Completed steps
  completedSteps: Set<OnboardingStep>

  // Dismissed hints
  dismissedHints: Set<string>

  // Backup status
  backupComplete: boolean
  backupRemindedAt: number | null
  backupSkippedCount: number
}

type OnboardingStep =
  | 'welcome'
  | 'create_or_restore'
  | 'backup_seed'
  | 'verify_backup'
  | 'quick_tour'
  | 'complete'

export const useOnboardingStore = defineStore('onboarding', () => {
  // State
  const isFirstTime = ref(true)
  const onboardingComplete = ref(false)
  const currentStep = ref<OnboardingStep | null>(null)
  const completedSteps = ref<Set<OnboardingStep>>(new Set())
  const dismissedHints = ref<Set<string>>(new Set())
  const backupComplete = ref(false)
  const backupRemindedAt = ref<number | null>(null)
  const backupSkippedCount = ref(0)

  // Computed
  const shouldShowOnboarding = computed(
    () => isFirstTime.value && !onboardingComplete.value,
  )

  const shouldShowBackupReminder = computed(() => {
    if (backupComplete.value) return false
    if (!backupRemindedAt.value) return true

    // Remind again after 24 hours
    const dayInMs = 24 * 60 * 60 * 1000
    return Date.now() - backupRemindedAt.value > dayInMs
  })

  // Actions
  function startOnboarding() {
    currentStep.value = 'welcome'
  }

  function completeStep(step: OnboardingStep) {
    completedSteps.value.add(step)

    // Progress to next step
    const steps: OnboardingStep[] = [
      'welcome',
      'create_or_restore',
      'backup_seed',
      'verify_backup',
      'quick_tour',
      'complete',
    ]

    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      currentStep.value = steps[currentIndex + 1]
    } else {
      finishOnboarding()
    }

    saveState()
  }

  function skipStep(step: OnboardingStep) {
    if (step === 'backup_seed') {
      backupSkippedCount.value++
    }
    completeStep(step)
  }

  function finishOnboarding() {
    onboardingComplete.value = true
    currentStep.value = null
    isFirstTime.value = false
    saveState()
  }

  function skipOnboarding() {
    finishOnboarding()
  }

  // Hints
  function dismissHint(hintId: string) {
    dismissedHints.value.add(hintId)
    saveState()
  }

  function shouldShowHint(hintId: string): boolean {
    return !dismissedHints.value.has(hintId)
  }

  // Backup
  function markBackupComplete() {
    backupComplete.value = true
    saveState()
  }

  function snoozeBackupReminder() {
    backupRemindedAt.value = Date.now()
    saveState()
  }

  // Persistence
  function saveState() {
    const data = {
      isFirstTime: isFirstTime.value,
      onboardingComplete: onboardingComplete.value,
      completedSteps: Array.from(completedSteps.value),
      dismissedHints: Array.from(dismissedHints.value),
      backupComplete: backupComplete.value,
      backupRemindedAt: backupRemindedAt.value,
      backupSkippedCount: backupSkippedCount.value,
    }
    localStorage.setItem('lotus_onboarding', JSON.stringify(data))
  }

  function loadState() {
    const saved = localStorage.getItem('lotus_onboarding')
    if (saved) {
      const data = JSON.parse(saved)
      isFirstTime.value = data.isFirstTime ?? true
      onboardingComplete.value = data.onboardingComplete ?? false
      completedSteps.value = new Set(data.completedSteps || [])
      dismissedHints.value = new Set(data.dismissedHints || [])
      backupComplete.value = data.backupComplete ?? false
      backupRemindedAt.value = data.backupRemindedAt ?? null
      backupSkippedCount.value = data.backupSkippedCount ?? 0
    }
  }

  // Initialize
  loadState()

  return {
    // State
    isFirstTime,
    onboardingComplete,
    currentStep,
    completedSteps,
    dismissedHints,
    backupComplete,
    backupRemindedAt,
    backupSkippedCount,

    // Computed
    shouldShowOnboarding,
    shouldShowBackupReminder,

    // Actions
    startOnboarding,
    completeStep,
    skipStep,
    finishOnboarding,
    skipOnboarding,
    dismissHint,
    shouldShowHint,
    markBackupComplete,
    snoozeBackupReminder,
  }
})
```

---

## Component: OnboardingModal.vue

```vue
<script setup lang="ts">
const onboardingStore = useOnboardingStore()
const walletStore = useWalletStore()
const { success } = useNotifications()

// State
const restoreMode = ref(false)
const mnemonicInput = ref('')
const seedWords = ref<string[]>([])
const verificationInputs = ref(['', '', ''])
const verificationIndices = ref<number[]>([])

const open = computed(() => onboardingStore.shouldShowOnboarding)

// Generate verification indices when showing backup
watch(
  () => onboardingStore.currentStep,
  step => {
    if (step === 'verify_backup') {
      const indices: number[] = []
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * 12)
        if (!indices.includes(idx)) indices.push(idx)
      }
      verificationIndices.value = indices.sort((a, b) => a - b)
      verificationInputs.value = ['', '', '']
    }
  },
)

// Actions
async function createWallet() {
  await walletStore.createNewWallet()
  seedWords.value = walletStore.getMnemonic()?.split(' ') || []
  onboardingStore.completeStep('welcome')
}

async function startRestore() {
  restoreMode.value = true
}

async function restoreWallet() {
  try {
    await walletStore.restoreWallet(mnemonicInput.value.trim())
    onboardingStore.markBackupComplete() // Already has backup
    onboardingStore.completeStep('welcome')
    onboardingStore.completeStep('create_or_restore')
    onboardingStore.completeStep('backup_seed')
    onboardingStore.completeStep('verify_backup')
  } catch (e) {
    useNotifications().error('Restore Failed', e.message)
  }
}

function proceedToBackup() {
  onboardingStore.completeStep('create_or_restore')
}

function skipBackup() {
  onboardingStore.skipStep('backup_seed')
  onboardingStore.skipStep('verify_backup')
}

function verifyBackup() {
  const allCorrect = verificationIndices.value.every((wordIndex, i) => {
    const input = verificationInputs.value[i].trim().toLowerCase()
    const expected = seedWords.value[wordIndex]?.toLowerCase()
    return input === expected
  })

  if (allCorrect) {
    onboardingStore.markBackupComplete()
    onboardingStore.completeStep('backup_seed')
    onboardingStore.completeStep('verify_backup')
    success('Backup Verified!', 'Your wallet is now secured')
  } else {
    useNotifications().error(
      'Incorrect',
      'Please check your words and try again',
    )
  }
}

function finishTour() {
  onboardingStore.completeStep('quick_tour')
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }" prevent-close>
    <template #content>
      <!-- Welcome Step -->
      <UCard
        v-if="
          onboardingStore.currentStep === 'welcome' ||
          !onboardingStore.currentStep
        "
      >
        <div class="text-center py-8">
          <div
            class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <span class="text-4xl">🪷</span>
          </div>

          <h1 class="text-2xl font-bold mb-2">Welcome to Lotus Wallet</h1>
          <p class="text-muted mb-8">
            A secure, private wallet for the Lotus network
          </p>

          <div class="space-y-3">
            <UButton block color="primary" size="lg" @click="createWallet">
              Create New Wallet
            </UButton>
            <UButton
              block
              color="neutral"
              variant="outline"
              size="lg"
              @click="startRestore"
            >
              Restore Existing Wallet
            </UButton>
          </div>
        </div>

        <!-- Restore Form -->
        <div v-if="restoreMode" class="mt-6 pt-6 border-t border-default">
          <h3 class="font-semibold mb-4">Enter your 12-word seed phrase</h3>
          <UTextarea
            v-model="mnemonicInput"
            placeholder="word1 word2 word3 ..."
            :rows="3"
            class="mb-4"
          />
          <div class="flex gap-3">
            <UButton
              color="neutral"
              variant="outline"
              @click="restoreMode = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!mnemonicInput.trim()"
              @click="restoreWallet"
            >
              Restore Wallet
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Backup Prompt Step -->
      <UCard v-else-if="onboardingStore.currentStep === 'create_or_restore'">
        <div class="text-center py-6">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-8 h-8 text-warning"
            />
          </div>

          <h2 class="text-xl font-bold mb-2">Back Up Your Wallet</h2>
          <p class="text-muted mb-6">
            Your 12-word seed phrase is the <strong>only way</strong> to recover
            your wallet if you lose access to this device.
          </p>

          <UAlert
            color="error"
            icon="i-lucide-shield-alert"
            class="mb-6 text-left"
          >
            <template #description>
              <ul class="list-disc list-inside space-y-1 text-sm">
                <li>Write it down on paper</li>
                <li>Store it in a safe place</li>
                <li>Never share it with anyone</li>
                <li>Never enter it on any website</li>
              </ul>
            </template>
          </UAlert>

          <div class="space-y-3">
            <UButton block color="primary" size="lg" @click="proceedToBackup">
              Back Up Now
            </UButton>
            <UButton block color="neutral" variant="ghost" @click="skipBackup">
              Skip for now (not recommended)
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Show Seed Phrase Step -->
      <UCard v-else-if="onboardingStore.currentStep === 'backup_seed'">
        <div class="py-4">
          <h2 class="text-xl font-bold mb-2 text-center">Your Seed Phrase</h2>
          <p class="text-muted mb-6 text-center">
            Write down these 12 words in order
          </p>

          <div class="grid grid-cols-3 gap-3 mb-6">
            <div
              v-for="(word, index) in seedWords"
              :key="index"
              class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
            >
              <span class="text-xs text-muted w-5">{{ index + 1 }}.</span>
              <span class="font-mono font-medium">{{ word }}</span>
            </div>
          </div>

          <UAlert color="warning" icon="i-lucide-eye-off" class="mb-6">
            <template #description>
              Make sure no one is watching your screen
            </template>
          </UAlert>

          <UButton
            block
            color="primary"
            @click="onboardingStore.completeStep('backup_seed')"
          >
            I've Written It Down
          </UButton>
        </div>
      </UCard>

      <!-- Verify Backup Step -->
      <UCard v-else-if="onboardingStore.currentStep === 'verify_backup'">
        <div class="py-4">
          <h2 class="text-xl font-bold mb-2 text-center">Verify Your Backup</h2>
          <p class="text-muted mb-6 text-center">
            Enter the requested words to confirm you've saved your seed phrase
          </p>

          <div class="space-y-4 mb-6">
            <UFormField
              v-for="(wordIndex, i) in verificationIndices"
              :key="i"
              :label="`Word #${wordIndex + 1}`"
            >
              <UInput
                v-model="verificationInputs[i]"
                placeholder="Enter word"
                autocomplete="off"
              />
            </UFormField>
          </div>

          <UButton
            block
            color="primary"
            :disabled="!verificationInputs.every(v => v.trim())"
            @click="verifyBackup"
          >
            Verify
          </UButton>
        </div>
      </UCard>

      <!-- Quick Tour Step -->
      <UCard v-else-if="onboardingStore.currentStep === 'quick_tour'">
        <div class="py-4">
          <h2 class="text-xl font-bold mb-2 text-center">You're All Set!</h2>
          <p class="text-muted mb-6 text-center">
            Here's what you can do with Lotus Wallet
          </p>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="p-4 bg-muted/50 rounded-lg text-center">
              <UIcon
                name="i-lucide-send"
                class="w-8 h-8 text-primary mx-auto mb-2"
              />
              <p class="font-medium">Send</p>
              <p class="text-xs text-muted">Send XPI to anyone</p>
            </div>
            <div class="p-4 bg-muted/50 rounded-lg text-center">
              <UIcon
                name="i-lucide-qr-code"
                class="w-8 h-8 text-primary mx-auto mb-2"
              />
              <p class="font-medium">Receive</p>
              <p class="text-xs text-muted">Get your address</p>
            </div>
            <div class="p-4 bg-muted/50 rounded-lg text-center">
              <UIcon
                name="i-lucide-globe"
                class="w-8 h-8 text-primary mx-auto mb-2"
              />
              <p class="font-medium">P2P Network</p>
              <p class="text-xs text-muted">Connect with others</p>
            </div>
            <div class="p-4 bg-muted/50 rounded-lg text-center">
              <UIcon
                name="i-lucide-trophy"
                class="w-8 h-8 text-primary mx-auto mb-2"
              />
              <p class="font-medium">Social</p>
              <p class="text-xs text-muted">Vote on profiles</p>
            </div>
          </div>

          <UButton block color="primary" size="lg" @click="finishTour">
            Start Using Wallet
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Contextual Hints

### Component: ContextualHint.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  id: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}>()

const onboardingStore = useOnboardingStore()

const show = computed(() => onboardingStore.shouldShowHint(props.id))

function dismiss() {
  onboardingStore.dismissHint(props.id)
}
</script>

<template>
  <UPopover v-if="show" :open="true" :ui="{ width: 'max-w-xs' }">
    <slot />

    <template #content>
      <div class="p-3">
        <div class="flex items-start gap-2 mb-2">
          <UIcon
            name="i-lucide-lightbulb"
            class="w-5 h-5 text-primary flex-shrink-0"
          />
          <div>
            <p class="font-medium">{{ title }}</p>
            <p class="text-sm text-muted">{{ description }}</p>
          </div>
        </div>
        <UButton size="xs" color="neutral" variant="ghost" @click="dismiss">
          Got it
        </UButton>
      </div>
    </template>
  </UPopover>

  <slot v-else />
</template>
```

### Usage Example

```vue
<ContextualHint
  id="send-first-time"
  title="Send XPI"
  description="Enter an address or select a contact to send XPI"
>
  <UInput v-model="recipient" placeholder="lotus_..." />
</ContextualHint>
```

---

## Hint Locations

| Hint ID            | Location      | Title               | Description                               |
| ------------------ | ------------- | ------------------- | ----------------------------------------- |
| `send-first-time`  | Send page     | Send XPI            | Enter an address or select a contact      |
| `receive-copy`     | Receive page  | Copy Address        | Click to copy your address                |
| `history-filter`   | History page  | Filter Transactions | Use filters to find specific transactions |
| `p2p-intro`        | P2P page      | P2P Network         | Connect with other wallets for multi-sig  |
| `social-vote`      | Social page   | Vote on Profiles    | Burn XPI to vote on social profiles       |
| `contact-favorite` | Contacts page | Favorites           | Star contacts for quick access            |

---

## Integration with App

### In app.vue

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Onboarding Modal -->
  <OnboardingModal />

  <!-- Global Toasts -->
  <UNotifications />
</template>
```

### In layout

```vue
<template>
  <!-- Show loading until wallet ready -->
  <div
    v-if="!walletStore.sdkReady"
    class="flex items-center justify-center h-screen"
  >
    <AppLoadingState message="Loading wallet..." />
  </div>

  <!-- Show onboarding or main app -->
  <template v-else>
    <div v-if="onboardingStore.shouldShowOnboarding">
      <!-- Onboarding handles its own UI -->
    </div>

    <div v-else class="flex h-screen">
      <Sidebar />
      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
  </template>
</template>
```

---

## Summary

This completes the comprehensive refactoring plan for the lotus-web-wallet. The plan covers:

1. **Architecture** - Clean separation of concerns
2. **Design System** - Consistent UI patterns
3. **Stores** - Split monolithic stores into focused modules
4. **Composables** - Reusable utilities
5. **Wallet Core** - Home, Send, Receive, History
6. **Contacts** - Groups, activity, P2P integration
7. **Explorer** - Search, consistent patterns
8. **Social** - Inline voting, profile search
9. **P2P** - Mental model, complete flows
10. **MuSig2** - All three phases implemented
11. **Settings** - Logical organization, security
12. **Onboarding** - First-time user experience

---

## Next Steps

1. Review and approve the plan
2. Create new folder structure
3. Implement design system components
4. Migrate stores one by one
5. Rebuild pages using new patterns
6. Test thoroughly
7. Remove old code

---

_End of Refactoring Plan_
