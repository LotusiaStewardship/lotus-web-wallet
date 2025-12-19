<script setup lang="ts">
/**
 * P2PSettingsPanel
 *
 * P2P and signer settings panel.
 */
const props = defineProps<{
  /** Whether presence broadcasting is enabled */
  presenceEnabled: boolean
  /** Whether signer mode is enabled */
  signerEnabled: boolean
  /** Signer configuration */
  signerConfig?: {
    nickname?: string
    transactionTypes?: string[]
    fee?: number
  }
}>()

const emit = defineEmits<{
  togglePresence: [enabled: boolean]
  configureSigner: []
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- Presence Settings -->
    <UiAppCard title="Presence" icon="i-lucide-radio">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Broadcast Presence</p>
            <p class="text-sm text-muted">Let others see you're online</p>
          </div>
          <USwitch :model-value="presenceEnabled" @update:model-value="emit('togglePresence', $event)" />
        </div>

        <UAlert v-if="presenceEnabled" color="info" icon="i-lucide-info">
          <template #description>
            Other users can see that you're online and may send you signing requests.
          </template>
        </UAlert>
      </div>
    </UiAppCard>

    <!-- Signer Settings -->
    <UiAppCard title="Signer Mode" icon="i-lucide-pen-tool">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Advertise as Signer</p>
            <p class="text-sm text-muted">Offer to co-sign transactions for others</p>
          </div>
          <UBadge :color="signerEnabled ? 'success' : 'neutral'" variant="subtle">
            {{ signerEnabled ? 'Active' : 'Inactive' }}
          </UBadge>
        </div>

        <!-- Current Config -->
        <div v-if="signerEnabled && signerConfig" class="p-3 bg-muted/50 rounded-lg space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-muted">Nickname</span>
            <span class="font-medium">{{ signerConfig.nickname || 'Anonymous' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted">Transaction Types</span>
            <span class="font-medium">{{ signerConfig.transactionTypes?.join(', ') || 'All' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted">Fee</span>
            <span class="font-medium">{{ signerConfig.fee ? `${signerConfig.fee} XPI` : 'Free' }}</span>
          </div>
        </div>

        <UButton color="primary" variant="outline" icon="i-lucide-settings" block @click="emit('configureSigner')">
          {{ signerEnabled ? 'Configure Signer' : 'Become a Signer' }}
        </UButton>
      </div>
    </UiAppCard>

    <!-- Network Info -->
    <UiAppCard title="Network Info" icon="i-lucide-info">
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">Protocol</span>
          <span class="font-mono">libp2p</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Discovery</span>
          <span class="font-mono">DHT + mDNS</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Encryption</span>
          <span class="font-mono">Noise</span>
        </div>
      </div>
    </UiAppCard>
  </div>
</template>
