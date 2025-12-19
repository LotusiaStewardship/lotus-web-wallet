<script setup lang="ts">
/**
 * OnboardingVerifyStep
 *
 * Backup verification step of the onboarding flow.
 */
const props = defineProps<{
  /** Seed phrase words for verification */
  seedWords: string[]
}>()

const emit = defineEmits<{
  verified: []
}>()

const { success, error } = useNotifications()

// State
const verificationInputs = ref(['', '', ''])
const verificationIndices = ref<number[]>([])

// Generate random indices on mount
onMounted(() => {
  generateIndices()
})

function generateIndices() {
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * props.seedWords.length)
    if (!indices.includes(idx)) indices.push(idx)
  }
  verificationIndices.value = indices.sort((a, b) => a - b)
  verificationInputs.value = ['', '', '']
}

const canVerify = computed(() =>
  verificationInputs.value.every(v => v.trim().length > 0),
)

function handleVerify() {
  const allCorrect = verificationIndices.value.every((wordIndex, i) => {
    const input = verificationInputs.value[i].trim().toLowerCase()
    const expected = props.seedWords[wordIndex]?.toLowerCase()
    return input === expected
  })

  if (allCorrect) {
    success('Backup Verified!', 'Your wallet is now secured')
    emit('verified')
  } else {
    error('Incorrect', 'Please check your words and try again')
    verificationInputs.value = ['', '', '']
  }
}
</script>

<template>
  <div class="py-4">
    <p class="text-muted mb-6 text-center">
      Enter the requested words to confirm you've saved your seed phrase
    </p>

    <div class="space-y-4 mb-6">
      <UFormField v-for="(wordIndex, i) in verificationIndices" :key="i" :label="`Word #${wordIndex + 1}`">
        <UInput v-model="verificationInputs[i]" placeholder="Enter word" autocomplete="off" autocapitalize="off"
          spellcheck="false" />
      </UFormField>
    </div>

    <UButton block color="primary" :disabled="!canVerify" @click="handleVerify">
      Verify
    </UButton>
  </div>
</template>
