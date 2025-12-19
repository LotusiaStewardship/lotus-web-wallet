<script setup lang="ts">
/**
 * OnboardingModal
 *
 * First-time user onboarding flow modal.
 */
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const { success, error } = useNotifications()

// State
const restoreMode = ref(false)
const mnemonicInput = ref('')
const seedWords = ref<string[]>([])
const verificationInputs = ref(['', '', ''])
const verificationIndices = ref<number[]>([])
const isCreating = ref(false)
const isRestoring = ref(false)

// Modal open state
const open = computed(() => onboardingStore.shouldShowOnboarding)

// Current step (with fallback to 'welcome')
const currentStep = computed(() => onboardingStore.currentStep || 'welcome')

// Ensure currentStep is set when modal opens
watch(open, (isOpen) => {
  if (isOpen && !onboardingStore.currentStep) {
    onboardingStore.goToStep('welcome')
  }
}, { immediate: true })

// Generate verification indices when showing verify step
watch(
  () => onboardingStore.currentStep,
  step => {
    if (step === 'verify_backup') {
      generateVerificationIndices()
    }
  },
)

function generateVerificationIndices() {
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * 12)
    if (!indices.includes(idx)) indices.push(idx)
  }
  verificationIndices.value = indices.sort((a, b) => a - b)
  verificationInputs.value = ['', '', '']
}

// Actions
async function createWallet() {
  isCreating.value = true
  try {
    await walletStore.createNewWallet()
    seedWords.value = walletStore.getMnemonic?.()?.split(' ') || []
    onboardingStore.completeStep('welcome')
  } catch (e: any) {
    error('Creation Failed', e.message)
  } finally {
    isCreating.value = false
  }
}

function startRestore() {
  restoreMode.value = true
}

function cancelRestore() {
  restoreMode.value = false
  mnemonicInput.value = ''
}

async function restoreWallet() {
  if (!mnemonicInput.value.trim()) return

  isRestoring.value = true
  try {
    await walletStore.restoreWallet(mnemonicInput.value.trim())
    onboardingStore.markBackupComplete() // Already has backup
    // Skip backup steps since restoring means they have the phrase
    onboardingStore.completeStep('welcome')
    onboardingStore.completeStep('create_or_restore')
    onboardingStore.completeStep('backup_seed')
    onboardingStore.completeStep('verify_backup')
    success('Wallet Restored', 'Your wallet has been restored successfully')
  } catch (e: any) {
    error('Restore Failed', e.message)
  } finally {
    isRestoring.value = false
  }
}

function proceedToBackup() {
  onboardingStore.completeStep('create_or_restore')
}

function skipBackup() {
  onboardingStore.skipStep('backup_seed')
  onboardingStore.skipStep('verify_backup')
}

function proceedToVerify() {
  onboardingStore.completeStep('backup_seed')
}

function verifyBackup() {
  const allCorrect = verificationIndices.value.every((wordIndex, i) => {
    const input = verificationInputs.value[i].trim().toLowerCase()
    const expected = seedWords.value[wordIndex]?.toLowerCase()
    return input === expected
  })

  if (allCorrect) {
    onboardingStore.markBackupComplete()
    onboardingStore.completeStep('verify_backup')
    success('Backup Verified!', 'Your wallet is now secured')
  } else {
    error('Incorrect', 'Please check your words and try again')
    verificationInputs.value = ['', '', '']
  }
}

function finishTour() {
  onboardingStore.completeStep('quick_tour')
}

// Feature cards for tour
const features = [
  { icon: 'i-lucide-send', title: 'Send', description: 'Send XPI to anyone' },
  { icon: 'i-lucide-qr-code', title: 'Receive', description: 'Get your address' },
  { icon: 'i-lucide-globe', title: 'P2P Network', description: 'Connect with others' },
  { icon: 'i-lucide-trophy', title: 'Social', description: 'Vote on profiles' },
]
</script>

