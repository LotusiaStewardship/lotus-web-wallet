<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Restore Wallet',
})

const walletStore = useWalletStore()
const toast = useToast()
const router = useRouter()

// Form state
const seedPhrase = ref('')
const confirmed = ref(false)
const restoring = ref(false)

// Validation
const wordCount = computed(() => {
  if (!seedPhrase.value.trim()) return 0
  return seedPhrase.value.trim().split(/\s+/).length
})

const isValidWordCount = computed(() => {
  return wordCount.value === 12 || wordCount.value === 24
})

const isValidSeedPhrase = computed(() => {
  if (!walletStore.initialized) return null // SDK not loaded yet
  if (!isValidWordCount.value) return false
  return walletStore.isValidSeedPhrase(seedPhrase.value.trim())
})

const canRestore = computed(() => {
  return isValidSeedPhrase.value === true && confirmed.value && !restoring.value
})

// Restore wallet
const restoreWallet = async () => {
  if (!canRestore.value) return

  restoring.value = true

  try {
    await walletStore.restoreWallet(seedPhrase.value.trim())

    toast.add({
      title: 'Wallet Restored',
      description: 'Your wallet has been successfully restored',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    // Navigate to home
    router.push('/')
  } catch (err) {
    toast.add({
      title: 'Restore Failed',
      description: err instanceof Error ? err.message : 'Failed to restore wallet',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    restoring.value = false
  }
}

// Clear form
const clearForm = () => {
  seedPhrase.value = ''
  confirmed.value = false
}
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <NuxtLink to="/settings" class="text-sm text-muted hover:text-foreground flex items-center gap-1 mb-4">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-2xl font-bold">Restore Wallet</h1>
      <p class="text-muted">Enter your seed phrase to restore an existing wallet</p>
    </div>

    <!-- Warning -->
    <UAlert color="error" variant="subtle" icon="i-lucide-alert-triangle">
      <template #title>Warning: This will replace your current wallet</template>
      <template #description>
        Make sure you have backed up your current wallet's seed phrase before restoring.
        This action cannot be undone.
      </template>
    </UAlert>

    <!-- Restore Form -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-upload" class="w-5 h-5" />
          <span class="font-semibold">Enter Seed Phrase</span>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Seed Phrase Input -->
        <UFormField label="Seed Phrase" required>
          <UTextarea v-model="seedPhrase" placeholder="Enter your 12 or 24 word seed phrase..." :rows="4"
            class="font-mono" :color="seedPhrase && isValidSeedPhrase === false ? 'error' : undefined" />
          <template #hint>
            <div class="flex justify-between">
              <span :class="{ 'text-error-500': seedPhrase && !isValidWordCount }">
                {{ wordCount }} / {{ wordCount > 12 ? 24 : 12 }} words
              </span>
              <span v-if="isValidSeedPhrase === null && seedPhrase && isValidWordCount" class="text-muted">
                Validating...
              </span>
              <span v-else-if="seedPhrase && isValidWordCount && isValidSeedPhrase === false" class="text-error-500">
                Invalid seed phrase
              </span>
              <span v-else-if="isValidSeedPhrase === true" class="text-success-500">
                Valid seed phrase
              </span>
            </div>
          </template>
        </UFormField>

        <!-- Confirmation Checkbox -->
        <div class="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <UCheckbox v-model="confirmed" :disabled="isValidSeedPhrase !== true" />
          <div class="text-sm">
            <p class="font-medium">I understand that:</p>
            <ul class="list-disc list-inside text-muted mt-1 space-y-1">
              <li>My current wallet will be replaced</li>
              <li>I have backed up my current seed phrase</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <UButton block color="primary" :loading="restoring" :disabled="!canRestore" icon="i-lucide-upload"
            @click="restoreWallet">
            {{ restoring ? 'Restoring...' : 'Restore Wallet' }}
          </UButton>
          <UButton color="neutral" variant="outline" icon="i-lucide-x" @click="clearForm">
            Clear
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Help -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-help-circle" class="w-5 h-5" />
          <span class="font-semibold">Need Help?</span>
        </div>
      </template>

      <div class="space-y-3 text-sm">
        <div class="flex gap-3">
          <UIcon name="i-lucide-info" class="w-5 h-5 text-muted flex-shrink-0" />
          <p class="text-muted">
            Your seed phrase is a series of 12 or 24 words that was shown when you first created your wallet.
          </p>
        </div>
        <div class="flex gap-3">
          <UIcon name="i-lucide-info" class="w-5 h-5 text-muted flex-shrink-0" />
          <p class="text-muted">
            Enter the words in the exact order they were given, separated by spaces.
          </p>
        </div>
        <div class="flex gap-3">
          <UIcon name="i-lucide-info" class="w-5 h-5 text-muted flex-shrink-0" />
          <p class="text-muted">
            If you don't have your seed phrase, you cannot restore your wallet. There is no other way to recover it.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
