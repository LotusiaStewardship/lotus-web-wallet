<script setup lang="ts">
/**
 * Action Sheet Component
 *
 * Quick action modal triggered from the center action button.
 */

const emit = defineEmits<{
  (e: 'close', action?: 'send' | 'receive' | 'scan' | 'wallet'): void
}>()

interface ActionItem {
  id: 'send' | 'receive' | 'scan' | 'wallet'
  icon: string
  label: string
  description: string
}

const actions: ActionItem[] = [
  {
    id: 'send',
    icon: 'i-lucide-send',
    label: 'Send',
    description: 'Send XPI to someone',
  },
  {
    id: 'receive',
    icon: 'i-lucide-qr-code',
    label: 'Receive',
    description: 'Show your address',
  },
  {
    id: 'scan',
    icon: 'i-lucide-scan',
    label: 'Scan QR',
    description: 'Scan a payment request',
  },
  {
    id: 'wallet',
    icon: 'i-lucide-shield',
    label: 'New Wallet',
    description: 'Create shared wallet',
  },
]

function handleAction(action: ActionItem) {
  emit('close', action.id)
}

function close() {
  emit('close')
}
</script>

<template>
  <USlideover :open="true" side="bottom">
    <template #content>
      <div class="p-4 pb-8">
        <!-- Header with close button -->
        <div class="flex items-center justify-between mb-4">
          <div class="w-8" /> <!-- Spacer for centering -->
          <h2 class="text-lg font-semibold text-center">Quick Actions</h2>
          <UButton variant="ghost" size="xs" icon="i-lucide-x" @click="close" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button v-for="action in actions" :key="action.id"
            class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            @click="handleAction(action)">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon :name="action.icon" class="w-6 h-6 text-primary" />
            </div>
            <span class="text-sm font-medium">{{ action.label }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 text-center">
              {{ action.description }}
            </span>
          </button>
        </div>
      </div>
    </template>
  </USlideover>
</template>
