<script setup lang="ts">
/**
 * ContextualHint
 *
 * Contextual hint popover for first-time feature discovery.
 */
import { useOnboardingStore, type FeatureHint } from '~/stores/onboarding'

const props = defineProps<{
  /** Unique hint ID */
  id: FeatureHint
  /** Hint title */
  title: string
  /** Hint description */
  description: string
  /** Popover position */
  position?: 'top' | 'bottom' | 'left' | 'right'
}>()

const onboardingStore = useOnboardingStore()

const show = computed(() => onboardingStore.shouldShowHint(props.id))

function dismiss() {
  onboardingStore.dismissHint(props.id)
}
</script>

<template>
  <UPopover v-if="show" :open="true">
    <slot />

    <template #content>
      <div class="p-3 max-w-xs">
        <div class="flex items-start gap-2 mb-2">
          <UIcon name="i-lucide-lightbulb" class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium">{{ title }}</p>
            <p class="text-sm text-muted">{{ description }}</p>
          </div>
        </div>
        <UButton size="xs" color="neutral" variant="ghost" @click="dismiss">
          Got it
        </UButton>
      </div>
    </template>
  </UPopover>

  <slot v-else />
</template>
