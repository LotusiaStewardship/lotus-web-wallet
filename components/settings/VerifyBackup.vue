<script setup lang="ts">
/**
 * SettingsVerifyBackup
 *
 * Backup verification form.
 */
const props = defineProps<{
  /** Seed phrase words for verification */
  seedWords: string[]
}>()

const emit = defineEmits<{
  verified: []
}>()

const { success, error } = useNotifications()

// Generate random verification indices (3 random words)
const verificationIndices = ref<number[]>([])
const verificationInputs = ref<string[]>(['', '', ''])

// Generate indices on mount
onMounted(() => {
  generateIndices()
})

function generateIndices() {
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * props.seedWords.length)
    if (!indices.includes(idx)) {
      indices.push(idx)
    }
  }
  verificationIndices.value = indices.sort((a, b) => a - b)
  verificationInputs.value = ['', '', '']
}

const canVerify = computed(() =>
  verificationInputs.value.every(v => v.trim().length > 0),
)

function getInputColor(index: number): 'neutral' | 'success' | 'error' {
  const input = verificationInputs.value[index].trim().toLowerCase()
  if (!input) return 'neutral'
  const expected = props.seedWords[verificationIndices.value[index]]?.toLowerCase()
  return input === expected ? 'success' : 'error'
}

function handleVerify() {
  const allCorrect = verificationIndices.value.every((wordIndex, i) => {
    const input = verificationInputs.value[i].trim().toLowerCase()
    const expected = props.seedWords[wordIndex]?.toLowerCase()
    return input === expected
  })

  if (allCorrect) {
    success('Backup Verified', 'Your seed phrase has been verified')
    emit('verified')
  } else {
    error('Verification Failed', 'One or more words are incorrect')
    // Reset inputs but keep indices
    verificationInputs.value = ['', '', '']
  }
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Confirm you've saved your seed phrase by entering the words below.
    </p>

    <UFormField v-for="(wordIndex, i) in verificationIndices" :key="i" :label="`Word #${wordIndex + 1}`">
      <UInput v-model="verificationInputs[i]" placeholder="Enter word" :color="getInputColor(i)" autocomplete="off"
        autocapitalize="off" spellcheck="false" />
    </UFormField>

    <UButton color="primary" block :disabled="!canVerify" @click="handleVerify">
      Verify Backup
    </UButton>
  </div>
</template>
