<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'
import { useBitcore } from '~/composables/useBitcore'

// Transaction type constants (matching SDK's TransactionType enum values)
const TransactionType = {
  SPEND: 'spend',
  SWAP: 'swap',
  COINJOIN: 'coinjoin',
  CUSTODY: 'custody',
  ESCROW: 'escrow',
  CHANNEL: 'channel',
} as const

type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType]

definePageMeta({
  title: 'Advertise Service',
})

const p2pStore = useP2PStore()
const walletStore = useWalletStore()
const { Bitcore } = useBitcore()
const toast = useToast()
const router = useRouter()

// ============================================================================
// State
// ============================================================================

const publishing = ref(false)

// Wallet Presence
const presenceEnabled = ref(p2pStore.isAdvertisingPresence)
const presenceNickname = ref('')

// MuSig2 Signer Configuration
const signerEnabled = ref(p2pStore.isAdvertisingSigner)
const signerNickname = ref('')
const signerDescription = ref('')
const signerFee = ref<number | undefined>(undefined)
const signerMinAmount = ref<number | undefined>(undefined)
const signerMaxAmount = ref<number | undefined>(undefined)
const selectedTransactionTypes = ref<TransactionTypeValue[]>([TransactionType.SPEND])

// Transaction type options with metadata
const transactionTypeOptions = [
  {
    value: TransactionType.SPEND,
    label: 'Spend',
    icon: 'i-lucide-send',
    description: 'Standard multi-sig spend transactions',
  },
  {
    value: TransactionType.SWAP,
    label: 'Atomic Swap',
    icon: 'i-lucide-repeat',
    description: 'Cross-chain atomic swaps',
  },
  {
    value: TransactionType.COINJOIN,
    label: 'CoinJoin',
    icon: 'i-lucide-shuffle',
    description: 'Privacy-enhancing CoinJoin rounds',
  },
  {
    value: TransactionType.CUSTODY,
    label: 'Custody',
    icon: 'i-lucide-shield',
    description: 'Multi-sig custody arrangements',
  },
  {
    value: TransactionType.ESCROW,
    label: 'Escrow',
    icon: 'i-lucide-lock',
    description: 'Escrow and dispute resolution',
  },
  {
    value: TransactionType.CHANNEL,
    label: 'Channel',
    icon: 'i-lucide-git-branch',
    description: 'Payment channel operations',
  },
]

// ============================================================================
// Computed
// ============================================================================

// Get public key from wallet
// Note: The wallet store exposes _hdPrivkey as a private property
// We access it via the store's internal state for signing purposes
const walletPublicKey = computed(() => {
  if (!walletStore.address || !Bitcore) return null
  try {
    // Access the internal HD private key from the wallet store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hdPrivkey = (walletStore as any)._hdPrivkey
    if (!hdPrivkey) return null
    return hdPrivkey.publicKey.toString()
  } catch {
    return null
  }
})

// Validation for signer
const canPublishSigner = computed(() => {
  if (!p2pStore.initialized || publishing.value) return false
  if (!walletPublicKey.value) return false
  return selectedTransactionTypes.value.length > 0
})

// ============================================================================
// Actions
// ============================================================================

// Toggle transaction type
const toggleTransactionType = (txType: TransactionTypeValue) => {
  const index = selectedTransactionTypes.value.indexOf(txType)
  if (index >= 0) {
    selectedTransactionTypes.value.splice(index, 1)
  } else {
    selectedTransactionTypes.value.push(txType)
  }
}

