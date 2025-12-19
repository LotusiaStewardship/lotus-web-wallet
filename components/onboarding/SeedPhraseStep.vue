<script setup lang="ts">
/**
 * OnboardingSeedPhraseStep
 *
 * Seed phrase display step of the onboarding flow.
 */
const props = defineProps<{
  /** Seed phrase words */
  words: string[]
}>()

const emit = defineEmits<{
  continue: []
}>()
</script>

<template>
  <div class="py-4">
    <p class="text-muted mb-6 text-center">
      Write down these 12 words in order
    </p>

    <div class="grid grid-cols-3 gap-3 mb-6">
      <div v-for="(word, index) in words" :key="index" class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <span class="text-xs text-muted w-5">{{ index + 1 }}.</span>
        <span class="font-mono font-medium">{{ word }}</span>
      </div>
    </div>

    <UAlert color="warning" icon="i-lucide-eye-off" class="mb-6">
      <template #description>
        Make sure no one is watching your screen
      </template>
    </UAlert>

    <UButton block color="primary" @click="emit('continue')">
      I've Written It Down
    </UButton>
  </div>
</template>
