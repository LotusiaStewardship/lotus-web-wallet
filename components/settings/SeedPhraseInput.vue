<script setup lang="ts">
/**
 * SettingsSeedPhraseInput
 *
 * Input component for entering a seed phrase with validation feedback.
 */
const props = defineProps<{
  /** v-model for the seed phrase input */
  modelValue: string
  /** Number of words entered */
  wordCount: number
  /** Whether the seed phrase is valid */
  isValid: boolean
  /** Placeholder text */
  placeholder?: string
  /** Number of rows for textarea */
  rows?: number
  /** Error message to display */
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const showValidation = computed(() => props.wordCount >= 12)
</script>

<template>
  <div>
    <UTextarea v-model="inputValue"
      :placeholder="placeholder || 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12'"
      :rows="rows || 4" class="font-mono w-full" autocomplete="off" autocapitalize="off" spellcheck="false" />

    <div class="flex items-center justify-between mt-3">
      <span class="text-xs text-muted">
        {{ wordCount }} words entered
      </span>
      <UBadge v-if="showValidation" :color="isValid ? 'success' : 'error'">
        {{ isValid ? 'Valid' : 'Invalid' }}
      </UBadge>
    </div>

    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" class="mt-4">
      <template #description>{{ error }}</template>
    </UAlert>
  </div>
</template>