<template>
  <UModal v-model:open="open" :prevent-close="true" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <!-- Welcome Step Content -->
      <div v-if="currentStep === 'welcome'" class="text-center py-8 px-4">
        <div
          class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <span class="text-4xl">🪷</span>
        </div>

        <h1 class="text-2xl font-bold mb-2">Welcome to Lotus Wallet</h1>
        <p class="text-muted mb-8">
          A secure, private wallet for the Lotus network
        </p>

        <div v-if="!restoreMode" class="space-y-3">
          <UButton block color="primary" size="lg" :loading="isCreating" @click="createWallet">
            Create New Wallet
          </UButton>
          <UButton block color="neutral" variant="outline" size="lg" @click="startRestore">
            Restore Existing Wallet
          </UButton>
        </div>

        <!-- Restore Form -->
        <div v-else class="text-left">
          <h3 class="font-semibold mb-4">Enter your 12-word seed phrase</h3>
          <UTextarea v-model="mnemonicInput" placeholder="word1 word2 word3 ..." :rows="3" class="mb-4"
            autocomplete="off" autocapitalize="off" spellcheck="false" />
          <div class="flex gap-3">
            <UButton color="neutral" variant="outline" @click="cancelRestore">
              Cancel
            </UButton>
            <UButton color="primary" :disabled="!mnemonicInput.trim()" :loading="isRestoring" @click="restoreWallet">
              Restore Wallet
            </UButton>
          </div>
        </div>
      </div>

      <!-- Backup Prompt Step Content -->
      <div v-else-if="currentStep === 'create_or_restore'" class="py-4 px-4">
        <div class="text-center mb-6">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
            <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-warning" />
          </div>
          <p class="text-muted">
            Your 12-word seed phrase is the <strong>only way</strong> to recover
            your wallet if you lose access to this device.
          </p>
        </div>

        <UAlert color="error" icon="i-lucide-shield-alert" class="mb-6">
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

      <!-- Show Seed Phrase Step Content -->
      <div v-else-if="currentStep === 'backup_seed'" class="py-4 px-4">
        <p class="text-muted mb-6 text-center">
          Write down these 12 words in order
        </p>

        <div class="grid grid-cols-3 gap-3 mb-6">
          <div v-for="(word, index) in seedWords" :key="index"
            class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <span class="text-xs text-muted w-5">{{ index + 1 }}.</span>
            <span class="font-mono font-medium">{{ word }}</span>
          </div>
        </div>

        <UAlert color="warning" icon="i-lucide-eye-off" class="mb-6">
          <template #description>
            Make sure no one is watching your screen
          </template>
        </UAlert>

        <UButton block color="primary" @click="proceedToVerify">
          I've Written It Down
        </UButton>
      </div>

      <!-- Verify Backup Step Content -->
      <div v-else-if="currentStep === 'verify_backup'" class="py-4 px-4">
        <p class="text-muted mb-6 text-center">
          Enter the requested words to confirm you've saved your seed phrase
        </p>

        <div class="space-y-4 mb-6">
          <UFormField v-for="(wordIndex, i) in verificationIndices" :key="i" :label="`Word #${wordIndex + 1}`">
            <UInput v-model="verificationInputs[i]" placeholder="Enter word" autocomplete="off" autocapitalize="off"
              spellcheck="false" />
          </UFormField>
        </div>

        <UButton block color="primary" :disabled="!verificationInputs.every(v => v.trim())" @click="verifyBackup">
          Verify
        </UButton>
      </div>

      <!-- Quick Tour Step Content -->
      <div v-else-if="currentStep === 'quick_tour'" class="py-4 px-4">
        <p class="text-muted mb-6 text-center">
          Here's what you can do with Lotus Wallet
        </p>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div v-for="feature in features" :key="feature.title" class="p-4 bg-muted/50 rounded-lg text-center">
            <UIcon :name="feature.icon" class="w-8 h-8 text-primary mx-auto mb-2" />
            <p class="font-medium">{{ feature.title }}</p>
            <p class="text-xs text-muted">{{ feature.description }}</p>
          </div>
        </div>

        <UButton block color="primary" size="lg" @click="finishTour">
          Start Using Wallet
        </UButton>
      </div>
    </template>
  </UModal>
</template>
