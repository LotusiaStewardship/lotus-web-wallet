<script setup lang="ts">
/**
 * SettingsDangerZone
 *
 * Danger zone section for destructive actions.
 */
const props = defineProps<{
  /** Action label */
  actionLabel: string
  /** Action description */
  description: string
  /** Confirmation text required */
  confirmText?: string
}>()

const emit = defineEmits<{
  confirm: []
}>()

const showConfirm = ref(false)
const confirmInput = ref('')

const canConfirm = computed(() => {
  if (!props.confirmText) return true
  return confirmInput.value.toLowerCase() === props.confirmText.toLowerCase()
})

function handleAction() {
  if (props.confirmText) {
    showConfirm.value = true
  } else {
    emit('confirm')
  }
}

function handleConfirm() {
  if (canConfirm.value) {
    emit('confirm')
    showConfirm.value = false
    confirmInput.value = ''
  }
}
</script>

<template>
  <div>
    <UButton color="error" variant="outline" icon="i-lucide-trash-2" @click="handleAction">
      {{ actionLabel }}
    </UButton>
    <p class="text-sm text-muted mt-2">{{ description }}</p>

    <!-- Confirmation Modal -->
    <UModal v-model:open="showConfirm">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-error" />
          <span class="font-semibold">Confirm Action</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UAlert color="error" icon="i-lucide-alert-circle">
            <template #description>
              This action cannot be undone. Please make sure you have backed up any important data.
            </template>
          </UAlert>

          <UFormField v-if="confirmText" :label="`Type '${confirmText}' to confirm`">
            <UInput v-model="confirmInput" :placeholder="confirmText" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-3">
          <UButton class="flex-1" color="neutral" variant="outline" @click="showConfirm = false">
            Cancel
          </UButton>
          <UButton class="flex-1" color="error" :disabled="!canConfirm" @click="handleConfirm">
            {{ actionLabel }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
