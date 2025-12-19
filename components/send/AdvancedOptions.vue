<script setup lang="ts">
/**
 * SendAdvancedOptions
 *
 * Advanced send options: fee rate, coin control, OP_RETURN.
 */
import { useDraftStore } from '~/stores/draft'
import { useWalletStore } from '~/stores/wallet'

const draftStore = useDraftStore()
const walletStore = useWalletStore()

const { formatXPI } = useAmount()

// Fee rate presets
const feePresets = [
  { label: 'Economy', rate: 1, description: '~10 min' },
  { label: 'Normal', rate: 2, description: '~5 min' },
  { label: 'Priority', rate: 5, description: '~1 min' },
]

// Custom fee rate
const customFeeRate = ref(draftStore.feeRate)

function setFeeRate(rate: number) {
  customFeeRate.value = rate
  draftStore.setFeeRate(rate)
}

// Coin control
const coinControlEnabled = ref(draftStore.selectedUtxos.length > 0)

watch(coinControlEnabled, (enabled) => {
  if (!enabled) {
    draftStore.setSelectedUtxos([])
  }
})

// Available UTXOs
const availableUtxos = computed(() => walletStore.getSpendableUtxos())

// Selected UTXOs
const selectedUtxos = computed(() => new Set(draftStore.selectedUtxos))

function toggleUtxo(outpoint: string) {
  const current = new Set(draftStore.selectedUtxos)
  if (current.has(outpoint)) {
    current.delete(outpoint)
  } else {
    current.add(outpoint)
  }
  draftStore.setSelectedUtxos(Array.from(current))
}

function selectAllUtxos() {
  const allOutpoints = availableUtxos.value.map(u => u.outpoint)
  draftStore.setSelectedUtxos(allOutpoints)
}

function clearUtxoSelection() {
  draftStore.setSelectedUtxos([])
}

// OP_RETURN
const opReturnEnabled = ref(!!draftStore.opReturn)
const opReturnData = ref(draftStore.opReturn?.data || '')

watch(opReturnEnabled, enabled => {
  if (!enabled) {
    draftStore.setOpReturn(null)
  }
})

watch(opReturnData, data => {
  if (opReturnEnabled.value && data) {
    draftStore.setOpReturn({ data, encoding: 'utf8' })
  }
})
</script>

<template>
  <UiAppCard title="Advanced Options" icon="i-lucide-settings">
    <div class="space-y-6">
      <!-- Fee Rate -->
      <div>
        <label class="text-sm font-medium mb-2 block">Fee Rate</label>
        <div class="flex gap-2 mb-2">
          <UButton v-for="preset in feePresets" :key="preset.rate" size="sm"
            :color="customFeeRate === preset.rate ? 'primary' : 'neutral'"
            :variant="customFeeRate === preset.rate ? 'solid' : 'outline'" @click="setFeeRate(preset.rate)">
            {{ preset.label }}
          </UButton>
        </div>
        <div class="flex items-center gap-2">
          <UInput v-model.number="customFeeRate" type="number" min="1" max="100" class="w-24"
            @change="setFeeRate(customFeeRate)" />
          <span class="text-sm text-muted">sat/byte</span>
        </div>
      </div>

      <!-- Coin Control -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Coin Control</label>
          <USwitch v-model="coinControlEnabled" />
        </div>

        <div v-if="coinControlEnabled" class="space-y-2">
          <div class="flex gap-2 mb-2">
            <UButton size="xs" variant="ghost" @click="selectAllUtxos">
              Select All
            </UButton>
            <UButton size="xs" variant="ghost" @click="clearUtxoSelection">
              Clear
            </UButton>
          </div>

          <div class="max-h-48 overflow-y-auto space-y-1">
            <button v-for="utxo in availableUtxos" :key="utxo.outpoint" type="button" :class="[
              'w-full p-2 rounded-lg text-left text-sm transition-colors',
              selectedUtxos.has(utxo.outpoint)
                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary'
                : 'bg-muted/30 hover:bg-muted/50 border border-transparent',
            ]" @click="toggleUtxo(utxo.outpoint)">
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs truncate max-w-[200px]">
                  {{ utxo.outpoint }}
                </span>
                <span class="font-medium">
                  {{ formatXPI(utxo.value, { showUnit: false }) }} XPI
                </span>
              </div>
            </button>
          </div>

          <p class="text-xs text-muted">
            Selected: {{ selectedUtxos.size }} of {{ availableUtxos.length }} UTXOs
          </p>
        </div>
      </div>

      <!-- OP_RETURN -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">OP_RETURN Data</label>
          <USwitch v-model="opReturnEnabled" />
        </div>

        <UTextarea v-if="opReturnEnabled" v-model="opReturnData" placeholder="Enter message or data (max 220 bytes)"
          :rows="2" :maxlength="220" class="w-full" />
        <p v-if="opReturnEnabled" class="text-xs text-muted mt-1">
          {{ opReturnData.length }}/220 bytes
        </p>
      </div>
    </div>
  </UiAppCard>
</template>
