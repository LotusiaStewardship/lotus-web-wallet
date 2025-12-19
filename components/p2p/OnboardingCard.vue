<script setup lang="ts">
/**
 * P2POnboardingCard
 *
 * First-time user introduction to P2P features.
 */
const emit = defineEmits<{
  dismiss: []
}>()

const features = [
  {
    icon: 'i-lucide-shield',
    title: 'Shared Wallets',
    description: 'Create multi-signature wallets with friends or family',
  },
  {
    icon: 'i-lucide-shuffle',
    title: 'CoinJoin',
    description: 'Enhance privacy by mixing transactions with others',
  },
  {
    icon: 'i-lucide-lock',
    title: 'Escrow',
    description: 'Secure transactions with trusted third-party signers',
  },
]
</script>

<template>
  <UCard class="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
        <UIcon name="i-lucide-info" class="w-6 h-6 text-primary" />
      </div>

      <!-- Content -->
      <div class="flex-1">
        <h3 class="font-semibold text-lg mb-2">Welcome to P2P Network</h3>
        <p class="text-sm text-muted mb-4">
          The P2P network lets you connect with other Lotus wallets for advanced features:
        </p>

        <div class="grid gap-3 mb-4">
          <div v-for="feature in features" :key="feature.title" class="flex items-start gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <UIcon :name="feature.icon" class="w-4 h-4 text-primary" />
            </div>
            <div>
              <p class="font-medium text-sm">{{ feature.title }}</p>
              <p class="text-xs text-muted">{{ feature.description }}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <UButton color="primary" size="sm" to="/docs/p2p">
            Learn More
          </UButton>
          <UButton color="neutral" variant="ghost" size="sm" @click="emit('dismiss')">
            Got it
          </UButton>
        </div>
      </div>

      <!-- Close Button -->
      <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" class="flex-shrink-0"
        @click="emit('dismiss')" />
    </div>
  </UCard>
</template>
