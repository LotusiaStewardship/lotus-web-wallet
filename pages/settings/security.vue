<script setup lang="ts">
/**
 * Security Settings Page
 *
 * PIN, auto-lock, and privacy settings.
 */
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Security',
})

const walletStore = useWalletStore()
const toast = useToast()

// Settings state (would normally be persisted)
const pinEnabled = ref(false)
const autoLockEnabled = ref(true)
const autoLockTimeout = ref(5) // minutes
const hideBalances = ref(false)

// PIN modal
const showPinModal = ref(false)
const pinMode = ref<'set' | 'change' | 'remove'>('set')

// Auto-lock options
const autoLockOptions = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: 'Never', value: 0 },
]

// Toggle PIN
function togglePin() {
  if (pinEnabled.value) {
    pinMode.value = 'remove'
  } else {
    pinMode.value = 'set'
  }
  showPinModal.value = true
}

// Change PIN
function changePin() {
  pinMode.value = 'change'
  showPinModal.value = true
}

// Handle PIN modal result
function handlePinResult(success: boolean) {
  showPinModal.value = false
  if (success) {
    if (pinMode.value === 'remove') {
      pinEnabled.value = false
      toast.add({ title: 'PIN Removed', color: 'success' })
    } else {
      pinEnabled.value = true
      toast.add({ title: pinMode.value === 'set' ? 'PIN Set' : 'PIN Changed', color: 'success' })
    }
  }
}

// Toggle hide balances
function toggleHideBalances() {
  hideBalances.value = !hideBalances.value
  toast.add({
    title: hideBalances.value ? 'Balances Hidden' : 'Balances Visible',
    color: 'success',
  })
}
</script>

<template>
  <div class="space-y-4">
    <!-- PIN Protection -->
    <UiAppCard title="PIN Protection" icon="i-lucide-lock">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Enable PIN</div>
            <div class="text-sm text-muted">Require PIN to open wallet</div>
          </div>
          <USwitch v-model="pinEnabled" @update:model-value="togglePin" />
        </div>

        <UButton v-if="pinEnabled" color="neutral" variant="outline" size="sm" @click="changePin">
          Change PIN
        </UButton>
      </div>
    </UiAppCard>

    <!-- Auto-Lock -->
    <UiAppCard title="Auto-Lock" icon="i-lucide-timer">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Auto-Lock</div>
            <div class="text-sm text-muted">Lock wallet after inactivity</div>
          </div>
          <USwitch v-model="autoLockEnabled" />
        </div>

        <UFormField v-if="autoLockEnabled" label="Lock after">
          <USelectMenu v-model="autoLockTimeout" :items="autoLockOptions" value-key="value" class="w-full" />
        </UFormField>
      </div>
    </UiAppCard>

    <!-- Privacy -->
    <UiAppCard title="Privacy" icon="i-lucide-eye-off">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Hide Balances</div>
            <div class="text-sm text-muted">Show ••••• instead of amounts</div>
          </div>
          <USwitch v-model="hideBalances" @update:model-value="toggleHideBalances" />
        </div>
      </div>
    </UiAppCard>

    <!-- Session Info -->
    <UiAppCard title="Session" icon="i-lucide-user">
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">Wallet Status</span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full" :class="walletStore.connected ? 'bg-success' : 'bg-warning'" />
            {{ walletStore.connected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Address Type</span>
          <span class="font-mono">{{ walletStore.addressType === 'p2tr' ? 'Taproot' : 'P2PKH' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">UTXOs</span>
          <span>{{ walletStore.utxoCount }}</span>
        </div>
      </div>
    </UiAppCard>

    <!-- PIN Modal -->
    <SettingsSetPinModal v-model:open="showPinModal" :mode="pinMode === 'remove' ? 'set' : pinMode"
      @complete="handlePinResult(true)" />
  </div>
</template>
