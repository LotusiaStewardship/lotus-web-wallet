<script setup lang="ts">
/**
 * FirstTimeTooltip Component
 *
 * Phase 6: Tooltip that only shows once per user.
 * Useful for explaining UI elements on first encounter.
 */
import { useDismissible } from '~/composables/useDismissible'

const props = withDefaults(
  defineProps<{
    /** Unique key for persistence */
    dismissKey: string
    /** Tooltip content */
    content: string
    /** Optional title */
    title?: string
    /** Tooltip placement */
    side?: 'top' | 'right' | 'bottom' | 'left'
    /** Show on first render */
    autoShow?: boolean
    /** Delay before showing (ms) */
    delay?: number
  }>(),
  {
    side: 'top',
    autoShow: true,
    delay: 500,
  },
)

const { isDismissed, dismiss } = useDismissible(props.dismissKey)

const isOpen = ref(false)
const hasShown = ref(false)

onMounted(() => {
  if (props.autoShow && !isDismissed.value && !hasShown.value) {
    setTimeout(() => {
      if (!isDismissed.value) {
        isOpen.value = true
        hasShown.value = true
      }
    }, props.delay)
  }
})

function handleDismiss() {
  dismiss(true)
  isOpen.value = false
}

function handleClose() {
  isOpen.value = false
}
</script>

<template>
  <UPopover v-model:open="isOpen" :side="side">
    <slot />

    <template #content>
      <div class="p-3 max-w-xs">
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-lightbulb" class="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p v-if="title" class="font-medium text-sm mb-1">{{ title }}</p>
            <p class="text-sm text-muted-foreground">{{ content }}</p>
          </div>
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" class="flex-shrink-0 -mt-1 -mr-1"
            @click="handleClose" />
        </div>
        <div class="flex justify-end mt-2">
          <UButton color="neutral" variant="soft" size="xs" @click="handleDismiss">
            Got it, don't show again
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
