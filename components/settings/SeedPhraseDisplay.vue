<script setup lang="ts">
/**
 * SettingsSeedPhraseDisplay
 *
 * Display for seed phrase words.
 */
const props = defineProps<{
  /** Seed phrase words */
  words: string[]
  /** Whether to blur/hide words */
  hidden?: boolean
}>()

const emit = defineEmits<{
  copy: []
  toggle: []
}>()

const { copy } = useClipboard()

function copyPhrase() {
  copy(props.words.join(' '), 'Seed phrase copied')
  emit('copy')
}
</script>

<template>
  <div>
    <!-- Words Grid -->
    <div class="grid grid-cols-3 gap-3 mb-4" :class="{ 'blur-sm select-none': hidden }">
      <div v-for="(word, index) in words" :key="index" class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <span class="text-xs text-muted w-5">{{ index + 1 }}.</span>
        <span class="font-mono font-medium">{{ word }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <UButton color="neutral" variant="outline" icon="i-lucide-copy" :disabled="hidden" @click="copyPhrase">
        Copy
      </UButton>
      <UButton color="neutral" variant="outline" :icon="hidden ? 'i-lucide-eye' : 'i-lucide-eye-off'"
        @click="emit('toggle')">
        {{ hidden ? 'Show' : 'Hide' }}
      </UButton>
    </div>
  </div>
</template>
