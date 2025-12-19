<script setup lang="ts">
/**
 * FundWalletModal
 *
 * Modal for funding a shared wallet.
 */
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  /** Whether modal is open */
  open: boolean
  /** Wallet to fund */
  wallet: {
    id: string
    name: string
    sharedAddress: string
    balanceSats: string
  } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  fund: [amount: bigint]
}>()

const walletStore = useWalletStore()
const { formatXPI, xpiToSats } = useAmount()
const { copy } = useClipboard()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Form state
const amountInput = ref('')

// Convert amount to satoshis
const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

// Validation
const isValid = computed(() => {
  if (amountSats.value <= 0n) return false
  if (amountSats.value > BigInt(walletStore.balance.total)) return false
  return true
})

// Preset amounts
const presetAmounts = ['100', '500', '1000', '5000']

function handleFund() {
  if (!isValid.value) return
  emit('fund', amountSats.value)
  amountInput.value = ''
}

function copyAddress() {
  if (props.wallet) {
    copy(props.wallet.sharedAddress, 'Address copied')
  }
}

// Reset on close
watch(isOpen, open => {
  if (!open) {
    amountInput.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-plus" class="w-5 h-5 text-primary" />
        <span class="font-semibold">Fund {{ wallet?.name }}</span>
      </div>
    </template>

    <template #body>
      <div v-if="wallet" class="space-y-4">
        <!-- Current Balance -->
        <div class="p-4 bg-muted/50 rounded-lg text-center">
          <p class="text-sm text-muted">Current Shared Wallet Balance</p>
          <p class="text-xl font-bold">{{ formatXPI(wallet.balanceSats) }}</p>
        </div>

        <!-- Your Balance -->
        <div class="flex justify-between text-sm">
          <span class="text-muted">Your Available Balance</span>
          <span class="font-medium">{{ formatXPI(walletStore.balance.total) }}</span>
        </div>

        <!-- Amount Input -->
        <UFormField label="Amount to Send" required>
          <UInput v-model="amountInput" type="number" inputmode="decimal" placeholder="0.00" size="lg">
            <template #trailing>
              <span class="text-muted">XPI</span>
            </template>
          </UInput>
        </UFormField>

        <!-- Preset Amounts -->
        <div class="flex flex-wrap gap-2">
          <UButton v-for="preset in presetAmounts" :key="preset" size="sm" color="neutral" variant="outline"
            @click="amountInput = preset">
            {{ preset }} XPI
          </UButton>
        </div>

        <!-- Destination Address -->
        <div class="p-3 bg-muted/50 rounded-lg">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-muted">Sending to</p>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copyAddress" />
          </div>
          <p class="font-mono text-sm break-all">{{ wallet.sharedAddress }}</p>
        </div>

        <!-- Info -->
        <UAlert color="info" icon="i-lucide-info">
          <template #description>
            Funds sent to the shared wallet can only be spent when all participants sign.
          </template>
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3">
        <UButton class="flex-1" color="neutral" variant="outline" @click="isOpen = false">
          Cancel
        </UButton>
        <UButton class="flex-1" color="primary" :disabled="!isValid" @click="handleFund">
          Send Funds
        </UButton>
      </div>
    </template>
  </UModal>
</template>