// Toggle wallet presence
const togglePresence = async () => {
  if (publishing.value) return
  publishing.value = true

  try {
    if (presenceEnabled.value) {
      // Withdraw presence
      await p2pStore.withdrawPresence()
      presenceEnabled.value = false
      toast.add({
        title: 'Presence Disabled',
        description: 'You are no longer visible on the network',
        color: 'neutral',
        icon: 'i-lucide-eye-off',
      })
    } else {
      // Advertise presence
      await p2pStore.advertisePresence({
        walletAddress: walletStore.address,
        nickname: presenceNickname.value || undefined,
      })
      presenceEnabled.value = true
      toast.add({
        title: 'Presence Enabled',
        description: 'You are now visible on the network',
        color: 'success',
        icon: 'i-lucide-eye',
      })
    }
  } catch (err) {
    toast.add({
      title: 'Failed',
      description: err instanceof Error ? err.message : 'Operation failed',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    publishing.value = false
  }
}

// Publish signer advertisement
const publishSigner = async () => {
  if (!canPublishSigner.value || !walletPublicKey.value) return

  publishing.value = true

  try {
    await p2pStore.advertiseSigner({
      publicKeyHex: walletPublicKey.value,
      transactionTypes: selectedTransactionTypes.value as string[],
      amountRange:
        signerMinAmount.value || signerMaxAmount.value
          ? { min: signerMinAmount.value, max: signerMaxAmount.value }
          : undefined,
      nickname: signerNickname.value || undefined,
      description: signerDescription.value || undefined,
      fee: signerFee.value,
    })

    signerEnabled.value = true

    toast.add({
      title: 'Signer Published',
      description: 'You are now available as a MuSig2 signer',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    router.push('/p2p')
  } catch (err) {
    toast.add({
      title: 'Publish Failed',
      description: err instanceof Error ? err.message : 'Failed to publish signer',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    publishing.value = false
  }
}

// Withdraw signer advertisement
const withdrawSigner = async () => {
  if (publishing.value) return
  publishing.value = true

  try {
    await p2pStore.withdrawSignerAdvertisement()
    signerEnabled.value = false
    toast.add({
      title: 'Signer Withdrawn',
      description: 'You are no longer available as a signer',
      color: 'neutral',
      icon: 'i-lucide-x',
    })
  } catch (err) {
    toast.add({
      title: 'Failed',
      description: err instanceof Error ? err.message : 'Operation failed',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    publishing.value = false
  }
}

// Initialize P2P if needed
onMounted(async () => {
  if (!p2pStore.initialized) {
    try {
      await p2pStore.initialize()
    } catch {
      // Error handled by store
    }
  }

  // Sync state with store
  presenceEnabled.value = p2pStore.isAdvertisingPresence
  signerEnabled.value = p2pStore.isAdvertisingSigner

  // Load existing signer config if available
  if (p2pStore.mySignerConfig) {
    const config = p2pStore.mySignerConfig
    signerNickname.value = config.nickname || ''
    signerDescription.value = config.description || ''
    signerFee.value = config.fee
    signerMinAmount.value = config.amountRange?.min
    signerMaxAmount.value = config.amountRange?.max
    selectedTransactionTypes.value = [...config.transactionTypes] as TransactionTypeValue[]
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <NuxtLink to="/settings" class="text-sm text-muted hover:text-foreground flex items-center gap-1 mb-4">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-2xl font-bold">P2P Services</h1>
      <p class="text-muted">Configure your presence and services on the P2P network</p>
    </div>

    <!-- P2P Status -->
    <UAlert v-if="!p2pStore.initialized" color="warning" variant="subtle" icon="i-lucide-loader-2">
      <template #title>Connecting to P2P Network...</template>
      <template #description>
        Please wait while we establish a connection to the network.
      </template>
    </UAlert>

    <!-- Wallet Presence Card -->
    <UCard>
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary-100 dark:bg-primary-900/20">
            <UIcon name="i-lucide-wifi" class="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p class="font-semibold">Wallet Presence</p>
            <p class="text-sm text-muted">Let others know you're online and available for P2P interactions</p>
          </div>
        </div>
        <USwitch :model-value="presenceEnabled" :disabled="!p2pStore.initialized || publishing"
          @update:model-value="togglePresence" />
      </div>

      <!-- Presence Options (shown when enabled) -->
      <div v-if="presenceEnabled" class="mt-4 pt-4 border-t border-default">
        <UFormField label="Display Name" hint="Optional nickname visible to others">
          <UInput v-model="presenceNickname" placeholder="Anonymous" />
        </UFormField>
      </div>
    </UCard>

    <!-- MuSig2 Signer Card -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-success-500" />
          <span class="font-semibold">MuSig2 Signer</span>
          <UBadge v-if="signerEnabled" color="success" variant="subtle" size="xs">Active</UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          Become a MuSig2 signer to participate in multi-signature transactions with other users.
        </p>

        <!-- Transaction Types -->
        <UFormField label="Transaction Types" required hint="Select the types of transactions you're willing to sign">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button v-for="txType in transactionTypeOptions" :key="txType.value"
              class="p-3 rounded-lg border-2 text-left transition-all" :class="[
                selectedTransactionTypes.includes(txType.value)
                  ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
                  : 'border-default hover:border-success-300'
              ]" @click="toggleTransactionType(txType.value)">
              <div class="flex items-center gap-2">
                <UIcon :name="txType.icon" class="w-4 h-4"
                  :class="selectedTransactionTypes.includes(txType.value) ? 'text-success-500' : 'text-muted'" />
                <span class="text-sm font-medium">{{ txType.label }}</span>
              </div>
            </button>
          </div>
        </UFormField>

        <!-- Signer Details -->
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Display Name" hint="Optional">
            <UInput v-model="signerNickname" placeholder="Anonymous Signer" />
          </UFormField>

          <UFormField label="Signing Fee (XPI)" hint="Optional fee per signature">
            <UInput v-model="signerFee" type="number" placeholder="0" min="0" step="0.01" />
          </UFormField>
        </div>

        <!-- Amount Range -->
        <UFormField label="Amount Range (XPI)" hint="Optional limits on transaction amounts">
          <div class="grid grid-cols-2 gap-4">
            <UInput v-model="signerMinAmount" type="number" placeholder="Min" min="0" />
            <UInput v-model="signerMaxAmount" type="number" placeholder="Max" min="0" />
          </div>
        </UFormField>

        <!-- Description -->
        <UFormField label="Description" hint="Optional description of your signing service">
          <UTextarea v-model="signerDescription" placeholder="Describe your signing service..." :rows="2" />
        </UFormField>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <UButton v-if="!signerEnabled" block color="success" :loading="publishing" :disabled="!canPublishSigner"
            icon="i-lucide-check" @click="publishSigner">
            {{ publishing ? 'Publishing...' : 'Become a Signer' }}
          </UButton>
          <template v-else>
            <UButton block color="neutral" variant="outline" :loading="publishing" icon="i-lucide-x"
              @click="withdrawSigner">
              Stop Signing
            </UButton>
          </template>
        </div>
      </div>
    </UCard>

    <!-- Info Card -->
    <UCard>
      <div class="flex gap-3">
        <UIcon name="i-lucide-info" class="w-5 h-5 text-info-500 shrink-0 mt-0.5" />
        <div class="text-sm text-muted space-y-2">
          <p>
            <strong>Wallet Presence</strong> lets others see you're online. It expires after 1 hour but auto-refreshes
            while
            you're connected.
          </p>
          <p>
            <strong>MuSig2 Signer</strong> advertises your availability to participate in multi-signature transactions.
            Other users can discover you and request your signature.
          </p>
        </div>
      </div>
    </UCard>

    <!-- Current Status -->
    <UCard v-if="p2pStore.mySignerConfig || p2pStore.myPresenceConfig">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-radio" class="w-5 h-5" />
          <span class="font-semibold">Active Advertisements</span>
        </div>
      </template>

      <div class="divide-y divide-default -my-2">
        <!-- Presence -->
        <div v-if="p2pStore.myPresenceConfig" class="py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-wifi" class="w-4 h-4 text-primary-500" />
            <div>
              <p class="font-medium">Wallet Presence</p>
              <p class="text-xs text-muted">{{ p2pStore.myPresenceConfig.walletAddress.slice(0, 20)
                }}...
              </p>
            </div>
          </div>
          <UBadge color="success" variant="subtle" size="xs">Active</UBadge>
        </div>

        <!-- Signer -->
        <div v-if="p2pStore.mySignerConfig" class="py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-pen-tool" class="w-4 h-4 text-success-500" />
            <div>
              <p class="font-medium">MuSig2 Signer</p>
              <p class="text-xs text-muted">
                {{ p2pStore.mySignerConfig.transactionTypes.join(', ') }}
              </p>
            </div>
          </div>
          <UBadge color="success" variant="subtle" size="xs">Active</UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
