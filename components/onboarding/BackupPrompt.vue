<script setup lang="ts">
/**
 * OnboardingBackupPrompt
 *
 * Backup prompt step of the onboarding flow.
 */
const emit = defineEmits<{
  backup: []
  skip: []
}>()
</script>

<template>
  <div class="py-4">
    <div class="text-center mb-6">
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
        <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-xl font-bold mb-2">Back Up Your Wallet</h2>
      <p class="text-muted">
        Your 12-word seed phrase is the <strong>only way</strong> to recover
        your wallet if you lose access to this device.
      </p>
    </div>

    <UAlert color="error" icon="i-lucide-shield-alert" class="mb-6">
      <template #description>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Write it down on paper</li>
          <li>Store it in a safe place</li>
          <li>Never share it with anyone</li>
          <li>Never enter it on any website</li>
        </ul>
      </template>
    </UAlert>

    <div class="space-y-3">
      <UButton block color="primary" size="lg" @click="emit('backup')">
        Back Up Now
      </UButton>
      <UButton block color="neutral" variant="ghost" @click="emit('skip')">
        Skip for now (not recommended)
      </UButton>
    </div>
  </div>
</template>
