<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Backup Wallet',
})

const walletStore = useWalletStore()
const toast = useToast()

// Visibility state
const seedPhraseVisible = ref(false)
const confirmed = ref(false)

// Toggle visibility
const toggleVisibility = () => {
  seedPhraseVisible.value = !seedPhraseVisible.value
}

// Copy seed phrase
const copySeedPhrase = async () => {
  try {
    await navigator.clipboard.writeText(walletStore.seedPhrase)
    toast.add({
      title: 'Copied',
      description: 'Seed phrase copied to clipboard. Store it safely!',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Copy Failed',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Split seed phrase into words
const seedWords = computed(() => {
  if (!walletStore.seedPhrase) return []
  return walletStore.seedPhrase.split(' ')
})
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <NuxtLink to="/settings" class="text-sm text-muted hover:text-foreground flex items-center gap-1 mb-4">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-2xl font-bold">Backup Seed Phrase</h1>
      <p class="text-muted">Your seed phrase is the only way to recover your wallet</p>
    </div>

    <!-- Warning -->
    <UAlert color="warning" variant="subtle" icon="i-lucide-alert-triangle">
      <template #title>Important Security Information</template>
      <template #description>
        <ul class="list-disc list-inside space-y-1 mt-2">
          <li>Never share your seed phrase with anyone</li>
          <li>Write it down on paper and store it safely</li>
          <li>Anyone with your seed phrase can access your funds</li>
          <li>Lotusia support will never ask for your seed phrase</li>
        </ul>
      </template>
    </UAlert>

    <!-- Confirmation -->
    <UCard v-if="!confirmed">
      <div class="text-center py-4">
        <UIcon name="i-lucide-shield-alert" class="w-16 h-16 mx-auto mb-4 text-warning-500" />
        <h3 class="text-lg font-semibold mb-2">Are you in a private location?</h3>
        <p class="text-muted mb-6">
          Make sure no one can see your screen before revealing your seed phrase.
        </p>
        <UButton color="warning" icon="i-lucide-eye" @click="confirmed = true">
          I understand, show my seed phrase
        </UButton>
      </div>
    </UCard>

    <!-- Seed Phrase Display -->
    <UCard v-else>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-key" class="w-5 h-5" />
            <span class="font-semibold">Your Seed Phrase</span>
          </div>
          <UButton color="neutral" variant="ghost" size="sm"
            :icon="seedPhraseVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" @click="toggleVisibility">
            {{ seedPhraseVisible ? 'Hide' : 'Show' }}
          </UButton>
        </div>
      </template>

      <div v-if="seedPhraseVisible" class="space-y-4">
        <!-- Word Grid -->
        <div class="grid grid-cols-3 gap-2">
          <div v-for="(word, index) in seedWords" :key="index" class="bg-muted/50 rounded-lg p-3 text-center">
            <span class="text-xs text-muted block mb-1">{{ index + 1 }}</span>
            <span class="font-mono font-medium">{{ word }}</span>
          </div>
        </div>

        <!-- Copy Button -->
        <UButton block color="neutral" variant="outline" icon="i-lucide-copy" @click="copySeedPhrase">
          Copy to Clipboard
        </UButton>
      </div>

      <div v-else class="text-center py-8">
        <UIcon name="i-lucide-eye-off" class="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
        <p class="text-muted">Click "Show" to reveal your seed phrase</p>
      </div>
    </UCard>

    <!-- Verification Reminder -->
    <UCard v-if="confirmed">
      <div class="flex gap-4">
        <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-success-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 class="font-semibold mb-1">Verify Your Backup</h4>
          <p class="text-sm text-muted">
            After writing down your seed phrase, verify it by restoring your wallet on another device
            or using the restore function to ensure you've recorded it correctly.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
