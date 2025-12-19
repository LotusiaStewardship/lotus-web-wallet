<script setup lang="ts">
/**
 * OnboardingWelcomeStep
 *
 * Welcome step of the onboarding flow.
 */
const emit = defineEmits<{
  create: []
  restore: []
}>()
</script>

<template>
  <div class="text-center py-8">
    <div
      class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
      <span class="text-4xl">🪷</span>
    </div>

    <h1 class="text-2xl font-bold mb-2">Welcome to Lotus Wallet</h1>
    <p class="text-muted mb-8">
      A secure, private wallet for the Lotus network
    </p>

    <div class="space-y-3">
      <UButton block color="primary" size="lg" @click="emit('create')">
        Create New Wallet
      </UButton>
      <UButton block color="neutral" variant="outline" size="lg" @click="emit('restore')">
        Restore Existing Wallet
      </UButton>
    </div>
  </div>
</template>
