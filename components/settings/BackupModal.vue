<script setup lang="ts">
/**
 * Backup Modal Component
 *
 * Multi-step wizard for backing up the recovery phrase:
 * 1. Warning about importance
 * 2. Show the 12-word phrase
 * 3. Verify by entering a random word
 * 4. Success confirmation
 */
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'
import { registerBackHandler } from '~/composables/useOverlays'

const props = defineProps<{
  backPressed?: number // Counter that increments on each back button press
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()

// Reset state on mount
onMounted(() => {
  step.value = 'warning'
  verifyInput.value = ''
  verifyError.value = ''
  verifyWordIndex.value = Math.floor(Math.random() * 12)
})

// Register back handler for multi-stage navigation
onMounted(() => {
  registerBackHandler(() => {
    if (step.value === 'phrase') {
      step.value = 'warning'
      return false // Handled internally
    } else if (step.value === 'verify') {
      step.value = 'phrase'
      return false // Handled internally
    } else if (step.value === 'success') {
      return true // Close modal
    } else {
      // On first step (warning), allow close
      return true
    }
  })
})

type Step = 'warning' | 'phrase' | 'verify' | 'success'

const step = ref<Step>('warning')
const verifyInput = ref('')
const verifyError = ref('')
const verifyWordIndex = ref(0)

const phraseWords = computed(() => {
  const phrase = walletStore.getMnemonic()
  return phrase?.split(' ') || []
})


function verifyWord() {
  const correctWord = phraseWords.value[verifyWordIndex.value]
  if (verifyInput.value.toLowerCase().trim() === correctWord?.toLowerCase()) {
    onboardingStore.markBackupComplete()
    step.value = 'success'
  } else {
    verifyError.value = 'Incorrect word. Please try again.'
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <!-- Step 1: Warning -->
      <div v-if="step === 'warning'" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Backup Your Wallet</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-shield-alert" class="w-8 h-8 text-warning" />
          </div>
          <p class="text-gray-500">
            Your recovery phrase is the only way to restore your wallet if you lose access.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-warning/10 border border-warning/20 space-y-2">
          <div class="flex gap-2">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-warning flex-shrink-0" />
            <div class="text-sm">
              <p class="font-medium">Important</p>
              <ul class="list-disc list-inside text-gray-500 mt-1 space-y-1">
                <li>Write down your phrase on paper</li>
                <li>Never share it with anyone</li>
                <li>Never store it digitally</li>
                <li>Keep it in a safe place</li>
              </ul>
            </div>
          </div>
        </div>

        <UButton color="primary" block @click="step = 'phrase'">
          I Understand, Show Phrase
        </UButton>
      </div>

      <!-- Step 2: Show Phrase -->
      <div v-else-if="step === 'phrase'" class="p-6 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'warning'" />
          <h2 class="text-lg font-semibold">Recovery Phrase</h2>
        </div>

        <p class="text-sm text-gray-500">
          Write down these 12 words in order. You'll need them to restore your wallet.
        </p>

        <div class="grid grid-cols-3 gap-2 p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
          <div v-for="(word, index) in phraseWords" :key="index"
            class="flex items-center gap-2 p-2 rounded bg-white dark:bg-gray-900">
            <span class="text-xs text-gray-400 w-4">{{ index + 1 }}</span>
            <span class="font-mono text-sm">{{ word }}</span>
          </div>
        </div>

        <UButton color="primary" block @click="step = 'verify'">
          I've Written It Down
        </UButton>
      </div>

      <!-- Step 3: Verify -->
      <div v-else-if="step === 'verify'" class="p-6 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'phrase'" />
          <h2 class="text-lg font-semibold">Verify Backup</h2>
        </div>

        <p class="text-sm text-gray-500">
          Enter word #{{ verifyWordIndex + 1 }} from your recovery phrase:
        </p>

        <FormInput v-model="verifyInput" placeholder="Enter word..." autofocus :error="verifyError || undefined"
          @keyup.enter="verifyWord" />

        <UButton color="primary" block :disabled="!verifyInput.trim()" @click="verifyWord">
          Verify
        </UButton>
      </div>

      <!-- Step 4: Success -->
      <div v-else-if="step === 'success'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Backup Complete!</h2>
          <p class="text-gray-500 mt-2">
            Your wallet is now backed up. Keep your recovery phrase safe.
          </p>
        </div>

        <UButton color="primary" block @click="close">Done</UButton>
      </div>
    </template>
  </USlideover>
</template>
