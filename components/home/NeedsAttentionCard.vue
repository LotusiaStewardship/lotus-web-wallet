<script setup lang="ts">
/**
 * Needs Attention Card Component
 *
 * Shows items requiring user action: backup reminders, signing requests, etc.
 */
import { useActivityStore, type ActivityItem } from '~/stores/activity'
import { useOnboardingStore } from '~/stores/onboarding'

const activityStore = useActivityStore()
const onboardingStore = useOnboardingStore()
const { openBackupModal } = useOverlays()

const signingRequests = computed(() =>
  activityStore.allItems.filter(item => {
    const data = item.data as Record<string, unknown>
    return data.type === 'signing_request' && !item.readAt
  }),
)

const otherItems = computed(() =>
  activityStore.allItems.filter(item => {
    const data = item.data as Record<string, unknown>
    return data.type === 'signer_discovered' && !item.readAt
  }).slice(0, 3),
)

function getItemIcon(item: ActivityItem): string {
  const data = item.data as Record<string, unknown>
  switch (data.type) {
    case 'signer_discovered':
      return 'i-lucide-user-plus'
    default:
      return 'i-lucide-bell'
  }
}

function getItemTitle(item: ActivityItem): string {
  const data = item.data as Record<string, unknown>
  switch (data.type) {
    case 'signer_discovered':
      return 'New signer found'
    default:
      return 'New activity'
  }
}

function getItemSubtitle(item: ActivityItem): string {
  const data = item.data as Record<string, unknown>
  switch (data.type) {
    case 'signer_discovered':
      return String(data.nickname || 'Add to contacts')
    default:
      return ''
  }
}

function handleSigningRequest(item: ActivityItem) {
  const data = item.data as Record<string, unknown>
  if (data.type === 'signing_request') {
    navigateTo(`/people/wallets/${data.walletId}`)
  }
}

function handleItem(item: ActivityItem) {
  activityStore.markAsRead(item.id)
  navigateTo('/activity')
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <span class="w-2 h-2 rounded-full bg-warning animate-pulse" />
      <span class="font-semibold">Needs Attention</span>
      <UBadge color="warning" size="xs">
        {{ (onboardingStore.backupComplete ? 0 : 1) + signingRequests.length + otherItems.length }}
      </UBadge>
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

      <!-- Signing Requests -->
      <div v-for="item in signingRequests" :key="item.id"
        class="flex items-center justify-between p-3 rounded-lg bg-primary/5">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-primary" />
          <div>
            <p class="font-medium">Signature requested</p>
            <p class="text-sm text-gray-500">{{ (item.data as Record<string, unknown>).walletName }}</p>
          </div>
        </div>
        <UButton size="sm" @click="handleSigningRequest(item)">View</UButton>
      </div>

      <!-- Other attention items -->
      <div v-for="item in otherItems" :key="item.id"
        class="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div class="flex items-center gap-3">
          <UIcon :name="getItemIcon(item)" class="w-5 h-5" />
          <div>
            <p class="font-medium">{{ getItemTitle(item) }}</p>
            <p class="text-sm text-gray-500">{{ getItemSubtitle(item) }}</p>
          </div>
        </div>
        <UButton size="sm" variant="ghost" @click="handleItem(item)">View</UButton>
      </div>
    </div>
  </div>
</template>
