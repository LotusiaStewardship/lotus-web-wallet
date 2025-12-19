<script setup lang="ts">
/**
 * Restore Wallet Page
 *
 * Restore wallet from seed phrase.
 */
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'
import { useSeedPhrase } from '~/composables/useSeedPhrase'

definePageMeta({
  title: 'Restore',
})

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const router = useRouter()
const { success, error: showError } = useNotifications()

// Seed phrase input with validation
const { input: seedPhrase, words, wordCount, isValid: isValidSeedPhrase } = useSeedPhrase()

// Form state
const step = ref<'warning' | 'input' | 'confirm' | 'success'>('warning')
const confirmText = ref('')
const isRestoring = ref(false)
const errorMessage = ref('')

// Check if wallet exists
const hasExistingWallet = computed(() => {
  return walletStore.initialized && walletStore.address
})

// Proceed from warning
function proceedFromWarning() {
  step.value = 'input'
}

// Validate and proceed to confirm
function validateAndProceed() {
  errorMessage.value = ''

  if (!isValidSeedPhrase.value) {
    errorMessage.value = 'Invalid seed phrase. Please check your words and try again.'
    return
  }

  step.value = 'confirm'
}

// Restore wallet
async function restoreWallet() {
  if (confirmText.value.toLowerCase() !== 'restore') return

  isRestoring.value = true
  errorMessage.value = ''

  try {
    await walletStore.restoreWallet(words.value.join(' '))

    // Mark backup as complete since they already have the phrase
    onboardingStore.markBackupComplete()

    step.value = 'success'

    success('Wallet Restored', 'Your wallet has been successfully restored')
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to restore wallet. Please check your seed phrase.'
    showError('Restore Failed', errorMessage.value)
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

    <!-- Step 1: Warning -->
    <template v-if="step === 'warning'">
      <UiAppCard>
        <div class="text-center py-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
            <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-warning" />
          </div>

          <h3 class="text-lg font-semibold mb-2">Before You Continue</h3>

          <div class="text-sm text-muted space-y-3 text-left max-w-md mx-auto">
            <p v-if="hasExistingWallet" class="text-warning font-medium">
              You already have a wallet. Restoring will replace your current
              wallet. Make sure you have backed up your current seed phrase!
            </p>
            <div class="flex justify-center py-4">
              <UButton color="warning" @click="navigateTo('/settings/backup')">
                Go to Backup
              </UButton>
            </div>

            <p>
              You will need your 12 or 24 word seed phrase to restore your
              wallet.
            </p>

            <p>
              <strong>Never share your seed phrase with anyone.</strong>
              Anyone with your seed phrase can spend your Lotus.
            </p>

            <p>
              Make sure you are in a private location where no one can see your
              screen.
            </p>
          </div>
        </div>

        <div class="flex gap-3 mt-4 justify-center">
          <!-- Go back in the historical navigation-->
          <UButton color="neutral" variant="outline" @click="router.go(-1)">
            Cancel
          </UButton>
          <UButton color="primary" @click="proceedFromWarning">
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

        <SettingsSeedPhraseInput placeholder="Paste your backup seed phrase here" v-model="seedPhrase"
          :word-count="wordCount" :is-valid="isValidSeedPhrase" :error="errorMessage" />
      </UiAppCard>

      <div class="flex gap-3 justify-center">
        <UButton color="neutral" variant="outline" @click="step = 'warning'">
          Back
        </UButton>
        <UButton color="primary" :disabled="!isValidSeedPhrase" @click="validateAndProceed">
          Continue
        </UButton>
      </div>
    </template>

    <!-- Step 3: Confirm -->
    <template v-else-if="step === 'confirm'">
      <UiAppCard>
        <div class="text-center py-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
            <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-error" />
          </div>

          <h3 class="text-lg font-semibold text-error mb-2">Confirm Restore</h3>

          <p class="text-sm text-muted mb-4">
            This will replace your current wallet with the restored wallet. This
            action cannot be undone.
          </p>

          <UFormField label="Type 'restore' to confirm">
            <UInput v-model="confirmText" placeholder="restore" class="text-center" />
          </UFormField>

          <UAlert v-if="errorMessage" color="error" icon="i-lucide-alert-circle" class="mt-4">
            <template #description>{{ errorMessage }}</template>
          </UAlert>
        </div>

        <div class="flex gap-3 mt-4 justify-center">
          <UButton color="neutral" variant="outline" class="flex-1" @click="step = 'input'">
            Back
          </UButton>
          <UButton color="error" class="flex-1" :disabled="confirmText.toLowerCase() !== 'restore'"
            :loading="isRestoring" @click="restoreWallet">
            Restore Wallet
          </UButton>
        </div>
      </UiAppCard>
    </template>

    <!-- Step 4: Success -->
    <template v-else-if="step === 'success'">
      <UiAppCard>
        <div class="text-center py-8">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-success" />
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
