<script setup lang="ts">
/**
 * SetPinModal
 *
 * Modal for setting or changing wallet PIN.
 */
const props = defineProps<{
  /** Whether modal is open */
  open: boolean
  /** Mode: set new PIN or change existing */
  mode: 'set' | 'change'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  complete: []
}>()

const { success, error } = useNotifications()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Form state
const currentPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const step = ref<'current' | 'new' | 'confirm'>('new')

// Validation
const pinLength = 6
const isCurrentPinValid = computed(() => currentPin.value.length === pinLength)
const isNewPinValid = computed(() => newPin.value.length === pinLength)
const isPinsMatch = computed(() => newPin.value === confirmPin.value)

const canProceed = computed(() => {
  if (props.mode === 'change' && step.value === 'current') {
    return isCurrentPinValid.value
  }
  if (step.value === 'new') {
    return isNewPinValid.value
  }
  if (step.value === 'confirm') {
    return isPinsMatch.value && confirmPin.value.length === pinLength
  }
  return false
})

// Step titles
const stepTitle = computed(() => {
  if (props.mode === 'change' && step.value === 'current') {
    return 'Enter Current PIN'
  }
  if (step.value === 'new') {
    return props.mode === 'change' ? 'Enter New PIN' : 'Create PIN'
  }
  return 'Confirm PIN'
})

const stepDescription = computed(() => {
  if (props.mode === 'change' && step.value === 'current') {
    return 'Enter your current PIN to continue'
  }
  if (step.value === 'new') {
    return `Enter a ${pinLength}-digit PIN to protect your wallet`
  }
  return 'Re-enter your PIN to confirm'
})

// Actions
function handleNext() {
  if (props.mode === 'change' && step.value === 'current') {
    // TODO: Verify current PIN
    step.value = 'new'
    return
  }

  if (step.value === 'new') {
    step.value = 'confirm'
    return
  }

  if (step.value === 'confirm') {
    if (isPinsMatch.value) {
      // TODO: Save PIN securely
      emit('complete')
      isOpen.value = false
      resetForm()
    } else {
      error('PIN Mismatch', 'PINs do not match. Please try again.')
      confirmPin.value = ''
    }
  }
}

function handleBack() {
  if (step.value === 'confirm') {
    step.value = 'new'
    confirmPin.value = ''
  } else if (step.value === 'new' && props.mode === 'change') {
    step.value = 'current'
    newPin.value = ''
  }
}

function resetForm() {
  currentPin.value = ''
  newPin.value = ''
  confirmPin.value = ''
  step.value = props.mode === 'change' ? 'current' : 'new'
}

// Reset on open/close
watch(isOpen, open => {
  if (open) {
    resetForm()
  }
})

// Reset step when mode changes
watch(() => props.mode, () => {
  step.value = props.mode === 'change' ? 'current' : 'new'
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-lock" class="w-5 h-5 text-primary" />
        <span class="font-semibold">{{ stepTitle }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <p class="text-sm text-muted text-center">{{ stepDescription }}</p>

        <!-- PIN Input -->
        <div class="flex justify-center">
          <div class="flex gap-2">
            <template v-if="mode === 'change' && step === 'current'">
              <input v-for="i in pinLength" :key="`current-${i}`" type="password" inputmode="numeric" maxlength="1"
                class="w-10 h-12 text-center text-xl font-bold border-2 border-default rounded-lg focus:border-primary focus:outline-none bg-transparent"
                :value="currentPin[i - 1] || ''" @input="(e) => {
                  const val = (e.target as HTMLInputElement).value
                  currentPin = currentPin.slice(0, i - 1) + val + currentPin.slice(i)
                  if (val && i < pinLength) {
                    ((e.target as HTMLInputElement).nextElementSibling as HTMLInputElement)?.focus()
                  }
                }" @keydown.backspace="(e) => {
                  if (!currentPin[i - 1] && i > 1) {
                    ((e.target as HTMLInputElement).previousElementSibling as HTMLInputElement)?.focus()
                  }
                }" />
            </template>

            <template v-else-if="step === 'new'">
              <input v-for="i in pinLength" :key="`new-${i}`" type="password" inputmode="numeric" maxlength="1"
                class="w-10 h-12 text-center text-xl font-bold border-2 border-default rounded-lg focus:border-primary focus:outline-none bg-transparent"
                :value="newPin[i - 1] || ''" @input="(e) => {
                  const val = (e.target as HTMLInputElement).value
                  newPin = newPin.slice(0, i - 1) + val + newPin.slice(i)
                  if (val && i < pinLength) {
                    ((e.target as HTMLInputElement).nextElementSibling as HTMLInputElement)?.focus()
                  }
                }" @keydown.backspace="(e) => {
                  if (!newPin[i - 1] && i > 1) {
                    ((e.target as HTMLInputElement).previousElementSibling as HTMLInputElement)?.focus()
                  }
                }" />
            </template>

            <template v-else>
              <input v-for="i in pinLength" :key="`confirm-${i}`" type="password" inputmode="numeric" maxlength="1"
                class="w-10 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none bg-transparent"
                :class="[
                  confirmPin.length === pinLength
                    ? isPinsMatch ? 'border-success' : 'border-error'
                    : 'border-default focus:border-primary'
                ]" :value="confirmPin[i - 1] || ''" @input="(e) => {
                  const val = (e.target as HTMLInputElement).value
                  confirmPin = confirmPin.slice(0, i - 1) + val + confirmPin.slice(i)
                  if (val && i < pinLength) {
                    ((e.target as HTMLInputElement).nextElementSibling as HTMLInputElement)?.focus()
                  }
                }" @keydown.backspace="(e) => {
                if (!confirmPin[i - 1] && i > 1) {
                  ((e.target as HTMLInputElement).previousElementSibling as HTMLInputElement)?.focus()
                }
              }" />
            </template>
          </div>
        </div>

        <!-- Mismatch Warning -->
        <p v-if="step === 'confirm' && confirmPin.length === pinLength && !isPinsMatch"
          class="text-sm text-error text-center">
          PINs do not match
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3">
        <UButton v-if="step !== 'new' || mode === 'change'" class="flex-1" color="neutral" variant="outline"
          @click="step === 'new' && mode !== 'change' ? (isOpen = false) : handleBack()">
          {{ step === 'new' && mode !== 'change' ? 'Cancel' : 'Back' }}
        </UButton>
        <UButton v-else class="flex-1" color="neutral" variant="outline" @click="isOpen = false">
          Cancel
        </UButton>
        <UButton class="flex-1" color="primary" :disabled="!canProceed" @click="handleNext">
          {{ step === 'confirm' ? 'Set PIN' : 'Next' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
