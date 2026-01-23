<script setup lang="ts">
/**
 * Restore Wallet Modal Component
 *
 * Multi-step wizard for restoring a wallet from recovery phrase:
 * 1. Warning about replacing current wallet
 * 2. Enter 12-word recovery phrase (individual fields with validation)
 * 3. Confirm restoration
 * 4. Success/Error result
 */

const props = defineProps<{
  backPressed?: number // Counter that increments on each back button press
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const walletStore = useWalletStore()
const { isValidEnglishWord } = useMnemonic()

// Reset state on mount
onMounted(() => {
  step.value = 'warning'
  words.value = Array(12).fill('')
  restoreError.value = ''
})

// Register back handler for multi-stage navigation
onMounted(() => {
  registerBackHandler(() => {
    if (step.value === 'input') {
      step.value = 'warning'
      return false // Handled internally
    } else if (step.value === 'confirm') {
      step.value = 'input'
      return false // Handled internally
    } else if (step.value === 'error') {
      step.value = 'input'
      return false // Handled internally
    } else if (step.value === 'restoring' || step.value === 'success') {
      return true // Close modal
    } else {
      // On first step (warning), allow close
      return true
    }
  })
})

type Step = 'warning' | 'input' | 'confirm' | 'restoring' | 'success' | 'error'
interface ValidationResult {
  valid: boolean
  error?: string
}

const step = ref<Step>('warning')
const restoreError = ref('')

// 12 individual word inputs
const words = ref<string[]>(Array(12).fill(''))
const wordRefs = ref<(HTMLInputElement | null)[]>([])

// Computed phrase from words
const phraseFromWords = computed(() => {
  return words.value.map(w => w.trim().toLowerCase()).join(' ')
})

const filledWordCount = computed(() => {
  return words.value.filter(w => w.trim().length > 0).length
})

// uses utils/validation.ts to get specific error messages
const seedPhraseValidationResult = computed(() => {
  if (filledWordCount.value !== 12) return { valid: false }

  if (words.value.length !== 12) {
    return {
      valid: false,
      error: 'Must be 12 words',
    }
  }

  // Check for invalid words
  const invalidWordIndex = words.value.findIndex(w => !isValidEnglishWord(w))
  if (invalidWordIndex !== -1) {
    return { valid: false, error: `Word ${invalidWordIndex + 1} is invalid` }
  }

  return { valid: true }
})

const isValidPhrase = computed(() => {
  return seedPhraseValidationResult.value.valid
})

// Check if individual word might be valid (for visual feedback)
// We can't check individual words without the full wordlist,
// so we just check if it's non-empty and lowercase letters only
function isWordFormatValid(word: string): boolean {
  word = word.trim().toLowerCase()
  if (!word.trim()) return false
  if (/^[a-z]+$/.test(word)) {
    return isValidEnglishWord(word)
  }
  return false
}

// Handle input in a word field
function handleWordInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value.toLowerCase().trim()

  // Check if user pasted multiple words
  if (value.includes(' ')) {
    handlePaste(value, index)
    return
  }

  words.value[index] = value

  // Auto-advance if word looks complete (3+ chars and user pressed space or tab)
  // This is handled by keydown instead
}

// Handle paste - split phrase into individual fields
function handlePaste(pastedText: string, startIndex: number = 0) {
  const pastedWords = pastedText
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0)

  // Fill words starting from startIndex
  pastedWords.forEach((word, i) => {
    const targetIndex = startIndex + i
    if (targetIndex < 12) {
      words.value[targetIndex] = word
    }
  })

  // Focus the next empty field or the last filled field
  const nextEmptyIndex = words.value.findIndex((w, i) => i >= startIndex && !w.trim())
  const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(startIndex + pastedWords.length, 11)
  nextTick(() => {
    wordRefs.value[focusIndex]?.focus()
  })
}

// Handle keydown for navigation and auto-advance
function handleKeydown(index: number, event: KeyboardEvent) {
  const currentWord = words.value[index].trim()

  // Space or Tab with content - advance to next field
  if ((event.key === ' ' || event.key === 'Tab') && currentWord && index < 11) {
    if (event.key === ' ') {
      event.preventDefault()
      wordRefs.value[index + 1]?.focus()
    }
    // Tab will naturally advance
    return
  }

  // Backspace on empty field - go to previous
  if (event.key === 'Backspace' && !currentWord && index > 0) {
    event.preventDefault()
    wordRefs.value[index - 1]?.focus()
    return
  }

  // Arrow keys for navigation
  if (event.key === 'ArrowLeft' && index > 0) {
    const input = event.target as HTMLInputElement
    if (input.selectionStart === 0) {
      event.preventDefault()
      wordRefs.value[index - 1]?.focus()
    }
  }

  if (event.key === 'ArrowRight' && index < 11) {
    const input = event.target as HTMLInputElement
    if (input.selectionStart === input.value.length) {
      event.preventDefault()
      wordRefs.value[index + 1]?.focus()
    }
  }

  if (event.key === 'ArrowUp' && index >= 3) {
    event.preventDefault()
    wordRefs.value[index - 3]?.focus()
  }

  if (event.key === 'ArrowDown' && index < 9) {
    event.preventDefault()
    wordRefs.value[index + 3]?.focus()
  }
}

// Handle paste event on input
function handlePasteEvent(index: number, event: ClipboardEvent) {
  const pastedText = event.clipboardData?.getData('text') || ''
  if (pastedText.includes(' ')) {
    event.preventDefault()
    handlePaste(pastedText, index)
  }
}

function clearAllWords() {
  words.value = Array(12).fill('')
  nextTick(() => {
    wordRefs.value[0]?.focus()
  })
}

