# Phase 3: Wallet Restore Page

## Overview

Create the `/settings/restore` page that allows users to restore their wallet from a seed phrase. This is a core wallet function that complements the existing backup functionality.

**Priority**: P1
**Estimated Effort**: 1 day
**Dependencies**: Wallet Store, Bitcore SDK

---

## Problem Statement

Users can back up their seed phrase via `/settings/backup`, but there is no corresponding restore flow. If a user needs to recover their wallet (new device, browser reset, etc.), they have no way to do so within the app.

---

## Implementation

### Task 3.1: Create Restore Page

**File**: `pages/settings/restore.vue`

```vue
<script setup lang="ts">
/**
 * Restore Wallet Page
 *
 * Restore wallet from seed phrase.
 */
import { useWalletStore } from '~/stores/wallet'
import { useBitcore } from '~/composables/useBitcore'

definePageMeta({
  title: 'Restore Wallet',
})

const walletStore = useWalletStore()
const { Bitcore } = useBitcore()
const toast = useToast()
const router = useRouter()

// Form state
const step = ref<'warning' | 'input' | 'confirm' | 'success'>('warning')
const seedPhrase = ref('')
const confirmText = ref('')
const isRestoring = ref(false)
const error = ref('')

// Parse seed phrase into words
const words = computed(() => {
  return seedPhrase.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0)
})

// Validate seed phrase
const isValidSeedPhrase = computed(() => {
  const wordCount = words.value.length
  if (wordCount !== 12 && wordCount !== 24) return false

  // Use Bitcore to validate
  try {
    if (!Bitcore.value) return false
    const Mnemonic = Bitcore.value.Mnemonic
    const mnemonic = new Mnemonic(words.value.join(' '))
    return mnemonic.isValid()
  } catch {
    return false
  }
})

// Check if wallet exists
const hasExistingWallet = computed(() => {
  return walletStore.isInitialized && walletStore.address
})

// Proceed from warning
function proceedFromWarning() {
  step.value = 'input'
}

// Validate and proceed to confirm
function validateAndProceed() {
  error.value = ''

  if (!isValidSeedPhrase.value) {
    error.value = 'Invalid seed phrase. Please check your words and try again.'
    return
  }

  step.value = 'confirm'
}

// Restore wallet
async function restoreWallet() {
  if (confirmText.value.toLowerCase() !== 'restore') return

  isRestoring.value = true
  error.value = ''

  try {
    // Clear existing wallet data
    localStorage.removeItem('lotus-wallet-state')
    localStorage.removeItem('lotus-contacts')

    // Initialize wallet with seed phrase
    await walletStore.initializeFromMnemonic(words.value.join(' '))

    step.value = 'success'

    toast.add({
      title: 'Wallet Restored',
      description: 'Your wallet has been successfully restored',
      color: 'success',
    })
  } catch (err) {
    error.value = 'Failed to restore wallet. Please check your seed phrase.'
    console.error('Restore failed:', err)
  } finally {
    isRestoring.value = false
  }
}

// Go to wallet
function goToWallet() {
  router.push('/')
}
</script>

<template>
  <div class="space-y-4">
    <SettingsBackButton />

    <!-- Header -->
    <UiAppCard>
      <div class="flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-upload" class="w-6 h-6 text-warning" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">Restore Wallet</h2>
          <p class="text-sm text-muted">
            Recover your wallet using your seed phrase
          </p>
        </div>
      </div>
    </UiAppCard>

    <!-- Step 1: Warning -->
    <template v-if="step === 'warning'">
      <UiAppCard>
        <div class="text-center py-4">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-8 h-8 text-warning"
            />
          </div>

          <h3 class="text-lg font-semibold mb-2">Before You Continue</h3>

          <div class="text-sm text-muted space-y-3 text-left max-w-md mx-auto">
            <p v-if="hasExistingWallet" class="text-warning font-medium">
              ⚠️ You already have a wallet. Restoring will replace your current
              wallet. Make sure you have backed up your current seed phrase!
            </p>

            <p>
              You will need your 12 or 24 word seed phrase to restore your
              wallet.
            </p>

            <p>
              <strong>Never share your seed phrase with anyone.</strong>
              Anyone with your seed phrase can access your funds.
            </p>

            <p>
              Make sure you are in a private location where no one can see your
              screen.
            </p>
          </div>
        </div>

        <div class="flex gap-3 mt-4">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1"
            to="/settings"
          >
            Cancel
          </UButton>
          <UButton color="primary" class="flex-1" @click="proceedFromWarning">
            I Understand, Continue
          </UButton>
        </div>
      </UiAppCard>
    </template>

    <!-- Step 2: Input Seed Phrase -->
    <template v-else-if="step === 'input'">
      <UiAppCard title="Enter Seed Phrase" icon="i-lucide-key">
        <p class="text-sm text-muted mb-4">
          Enter your 12 or 24 word seed phrase, separated by spaces.
        </p>

        <UTextarea
          v-model="seedPhrase"
          placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
          :rows="4"
          class="font-mono"
        />

        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-muted">
            {{ words.length }} words entered
          </span>
          <UBadge
            v-if="words.length >= 12"
            :color="isValidSeedPhrase ? 'success' : 'error'"
          >
            {{ isValidSeedPhrase ? 'Valid' : 'Invalid' }}
          </UBadge>
        </div>

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          class="mt-4"
        >
          <template #description>{{ error }}</template>
        </UAlert>
      </UiAppCard>

      <div class="flex gap-3">
        <UButton
          color="neutral"
          variant="outline"
          class="flex-1"
          @click="step = 'warning'"
        >
          Back
        </UButton>
        <UButton
          color="primary"
          class="flex-1"
          :disabled="!isValidSeedPhrase"
          @click="validateAndProceed"
        >
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 3: Confirm -->
    <template v-else-if="step === 'confirm'">
      <UiAppCard>
        <div class="text-center py-4">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center"
          >
            <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-error" />
          </div>

          <h3 class="text-lg font-semibold text-error mb-2">Confirm Restore</h3>

          <p class="text-sm text-muted mb-4">
            This will replace your current wallet with the restored wallet. This
            action cannot be undone.
          </p>

          <UFormField label="Type 'restore' to confirm">
            <UInput
              v-model="confirmText"
              placeholder="restore"
              class="text-center"
            />
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-alert-circle"
            class="mt-4"
          >
            <template #description>{{ error }}</template>
          </UAlert>
        </div>

        <div class="flex gap-3 mt-4">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="step = 'input'"
          >
            Back
          </UButton>
          <UButton
            color="error"
            class="flex-1"
            :disabled="confirmText.toLowerCase() !== 'restore'"
            :loading="isRestoring"
            @click="restoreWallet"
          >
            Restore Wallet
          </UButton>
        </div>
      </UiAppCard>
    </template>

    <!-- Step 4: Success -->
    <template v-else-if="step === 'success'">
      <UiAppCard>
        <div class="text-center py-8">
          <div
            class="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-10 h-10 text-success"
            />
          </div>

          <h3 class="text-xl font-semibold mb-2">Wallet Restored!</h3>

          <p class="text-sm text-muted mb-6">
            Your wallet has been successfully restored. Your balance and
            transaction history will sync automatically.
          </p>

          <UButton color="primary" size="lg" @click="goToWallet">
            Go to Wallet
          </UButton>
        </div>
      </UiAppCard>
    </template>
  </div>
</template>
```

