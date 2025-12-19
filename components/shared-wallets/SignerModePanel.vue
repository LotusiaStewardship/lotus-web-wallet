<script setup lang="ts">
/**
 * SignerModePanel
 *
 * Phase 10 R10.1.5: Collapsible panel for enabling signer advertisement.
 * Allows users to become a signer and participate in multi-sig transactions.
 */
import { useMuSig2Store, type TransactionType } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'

const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()
const toast = useToast()

// Panel expansion state
const isExpanded = ref(false)

// Form state
const nickname = ref(musig2Store.signerConfig?.nickname || '')
const selectedTypes = ref<TransactionType[]>(
  musig2Store.signerConfig?.transactionTypes || ['spend']
)

const transactionTypeOptions: { label: string; value: TransactionType }[] = [
  { label: 'Spend', value: 'spend' },
  { label: 'Escrow', value: 'escrow' },
  { label: 'CoinJoin', value: 'coinjoin' },
  { label: 'Swap', value: 'swap' },
  { label: 'Custody', value: 'custody' },
  { label: 'Channel', value: 'channel' },
]

// Loading state
const isLoading = ref(false)

// Can enable signer mode
const canEnable = computed(() =>
  p2pStore.connected &&
  p2pStore.dhtReady &&
  musig2Store.initialized &&
  nickname.value.trim().length > 0 &&
  selectedTypes.value.length > 0
)

// Toggle signer mode
async function toggleSignerMode() {
  if (musig2Store.signerEnabled) {
    await disableSignerMode()
  } else {
    await enableSignerMode()
  }
}

async function enableSignerMode() {
  if (!canEnable.value) return

  isLoading.value = true
  try {
    await musig2Store.advertiseSigner({
      nickname: nickname.value.trim(),
      transactionTypes: selectedTypes.value,
    })
    toast.add({
      title: 'Signer Mode Enabled',
      description: 'You are now advertising as a signer',
      color: 'success',
    })
    isExpanded.value = false
  } catch (err) {
    toast.add({
      title: 'Failed to Enable',
      description: err instanceof Error ? err.message : 'Unknown error',
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

async function disableSignerMode() {
  isLoading.value = true
  try {
    await musig2Store.withdrawSigner()
    toast.add({
      title: 'Signer Mode Disabled',
      description: 'You are no longer advertising as a signer',
      color: 'warning',
    })
  } catch (err) {
    toast.add({
      title: 'Failed to Disable',
      description: err instanceof Error ? err.message : 'Unknown error',
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

// Toggle transaction type selection
function toggleType(type: TransactionType) {
  const index = selectedTypes.value.indexOf(type)
  if (index === -1) {
    selectedTypes.value.push(type)
  } else if (selectedTypes.value.length > 1) {
    selectedTypes.value.splice(index, 1)
  }
}
</script>

<template>
  <!-- Phase 6: Semantic color classes -->
  <div class="border border-default rounded-lg overflow-hidden">
    <!-- Header (always visible) -->
    <button class="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      @click="isExpanded = !isExpanded">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="musig2Store.signerEnabled
          ? 'bg-success/20'
          : 'bg-muted'">
          <UIcon name="i-lucide-radio" class="w-4 h-4" :class="musig2Store.signerEnabled
            ? 'text-success'
            : 'text-muted'" />
        </div>
        <div class="text-left">
          <p class="font-medium text-sm">Become a Signer</p>
          <p class="text-xs text-muted">
            {{ musig2Store.signerEnabled
              ? `Advertising as "${musig2Store.signerConfig?.nickname}"`
              : 'Advertise to participate in multi-sig transactions'
            }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge v-if="musig2Store.signerEnabled" color="success" variant="subtle" size="sm">
          Active
        </UBadge>
        <UIcon :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4 text-muted" />
      </div>
    </button>

    <!-- Expanded Content -->
    <div v-if="isExpanded" class="px-4 py-4 space-y-4 border-t border-default">
      <!-- Not Connected Warning -->
      <UAlert v-if="!p2pStore.connected" color="warning" icon="i-lucide-wifi-off" title="Not Connected"
        description="Connect to the P2P network to enable signer mode." />

      <!-- Already Enabled -->
      <template v-else-if="musig2Store.signerEnabled">
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted">Nickname</span>
            <span class="font-medium">{{ musig2Store.signerConfig?.nickname }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted">Transaction Types</span>
            <div class="flex gap-1">
              <UBadge v-for="type in musig2Store.signerConfig?.transactionTypes" :key="type" color="primary"
                variant="subtle" size="xs">
                {{ type }}
              </UBadge>
            </div>
          </div>
          <UButton color="warning" variant="soft" class="w-full" icon="i-lucide-radio-off" :loading="isLoading"
            @click="disableSignerMode">
            Stop Advertising
          </UButton>
        </div>
      </template>

      <!-- Enable Form -->
      <template v-else>
        <div class="space-y-4">
          <!-- Nickname Input -->
          <UFormField label="Display Name" required>
            <UInput v-model="nickname" placeholder="Enter your signer nickname" icon="i-lucide-user" />
          </UFormField>

          <!-- Transaction Types -->
          <UFormField label="Transaction Types" required>
            <div class="flex flex-wrap gap-2">
              <UButton v-for="option in transactionTypeOptions" :key="option.value"
                :color="selectedTypes.includes(option.value) ? 'primary' : 'neutral'"
                :variant="selectedTypes.includes(option.value) ? 'solid' : 'outline'" size="sm"
                @click="toggleType(option.value)">
                {{ option.label }}
              </UButton>
            </div>
          </UFormField>

          <!-- Enable Button -->
          <UButton color="primary" class="w-full" icon="i-lucide-radio" :disabled="!canEnable" :loading="isLoading"
            @click="enableSignerMode">
            Start Advertising
          </UButton>

          <p class="text-xs text-muted text-center">
            Other users will be able to discover you and request your signature.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
