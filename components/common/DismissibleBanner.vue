<script setup lang="ts">
/**
 * DismissibleBanner Component
 *
 * Phase 6: Dismissible banner with "Don't show again" option.
 * Per 07_HUMAN_CENTERED_UX.md - all educational UI must be dismissible.
 */
import { useDismissible } from '~/composables/useDismissible'

const props = withDefaults(
  defineProps<{
    /** Unique key for persistence */
    dismissKey: string
    /** Banner title */
    title: string
    /** Optional description */
    description?: string
    /** Icon name */
    icon?: string
    /** Color variant */
    variant?: 'info' | 'success' | 'warning' | 'neutral'
    /** Show "Don't show again" checkbox */
    showDontShowAgain?: boolean
    /** Allow dismissal */
    dismissible?: boolean
  }>(),
  {
    variant: 'info',
    showDontShowAgain: true,
    dismissible: true,
  },
)

const emit = defineEmits<{
  dismiss: []
}>()

const { isDismissed, dismiss } = useDismissible(props.dismissKey)

const dontShowAgain = ref(false)

function handleDismiss() {
  dismiss(dontShowAgain.value)
  emit('dismiss')
}

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success/10 border-success/20 text-success-700 dark:text-success-300'
    case 'warning':
      return 'bg-warning/10 border-warning/20 text-warning-700 dark:text-warning-300'
    case 'neutral':
      return 'bg-muted/50 border-muted text-muted-foreground'
    default:
      return 'bg-info/10 border-info/20 text-info-700 dark:text-info-300'
  }
})

const iconName = computed(() => {
  if (props.icon) return props.icon
  switch (props.variant) {
    case 'success':
      return 'i-lucide-check-circle'
    case 'warning':
      return 'i-lucide-alert-triangle'
    default:
      return 'i-lucide-info'
  }
})
</script>

<template>
  <div v-if="!isDismissed" :class="['rounded-lg border p-4', variantClasses]">
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <UIcon :name="iconName" class="w-5 h-5 flex-shrink-0 mt-0.5" />

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="font-medium">{{ title }}</p>
        <p v-if="description" class="text-sm opacity-80 mt-1">
          {{ description }}
        </p>

        <!-- Actions slot -->
        <div v-if="$slots.actions" class="mt-3">
          <slot name="actions" />
        </div>

        <!-- Don't show again checkbox -->
        <div v-if="showDontShowAgain && dismissible" class="mt-3">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="dontShowAgain" type="checkbox" class="rounded border-current" />
            <span class="opacity-80">Don't show this again</span>
          </label>
        </div>
      </div>

      <!-- Dismiss button -->
      <UButton v-if="dismissible" color="neutral" variant="ghost" size="xs" icon="i-lucide-x"
        class="flex-shrink-0 -mt-1 -mr-1" @click="handleDismiss" />
    </div>
  </div>
</template>
