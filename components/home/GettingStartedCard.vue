<script setup lang="ts">
/**
 * Getting Started Card Component
 *
 * Onboarding checklist for new users to complete essential setup tasks.
 */
import { useOnboardingStore } from '~/stores/onboarding'
import { useWalletStore } from '~/stores/wallet'
import { usePeopleStore } from '~/stores/people'

const onboardingStore = useOnboardingStore()
const walletStore = useWalletStore()
const peopleStore = usePeopleStore()
const { openBackupModal, openReceiveModal, openAddContactModal } = useOverlays()

const steps = computed(() => [
  {
    id: 'create',
    title: 'Create wallet',
    description: 'Your wallet is ready to use',
    completed: !!walletStore.address,
    action: null as (() => void) | null,
    actionLabel: '',
  },
  {
    id: 'backup',
    title: 'Back up recovery phrase',
    description: 'Secure your wallet with a backup',
    completed: onboardingStore.backupComplete,
    action: () => openBackupModal(),
    actionLabel: 'Backup',
  },
  {
    id: 'receive',
    title: 'Receive your first XPI',
    description: 'Get some Lotus to get started',
    completed: BigInt(walletStore.balance?.total || '0') > 0n,
    action: () => openReceiveModal(),
    actionLabel: 'Receive',
  },
  {
    id: 'contact',
    title: 'Add a contact',
    description: 'Save people you transact with',
    completed: peopleStore.allPeople.length > 0,
    action: () => openAddContactModal(),
    actionLabel: 'Add',
  },
])

const isComplete = computed(() => steps.value.every(s => s.completed))

function dismissChecklist() {
  onboardingStore.skipOnboarding()
}
</script>

<template>
  <div v-if="!isComplete"
    class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <UIcon name="i-lucide-rocket" class="w-5 h-5 text-primary" />
      <span class="font-semibold">Getting Started</span>
    </div>

    <div class="p-4 space-y-3">
      <div v-for="step in steps" :key="step.id" :class="[
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        step.completed ? 'bg-success/5' : 'bg-gray-100 dark:bg-gray-800',
      ]">
        <div :class="[
          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
          step.completed
            ? 'bg-success text-white'
            : 'bg-gray-300 dark:bg-gray-600',
        ]">
          <UIcon :name="step.completed ? 'i-lucide-check' : 'i-lucide-circle'" class="w-4 h-4" />
        </div>

        <div class="flex-1 min-w-0">
          <p :class="[
            'font-medium',
            step.completed && 'line-through text-gray-500',
          ]">
            {{ step.title }}
          </p>
          <p class="text-xs text-gray-500">{{ step.description }}</p>
        </div>

        <UButton v-if="!step.completed && step.action" size="xs" @click="step.action">
          {{ step.actionLabel }}
        </UButton>
      </div>
    </div>

    <!-- Dismiss option -->
    <div class="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-800 text-center">
      <UButton variant="ghost" size="xs" @click="dismissChecklist">
        Dismiss checklist
      </UButton>
    </div>
  </div>
</template>
