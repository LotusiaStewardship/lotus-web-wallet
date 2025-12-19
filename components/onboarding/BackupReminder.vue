<script setup lang="ts">
/**
 * BackupReminder
 *
 * Displays a warning banner when user hasn't verified their backup.
 * Shows on home page after initial onboarding is complete.
 */
import { useOnboardingStore } from '~/stores/onboarding'

const onboardingStore = useOnboardingStore()
const dismissed = ref(false)

function snooze() {
  onboardingStore.snoozeBackupReminder()
  dismissed.value = true
}
</script>

<template>
  <UAlert v-if="onboardingStore.shouldShowBackupReminder && !dismissed" color="warning" icon="i-lucide-alert-triangle"
    class="mb-6">
    <template #title>Back Up Your Wallet</template>
    <template #description>
      <p class="mb-3">
        You haven't verified your backup yet. If you lose access to this device,
        you'll lose your funds forever.
      </p>
      <div class="flex gap-2">
        <UButton color="warning" size="sm" to="/settings/backup">
          Backup Now
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" @click="snooze">
          Remind Me Later
        </UButton>
      </div>
    </template>
  </UAlert>
</template>
