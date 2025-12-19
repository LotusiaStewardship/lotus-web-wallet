<script setup lang="ts">
/**
 * Advertise Settings Page
 *
 * Configure P2P signer advertisement settings.
 * Allows users to become signers and help others with multi-signature transactions.
 */
import { useMuSig2Store, type TransactionType } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Advertise',
})

const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()
const walletStore = useWalletStore()
const toast = useToast()
const route = useRoute()

// Form state
const signerEnabled = ref(false)
const nickname = ref('')
const transactionTypes = ref<TransactionType[]>(['spend'])
const fee = ref('0')
const minAmount = ref('')
const maxAmount = ref('')
const saving = ref(false)

// Transaction type options
const txTypeOptions: Array<{
  label: string
  value: TransactionType
  description: string
}> = [
    {
      label: 'Spend',
      value: 'spend',
      description: 'Help sign spending transactions',
    },
    {
      label: 'CoinJoin',
      value: 'coinjoin',
      description: 'Participate in privacy-enhancing transactions',
    },
    {
      label: 'Escrow',
      value: 'escrow',
      description: 'Act as escrow for trades',
    },
    {
      label: 'Swap',
      value: 'swap',
      description: 'Facilitate atomic swaps',
    },
  ]

// Load existing settings on mount
onMounted(() => {
  // Load from store state
  signerEnabled.value = musig2Store.signerEnabled
  if (musig2Store.signerConfig) {
    nickname.value = musig2Store.signerConfig.nickname || ''
    transactionTypes.value = musig2Store.signerConfig.transactionTypes || [
      'spend',
    ]
    fee.value = String(musig2Store.signerConfig.fee || 0)
    minAmount.value = String(musig2Store.signerConfig.amountRange?.min || '')
    maxAmount.value = String(musig2Store.signerConfig.amountRange?.max || '')
  }
})

// Check if P2P is connected
const isP2PConnected = computed(() => p2pStore.connected && p2pStore.initialized)

// Check if P2P is fully operational (DHT ready - required for discovery)
const isP2PFullyOperational = computed(() => p2pStore.isFullyOperational)

// Check if MuSig2 is initialized
const isMuSig2Ready = computed(() => musig2Store.initialized)

