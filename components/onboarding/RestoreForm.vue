<script setup lang="ts">
/**
 * OnboardingRestoreForm
 *
 * Wallet restore form for the onboarding flow.
 */
import { useSeedPhrase } from '~/composables/useSeedPhrase'

const props = defineProps<{
  /** Loading state */
  loading?: boolean
}>()

const emit = defineEmits<{
  restore: [mnemonic: string]
  cancel: []
}>()

const { input: mnemonicInput, words, wordCount, isValid } = useSeedPhrase()

function handleRestore() {
  if (isValid.value) {
    emit('restore', words.value.join(' '))
  }
}
</script>

<template>
  <div class="py-4">
    <h3 class="font-semibold mb-2">Enter your 12-word seed phrase</h3>
    <p class="text-sm text-muted mb-4">
      Enter the words separated by spaces
    </p>

    <UTextarea v-model="mnemonicInput"
      placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12" :rows="3"
      class="mb-2 font-mono" autocomplete="off" autocapitalize="off" spellcheck="false" />

    <p class="text-xs text-muted mb-4">
      Words entered: {{ wordCount }}/12
      <span v-if="wordCount > 0 && wordCount !== 12" class="text-warning">
        (need exactly 12 words)
      </span>
    </p>

    <div class="flex gap-3">
      <UButton color="neutral" variant="outline" :disabled="loading" @click="emit('cancel')">
        Cancel
      </UButton>
      <UButton color="primary" :disabled="!isValid" :loading="loading" @click="handleRestore">
        Restore Wallet
      </UButton>
    </div>
  </div>
</template>
