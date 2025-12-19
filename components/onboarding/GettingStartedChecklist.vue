<script setup lang="ts">
/**
 * GettingStartedChecklist
 *
 * Shows a checklist of tasks for new users to complete.
 * Can be displayed on home page or as a card.
 */
import { useOnboardingStore } from '~/stores/onboarding'

const onboardingStore = useOnboardingStore()

const checklistItems = computed(() => [
  {
    key: 'backup' as const,
    label: 'Back up your wallet',
    description: 'Secure your seed phrase to prevent losing access',
    icon: 'i-lucide-shield',
    completed: onboardingStore.checklist.backup,
    action: { label: 'Backup Now', to: '/settings/backup' },
  },
  {
    key: 'addContact' as const,
    label: 'Add your first contact',
    description: 'Save addresses for easy sending',
    icon: 'i-lucide-user-plus',
    completed: onboardingStore.checklist.addContact,
    action: { label: 'Add Contact', to: '/people/contacts' },
  },
  {
    key: 'receiveFirst' as const,
    label: 'Receive your first Lotus',
    description: 'Share your address to receive funds',
    icon: 'i-lucide-qr-code',
    completed: onboardingStore.checklist.receiveFirst,
    action: { label: 'Get Address', to: '/transact/receive' },
  },
  {
    key: 'sendFirst' as const,
    label: 'Send your first transaction',
    description: 'Experience instant Lotus transfers',
    icon: 'i-lucide-send',
    completed: onboardingStore.checklist.sendFirst,
    action: { label: 'Send Lotus', to: '/transact/send' },
  },
])

const progress = computed(() => onboardingStore.checklistProgress)
const isComplete = computed(() => onboardingStore.isChecklistComplete)
</script>

<template>
  <UiAppCard v-if="!isComplete" title="Getting Started" icon="i-lucide-rocket">
    <template #header-badge>
      <span class="text-xs text-muted ml-2">{{ progress.completed }}/{{ progress.total }}</span>
    </template>

    <!-- Phase 6: Progress Bar with semantic colors -->
    <div class="mb-3">
      <div class="h-1.5 bg-muted rounded-full overflow-hidden">
        <div class="h-full bg-primary transition-all duration-300"
          :style="{ width: `${(progress.completed / progress.total) * 100}%` }" />
      </div>
    </div>

    <!-- Phase 6: Checklist Items with semantic colors -->
    <div class="space-y-2">
      <div v-for="item in checklistItems" :key="item.key" class="flex items-center gap-3 p-2.5 rounded-lg" :class="{
        'bg-success/10': item.completed,
        'bg-muted/30': !item.completed,
      }">
        <!-- Status Icon -->
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="item.completed
          ? 'bg-success/20'
          : 'bg-muted'
          ">
          <UIcon :name="item.completed ? 'i-lucide-check' : item.icon" class="w-4 h-4"
            :class="item.completed ? 'text-success' : 'text-muted'" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm" :class="{ 'line-through text-muted': item.completed }">
            {{ item.label }}
          </div>
        </div>

        <!-- Action -->
        <NuxtLink v-if="!item.completed" :to="item.action.to" class="shrink-0">
          <UButton color="primary" variant="soft" size="xs">
            {{ item.action.label }}
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </UiAppCard>
</template>
