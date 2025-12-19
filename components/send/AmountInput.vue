<script setup lang="ts">
/**
 * SendAmountInput
 *
 * Amount input with XPI/sats toggle and max button.
 */
const props = defineProps<{
  /** Amount in satoshis (as string for BigInt compatibility) */
  modelValue: string
  /** Maximum sendable amount */
  max?: string
  /** Validation error */
  error?: string | null
  /** Disabled state */
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  setMax: []
}>()

const { satsToXPI, xpiToSats, formatXPI } = useAmount()

// Display mode: XPI or sats
const displayMode = ref<'xpi' | 'sats'>('xpi')

// Input value in current display mode
const displayValue = ref('')

// Initialize display value from model
watch(
  () => props.modelValue,
  newValue => {
    if (!newValue || newValue === '0') {
      displayValue.value = ''
      return
    }
    try {
      const sats = BigInt(newValue)
      if (displayMode.value === 'xpi') {
        displayValue.value = satsToXPI(sats)
      } else {
        displayValue.value = sats.toString()
      }
    } catch {
      displayValue.value = ''
    }
  },
  { immediate: true },
)

// Update model when display value changes
function handleInput(value: string) {
  displayValue.value = value

  if (!value || value === '') {
    emit('update:modelValue', '0')
    return
  }

  try {
    let sats: bigint
    if (displayMode.value === 'xpi') {
      sats = xpiToSats(value)
    } else {
      sats = BigInt(value)
    }
    emit('update:modelValue', sats.toString())
  } catch {
    // Invalid input, don't update model
  }
}

// Toggle display mode
function toggleMode() {
  const currentSats = props.modelValue ? BigInt(props.modelValue) : 0n

  if (displayMode.value === 'xpi') {
    displayMode.value = 'sats'
    displayValue.value = currentSats > 0n ? currentSats.toString() : ''
  } else {
    displayMode.value = 'xpi'
    displayValue.value = currentSats > 0n ? satsToXPI(currentSats) : ''
  }
}

// Max amount display
const maxDisplay = computed(() => {
  if (!props.max) return null
  try {
    return formatXPI(props.max, { showUnit: false })
  } catch {
    return null
  }
})

// Handle max button
function handleMax() {
  emit('setMax')
}
</script>

<template>
  <div>
    <div class="flex gap-2">
      <UInput :model-value="displayValue" type="text" inputmode="decimal"
        :placeholder="displayMode === 'xpi' ? '0.00' : '0'" :disabled="disabled" :color="error ? 'error' : undefined"
        class="flex-1 font-mono" @update:model-value="handleInput">
        <template #trailing>
          <button type="button" class="text-sm font-medium text-primary hover:text-primary-600 transition-colors"
            :disabled="disabled" @click="toggleMode">
            {{ displayMode === 'xpi' ? 'XPI' : 'sats' }}
          </button>
        </template>
      </UInput>

      <UButton color="neutral" variant="outline" :disabled="disabled || !max" @click="handleMax">
        Max
      </UButton>
    </div>

    <!-- Available balance -->
    <div class="mt-2 flex items-center justify-between text-sm">
      <span v-if="maxDisplay" class="text-muted">
        Available: {{ maxDisplay }} XPI
      </span>
      <span v-if="error" class="text-error">
        {{ error }}
      </span>
    </div>
  </div>
</template>
