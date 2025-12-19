<script setup lang="ts">
/**
 * FeatureIntro Component
 *
 * Phase 6: First-time feature introduction modal.
 * Shows once per feature, with "Don't show again" option.
 */
import { useDismissible } from '~/composables/useDismissible'

const props = withDefaults(
  defineProps<{
    /** Unique key for persistence */
    dismissKey: string
    /** Modal title */
    title: string
    /** Feature description */
    description: string
    /** Icon name */
    icon?: string
    /** List of use cases or benefits */
    useCases?: string[]
    /** Primary action label */
    actionLabel?: string
    /** Show modal automatically on first visit */
    autoShow?: boolean
  }>(),
  {
    icon: 'i-lucide-sparkles',
    actionLabel: 'Got it',
    autoShow: true,
  },
)

const emit = defineEmits<{
  action: []
  dismiss: []
}>()

const { isDismissed, dismiss } = useDismissible(props.dismissKey)

const isOpen = ref(false)
const dontShowAgain = ref(true)

onMounted(() => {
  if (props.autoShow && !isDismissed.value) {
    isOpen.value = true
  }
})

function handleAction() {
  dismiss(dontShowAgain.value)
  isOpen.value = false
  emit('action')
}

function handleDismiss() {
  dismiss(dontShowAgain.value)
  isOpen.value = false
  emit('dismiss')
}

function show() {
  isOpen.value = true
}

defineExpose({ show })
</script>

<template>
  <UModal v-model:open="isOpen" :title="title">
    <template #content>
      <div class="p-6 space-y-4">
        <!-- Icon and Title -->
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon :name="icon" class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">{{ title }}</h3>
          </div>
        </div>

        <!-- Description -->
        <p class="text-muted-foreground">{{ description }}</p>

        <!-- Use Cases -->
        <div v-if="useCases?.length" class="space-y-2">
          <p class="text-sm font-medium">What you can do:</p>
          <ul class="space-y-1.5">
            <li v-for="(useCase, index) in useCases" :key="index"
              class="flex items-start gap-2 text-sm text-muted-foreground">
              <UIcon name="i-lucide-check" class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span>{{ useCase }}</span>
            </li>
          </ul>
        </div>

        <!-- Don't show again -->
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input v-model="dontShowAgain" type="checkbox" class="rounded border-muted" />
          <span class="text-muted-foreground">Don't show this again</span>
        </label>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" @click="handleDismiss">
            Skip
          </UButton>
          <UButton color="primary" @click="handleAction">
            {{ actionLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
