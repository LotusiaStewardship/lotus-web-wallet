<script setup lang="ts">
/**
 * Balance Card Component
 *
 * Primary balance display with quick actions for Send, Receive, and Scan.
 */
import { useWalletStore } from '~/stores/wallet'
import { formatXPI } from '~/utils/formatting'

const walletStore = useWalletStore()

const visible = ref(true)

const emit = defineEmits<{
  action: [actionId: 'send' | 'receive' | 'scan']
}>()

const formattedBalance = computed(() => {
  const sats = walletStore.balance?.total || '0'
  return formatXPI(sats, { minDecimals: 2, maxDecimals: 6 })
})

const fiatValue = computed(() => {
  // TODO: Implement fiat conversion in future phase
  return null
})

const quickActions: Array<{ id: 'send' | 'receive' | 'scan'; icon: string; label: string }> = [
  { id: 'send', icon: 'i-lucide-send', label: 'Send' },
  { id: 'receive', icon: 'i-lucide-qr-code', label: 'Receive' },
  { id: 'scan', icon: 'i-lucide-scan', label: 'Scan' },
]

function toggleVisibility() {
  visible.value = !visible.value
}

function handleAction(id: 'send' | 'receive' | 'scan') {
  emit('action', id)
}
</script>

<template>
  <div
    class="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-900 rounded-2xl p-6 text-white shadow-lg">
    <!-- Balance Display -->
    <div class="text-center mb-6">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-primary-100 text-sm">Total Balance</span>
        <button class="text-primary-200 hover:text-white transition-colors" @click="toggleVisibility">
          <UIcon :name="visible ? 'i-lucide-eye' : 'i-lucide-eye-off'" class="w-4 h-4" />
        </button>
      </div>

      <div class="text-4xl font-bold font-mono tracking-tight">
        <template v-if="visible">
          {{ formattedBalance }}
          <span class="text-xl text-primary-200 ml-1">XPI</span>
        </template>
        <template v-else>••••••••</template>
      </div>

      <!-- Fiat equivalent (if available) -->
      <p v-if="visible && fiatValue" class="text-primary-200 text-sm mt-1">
        ≈ {{ fiatValue }}
      </p>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-3 gap-3">
      <button v-for="action in quickActions" :key="action.id"
        class="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        @click="handleAction(action.id)">
        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <UIcon :name="action.icon" class="w-5 h-5" />
        </div>
        <span class="text-sm font-medium">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>
