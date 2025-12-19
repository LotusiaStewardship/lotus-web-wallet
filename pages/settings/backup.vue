<script setup lang="ts">
/**
 * Backup Settings Page
 *
 * View and verify seed phrase backup.
 */
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'

definePageMeta({
  title: 'Backup',
})

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const { success } = useNotifications()

// State
const showSeedPhrase = ref(false)
const verificationMode = ref(false)
const verificationIndices = ref<number[]>([])
const verificationInputs = ref<string[]>(['', '', ''])

// Get seed phrase words
const seedWords = computed(() => {
  const mnemonic = walletStore.getMnemonic?.()
  return mnemonic ? mnemonic.split(' ') : []
})

// Toggle seed phrase visibility
function toggleSeedPhrase() {
  showSeedPhrase.value = !showSeedPhrase.value
}

// Start verification
function startVerification() {
  // Pick 3 random indices
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * 12)
    if (!indices.includes(idx)) indices.push(idx)
  }
  verificationIndices.value = indices.sort((a, b) => a - b)
  verificationInputs.value = ['', '', '']
  verificationMode.value = true
}

// Verify backup
function verifyBackup() {
  const allCorrect = verificationIndices.value.every((wordIndex, i) => {
    const input = verificationInputs.value[i].trim().toLowerCase()
    const expected = seedWords.value[wordIndex]?.toLowerCase()
    return input === expected
  })

  if (allCorrect) {
    onboardingStore.markBackupComplete()
    success('Backup Verified!', 'Your wallet backup has been confirmed')
    verificationMode.value = false
  } else {
    // Show error
  }
}

// Cancel verification
function cancelVerification() {
  verificationMode.value = false
  verificationInputs.value = ['', '', '']
}
</script>

<template>
  <div class="space-y-4">
    <!-- Backup Status -->
    <UiAppCard>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          :class="onboardingStore.backupComplete ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'">
          <UIcon :name="onboardingStore.backupComplete ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
            class="w-6 h-6" :class="onboardingStore.backupComplete ? 'text-green-600' : 'text-yellow-600'" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold">
            {{ onboardingStore.backupComplete ? 'Backup Verified' : 'Backup Not Verified' }}
          </div>
          <div class="text-sm text-muted">
            {{ onboardingStore.backupComplete
              ? 'Your seed phrase has been verified'
              : 'Verify your backup to secure your wallet'
            }}
          </div>
        </div>
      </div>
    </UiAppCard>

    <!-- Seed Phrase Card (when not in verification mode) -->
    <UiAppCard v-if="!verificationMode" title="Seed Phrase" icon="i-lucide-key">
      <UAlert color="warning" icon="i-lucide-alert-triangle" class="mb-4">
        <template #description>
          Never share your seed phrase. Anyone with these words can access your funds.
        </template>
      </UAlert>

      <!-- Hidden state -->
      <div v-if="!showSeedPhrase" class="text-center py-6">
        <UIcon name="i-lucide-eye-off" class="w-12 h-12 mx-auto mb-3 text-muted" />
        <p class="text-muted mb-4">Your seed phrase is hidden for security</p>
        <UButton color="primary" @click="toggleSeedPhrase">
          Reveal Seed Phrase
        </UButton>
      </div>

      <!-- Visible state -->
      <div v-else>
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div v-for="(word, index) in seedWords" :key="index"
            class="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span class="text-xs text-muted w-5">{{ index + 1 }}.</span>
            <span class="font-mono font-medium text-sm">{{ word }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <UButton color="neutral" variant="outline" @click="toggleSeedPhrase">
            Hide
          </UButton>
          <UButton v-if="!onboardingStore.backupComplete" color="primary" @click="startVerification">
            Verify Backup
          </UButton>
        </div>
      </div>
    </UiAppCard>

    <!-- Verification Mode -->
    <UiAppCard v-else title="Verify Your Backup" icon="i-lucide-check-circle">
      <p class="text-muted mb-4">
        Enter the following words from your seed phrase to confirm you've saved it.
      </p>

      <div class="space-y-3 mb-4">
        <UFormField v-for="(wordIndex, i) in verificationIndices" :key="i" :label="`Word #${wordIndex + 1}`">
          <UInput v-model="verificationInputs[i]" placeholder="Enter word" autocomplete="off" autocapitalize="off"
            spellcheck="false" />
        </UFormField>
      </div>

      <div class="flex gap-3">
        <UButton color="neutral" variant="outline" @click="cancelVerification">
          Cancel
        </UButton>
        <UButton color="primary" :disabled="!verificationInputs.every(v => v.trim())" @click="verifyBackup">
          Verify
        </UButton>
      </div>
    </UiAppCard>

    <!-- Tips -->
    <UiAppCard title="Backup Tips" icon="i-lucide-lightbulb">
      <ul class="space-y-2 text-sm text-muted">
        <li class="flex items-start gap-2">
          <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>Write down your seed phrase on paper</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>Store it in a safe, secure location</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>Never store it digitally or take screenshots</span>
        </li>
        <li class="flex items-start gap-2">
          <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>Consider using a metal backup for fire/water protection</span>
        </li>
      </ul>
    </UiAppCard>
  </div>
</template>
