<script setup lang="ts">
/**
 * OnboardingTourStep
 *
 * Quick tour step of the onboarding flow.
 */
const emit = defineEmits<{
  finish: []
}>()

const features = [
  {
    icon: 'i-lucide-send',
    title: 'Send',
    description: 'Send XPI to anyone',
  },
  {
    icon: 'i-lucide-qr-code',
    title: 'Receive',
    description: 'Get your address',
  },
  {
    icon: 'i-lucide-globe',
    title: 'P2P Network',
    description: 'Connect with others',
  },
  {
    icon: 'i-lucide-trophy',
    title: 'Social',
    description: 'Vote on profiles',
  },
]
</script>

<template>
  <div class="py-4">
    <div class="text-center mb-6">
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
        <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-success" />
      </div>
      <h2 class="text-xl font-bold mb-2">You're All Set!</h2>
      <p class="text-muted">
        Here's what you can do with Lotus Wallet
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div v-for="feature in features" :key="feature.title" class="p-4 bg-muted/50 rounded-lg text-center">
        <UIcon :name="feature.icon" class="w-8 h-8 text-primary mx-auto mb-2" />
        <p class="font-medium">{{ feature.title }}</p>
        <p class="text-xs text-muted">{{ feature.description }}</p>
      </div>
    </div>

    <UButton block color="primary" size="lg" @click="emit('finish')">
      Start Using Wallet
    </UButton>
  </div>
</template>