function proceedToConfirm() {
  if (isValidPhrase.value) {
    step.value = 'confirm'
  }
}

async function restoreWallet() {
  step.value = 'restoring'
  restoreError.value = ''

  try {
    await walletStore.restoreWallet(phraseFromWords.value)
    step.value = 'success'
  } catch (error) {
    restoreError.value = error instanceof Error ? error.message : 'Failed to restore wallet'
    step.value = 'error'
  }
}

function close() {
  emit('close')
}

function reloadApp() {
  window.location.href = '/'
}

// Focus first input when entering input step
watch(step, (newStep) => {
  if (newStep === 'input') {
    nextTick(() => {
      wordRefs.value[0]?.focus()
    })
  }
})
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <!-- Step 1: Warning -->
      <div v-if="step === 'warning'" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Restore Wallet</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-warning" />
          </div>
          <p class="text-gray-500">
            Restoring a wallet will replace your current wallet. Make sure you have backed up your current recovery
            phrase first.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-error/10 border border-error/20 space-y-2">
          <div class="flex gap-2">
            <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-error flex-shrink-0" />
            <div class="text-sm">
              <p class="font-medium text-error">Warning</p>
              <ul class="list-disc list-inside text-gray-500 mt-1 space-y-1">
                <li>Your current wallet will be replaced</li>
                <li>All local data will be cleared</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        <UButton color="primary" block @click="step = 'input'">
          I Understand, Continue
        </UButton>
      </div>

      <!-- Step 2: Enter Phrase (12 individual fields) -->
      <div v-else-if="step === 'input'" class="p-6 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'warning'" />
          <h2 class="text-lg font-semibold">Enter Recovery Phrase</h2>
        </div>

        <p class="text-sm text-gray-500">
          Enter your 12-word recovery phrase. You can paste the entire phrase or type each word.
        </p>

        <!-- 12 Word Grid -->
        <div class="grid grid-cols-3 gap-2">
          <div v-for="(_, index) in 12" :key="index" class="relative">
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono w-4">
              {{ index + 1 }}
            </span>
            <input :ref="(el) => wordRefs[index] = el as HTMLInputElement" v-model="words[index]" type="text"
              autocomplete="off" autocapitalize="off" spellcheck="false"
              class="w-full pl-7 pr-2 py-2 text-sm font-mono rounded-lg border transition-colors" :class="[
                words[index].trim()
                  ? isWordFormatValid(words[index])
                    ? 'border-success/50 bg-success/5'
                    : 'border-error/50 bg-error/5'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              ]" placeholder="word" @input="handleWordInput(index, $event)" @keydown="handleKeydown(index, $event)"
              @paste="handlePasteEvent(index, $event)" />
          </div>
        </div>

        <!-- Status and Clear -->
        <div class="flex justify-between items-center text-xs">
          <div class="flex items-center gap-3">
            <span class="text-gray-400">
              {{ filledWordCount }}/12 words
            </span>
            <span v-if="isValidPhrase" class="text-success flex items-center gap-1">
              <UIcon name="i-lucide-check" class="w-3 h-3" />
              Valid phrase
            </span>
            <span v-else-if="filledWordCount === 12" class="text-error flex items-center gap-1">
              <UIcon name="i-lucide-x" class="w-3 h-3" />
              {{ seedPhraseValidationResult.error }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <button v-if="filledWordCount > 0" type="button"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="clearAllWords">
              Clear all
            </button>
          </div>
        </div>

        <UButton color="primary" block :disabled="!isValidPhrase" @click="proceedToConfirm">
          Continue
        </UButton>
      </div>

      <!-- Step 3: Confirm -->
      <div v-else-if="step === 'confirm'" class="p-6 space-y-4">
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="step = 'input'" />
          <h2 class="text-lg font-semibold">Confirm Restore</h2>
        </div>

        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-key" class="w-8 h-8 text-primary" />
          </div>
          <p class="text-gray-500">
            You're about to restore a wallet using the recovery phrase you entered.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
          <p class="text-sm text-gray-500 mb-2">Recovery phrase preview:</p>
          <p class="font-mono text-sm">
            {{ words.slice(0, 3).join(' ') }} ... {{ words.slice(-2).join(' ') }}
          </p>
        </div>

        <div class="flex gap-2">
          <UButton variant="outline" class="flex-1" @click="step = 'input'">
            Back
          </UButton>
          <UButton color="primary" class="flex-1" @click="restoreWallet">
            Restore Wallet
          </UButton>
        </div>
      </div>

      <!-- Step 4: Restoring -->
      <div v-else-if="step === 'restoring'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Restoring Wallet...</h2>
          <p class="text-gray-500 mt-2">
            Please wait while your wallet is being restored.
          </p>
        </div>
      </div>

      <!-- Step 5: Success -->
      <div v-else-if="step === 'success'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Wallet Restored!</h2>
          <p class="text-gray-500 mt-2">
            Your wallet has been successfully restored. The app will reload to complete the process.
          </p>
        </div>

        <UButton color="primary" block @click="reloadApp">
          Reload App
        </UButton>
      </div>

      <!-- Step 6: Error -->
      <div v-else-if="step === 'error'" class="p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-x" class="w-8 h-8 text-error" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Restore Failed</h2>
          <p class="text-gray-500 mt-2">
            {{ restoreError }}
          </p>
        </div>

        <div class="flex gap-2">
          <UButton variant="outline" class="flex-1" @click="step = 'input'">
            Try Again
          </UButton>
          <UButton color="primary" class="flex-1" @click="close">
            Close
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