// Save settings
async function saveSettings() {
  if (!isP2PConnected.value) {
    toast.add({
      title: 'Not Connected',
      description: 'Please connect to the P2P network first',
      color: 'warning',
    })
    return
  }

  if (!isP2PFullyOperational.value) {
    toast.add({
      title: 'Network Not Ready',
      description: 'Please wait for the P2P network to become fully operational (DHT ready)',
      color: 'warning',
    })
    return
  }

  saving.value = true

  try {
    // Initialize MuSig2 if not already
    if (!isMuSig2Ready.value) {
      await musig2Store.initialize()
    }

    if (signerEnabled.value) {
      // Advertise as signer
      await musig2Store.advertiseSigner({
        nickname: nickname.value || 'Anonymous',
        transactionTypes: transactionTypes.value,
        fee: parseFloat(fee.value) || 0,
        amountRange: {
          min: minAmount.value ? parseFloat(minAmount.value) : undefined,
          max: maxAmount.value ? parseFloat(maxAmount.value) : undefined,
        },
      })

      toast.add({
        title: 'Signer Published',
        description: 'Your signer advertisement is now live on the network',
        color: 'success',
      })
    } else {
      // Withdraw advertisement
      await musig2Store.withdrawSigner()
      toast.add({
        title: 'Settings Saved',
        description: 'Signer advertisement disabled',
        color: 'info',
      })
    }
  } catch (error) {
    console.error('Failed to save signer settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to save settings'

    // Provide more helpful error messages
    let description = errorMessage
    if (errorMessage.includes('discovery layer not available')) {
      description = 'The P2P discovery layer is not ready. Please wait for the network to fully initialize.'
    }

    toast.add({
      title: 'Save Failed',
      description,
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

// Toggle handler
async function handleToggle(enabled: boolean) {
  signerEnabled.value = enabled
  if (!enabled) {
    // Auto-save when disabling
    await saveSettings()
  }
}

// Toggle transaction type
function toggleTxType(value: TransactionType, checked: boolean) {
  if (checked) {
    if (!transactionTypes.value.includes(value)) {
      transactionTypes.value = [...transactionTypes.value, value]
    }
  } else {
    transactionTypes.value = transactionTypes.value.filter(t => t !== value)
  }
}

// Navigate to P2P page to connect
function goToP2P() {
  navigateTo('/people/p2p')
}

// Determine back path from query or default
const backPath = computed(() => {
  return (route.query.from as string) || '/settings'
})
</script>

<template>
  <div class="space-y-4">
    <SettingsBackButton :to="backPath" />

    <!-- Header -->
    <UiAppCard>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-megaphone" class="w-6 h-6 text-primary" />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">Signer Advertisement</h2>
          <p class="text-sm text-muted">
            Advertise yourself as a signer to help others with multi-signature
            transactions
          </p>
        </div>
        <USwitch v-model="signerEnabled" :disabled="!isP2PConnected" @update:model-value="handleToggle" />
      </div>
    </UiAppCard>

    <!-- P2P Not Connected Warning -->
    <UAlert v-if="!isP2PConnected" color="warning" icon="i-lucide-wifi-off" title="P2P Not Connected">
      <template #description>
        <p class="mb-2">
          You need to connect to the P2P network before you can advertise as a
          signer.
        </p>
        <UButton color="warning" variant="soft" size="sm" @click="goToP2P">
          Connect to P2P Network
        </UButton>
      </template>
    </UAlert>

    <!-- P2P Connected but not fully operational -->
    <UAlert v-else-if="isP2PConnected && !isP2PFullyOperational" color="info" icon="i-lucide-loader"
      title="Network Initializing">
      <template #description>
        <p>
          The P2P network is connected but still initializing. Please wait for
          the DHT to become ready before publishing your signer advertisement.
        </p>
      </template>
    </UAlert>

    <!-- Settings (only shown when enabled) -->
    <template v-if="signerEnabled && isP2PConnected">
      <!-- Identity -->
      <UiAppCard title="Identity" icon="i-lucide-user">
        <UFormField label="Nickname" hint="Optional display name for other users">
          <UInput v-model="nickname" placeholder="Anonymous" />
        </UFormField>
      </UiAppCard>

      <!-- Transaction Types -->
      <UiAppCard title="Transaction Types" icon="i-lucide-list-checks">
        <p class="text-sm text-muted mb-3">
          Select the types of transactions you're willing to sign
        </p>
        <div class="space-y-2">
          <label v-for="option in txTypeOptions" :key="option.value"
            class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            :class="{
              'border-primary bg-primary/5': transactionTypes.includes(
                option.value,
              ),
            }">
            <UCheckbox :model-value="transactionTypes.includes(option.value)" @update:model-value="
              checked => toggleTxType(option.value, checked as boolean)
            " />
            <div>
              <div class="font-medium text-sm">{{ option.label }}</div>
              <div class="text-xs text-muted">{{ option.description }}</div>
            </div>
          </label>
        </div>
      </UiAppCard>

      <!-- Fee Structure -->
      <UiAppCard title="Fee Structure" icon="i-lucide-coins">
        <div class="space-y-4">
          <UFormField label="Fee per signature" hint="Amount in XPI you charge per signature (0 for free)">
            <UInput v-model="fee" type="number" step="0.001" min="0" placeholder="0">
              <template #trailing>
                <span class="text-muted text-sm">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Minimum amount" hint="Optional">
              <UInput v-model="minAmount" type="number" min="0" placeholder="No minimum">
                <template #trailing>
                  <span class="text-muted text-sm">XPI</span>
                </template>
              </UInput>
            </UFormField>
            <UFormField label="Maximum amount" hint="Optional">
              <UInput v-model="maxAmount" type="number" min="0" placeholder="No maximum">
                <template #trailing>
                  <span class="text-muted text-sm">XPI</span>
                </template>
              </UInput>
            </UFormField>
          </div>
        </div>
      </UiAppCard>

      <!-- Save Button -->
      <UButton color="primary" block size="lg" :loading="saving" :disabled="transactionTypes.length === 0"
        @click="saveSettings">
        <UIcon name="i-lucide-save" class="w-4 h-4 mr-2" />
        Save & Publish
      </UButton>

      <!-- Validation Warning -->
      <UAlert v-if="transactionTypes.length === 0" color="warning" icon="i-lucide-alert-triangle">
        <template #description>
          Please select at least one transaction type to advertise.
        </template>
      </UAlert>
    </template>

    <!-- Info when disabled -->
    <UiAppCard v-else-if="isP2PConnected">
      <div class="text-center py-4">
        <UIcon name="i-lucide-info" class="w-8 h-8 text-muted mx-auto mb-2" />
        <p class="text-sm text-muted">
          Enable signer advertisement to help others with multi-signature
          transactions and earn fees for your service.
        </p>
      </div>
    </UiAppCard>

    <!-- Current Status (when advertising) -->
    <UiAppCard v-if="musig2Store.signerEnabled" title="Current Status" icon="i-lucide-activity">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <span class="text-sm">Your signer advertisement is active</span>
      </div>
      <div class="mt-3 text-xs text-muted">
        Other users can now discover you and request your help with
        multi-signature transactions.
      </div>
    </UiAppCard>
  </div>
</template>
