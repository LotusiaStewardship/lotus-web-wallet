<script setup lang="ts">
/**
 * AppConfirmModal
 *
 * Confirmation modal for destructive or important actions.
 * Use when user needs to confirm before proceeding.
 */
const props = defineProps<{
  /** Modal title */
  title: string
  /** Confirmation message */
  message: string
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Confirm button color */
  confirmColor?: 'primary' | 'error' | 'warning'
  /** Icon to display */
  icon?: string
  /** Icon color class */
  iconColor?: string
  /** Loading state for confirm button */
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  open.value = false
  emit('cancel')
}

const iconColorClass = computed(() => {
  if (props.iconColor) return props.iconColor
  switch (props.confirmColor) {
    case 'error':
      return 'bg-error-100 dark:bg-error-900/30 text-error'
    case 'warning':
      return 'bg-warning-100 dark:bg-warning-900/30 text-warning'
    default:
      return 'bg-primary-100 dark:bg-primary-900/30 text-primary'
  }
})
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <div v-if="icon" class="w-8 h-8 rounded-lg flex items-center justify-center" :class="iconColorClass">
              <UIcon :name="icon" class="w-4 h-4" />
            </div>
            <span class="font-semibold">{{ title }}</span>
          </div>
        </template>

        <p class="text-muted">{{ message }}</p>
        <slot />

        <template #footer>
          <div class="flex gap-3">
            <UButton color="neutral" variant="outline" class="flex-1" :disabled="loading" @click="handleCancel">
              {{ cancelText || 'Cancel' }}
            </UButton>
            <UButton :color="confirmColor || 'primary'" class="flex-1" :loading="loading" @click="handleConfirm">
              {{ confirmText || 'Confirm' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
