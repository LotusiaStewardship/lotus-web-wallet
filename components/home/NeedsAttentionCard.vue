<script setup lang="ts">
/**
 * Needs Attention Card Component
 *
 * Shows items requiring user action: backup reminders, signing requests, etc.
 */
import { useOnboardingStore } from '~/stores/onboarding'

const onboardingStore = useOnboardingStore()
const { openBackupModal } = useOverlays()
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <span class="w-2 h-2 rounded-full bg-warning animate-pulse" />
      <span class="font-semibold">Needs Attention</span>
    </div>

    <div class="p-4 space-y-3">
      <!-- Backup Reminder -->
      <div v-if="!onboardingStore.backupComplete"
        class="flex items-center justify-between p-3 rounded-lg bg-warning/10">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-warning" />
          <div>
            <p class="font-medium">Backup your wallet</p>
            <p class="text-sm text-gray-500">Secure your recovery phrase</p>
          </div>
        </div>
        <UButton size="sm" color="warning" @click="openBackupModal()">
          Backup
        </UButton>
      </div>
    </div>
  </div>
</template>