---

### Task 3.2: Wallet Store Method (Already Exists)

**File**: `stores/wallet.ts`

The `restoreWallet()` method already exists in the wallet store:

```typescript
async restoreWallet(seedPhrase: string) {
  const Mnemonic = getMnemonic()
  if (!Mnemonic.isValid(seedPhrase)) {
    throw new Error('Invalid seed phrase')
  }
  // ... clears state, rebuilds wallet, reconnects Chronik
}
```

**No changes needed** - use `walletStore.restoreWallet()` in the restore page.

---

### Task 3.3: Add Link to Settings Index

**File**: `pages/settings/index.vue`

Add Restore to the Security section:

```javascript
{
  label: 'Restore Wallet',
  description: 'Recover wallet from seed phrase',
  icon: 'i-lucide-upload',
  to: '/settings/restore',
},
```

---

## Verification Checklist

- [ ] `/settings/restore` page loads without errors
- [ ] Warning step shows existing wallet notice when applicable
- [ ] Seed phrase validation works for 12 and 24 words
- [ ] Invalid seed phrases show error
- [ ] Confirmation step requires typing "restore"
- [ ] Wallet is restored successfully
- [ ] User is redirected to wallet after restore
- [ ] Balance syncs after restore

---

## Security Considerations

- Seed phrase input should not be logged
- Consider adding a "paste" button with clipboard access
- Clear seed phrase from memory after restore
- Warn users about screen recording/screenshots

---

_Phase 3 of Critical Gaps Remediation Plan_
