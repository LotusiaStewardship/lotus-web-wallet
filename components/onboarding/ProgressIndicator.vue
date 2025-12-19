<script setup lang="ts">
/**
 * OnboardingProgressIndicator
 *
 * Progress indicator for onboarding steps.
 */
const props = defineProps<{
  /** Current step index (0-based) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Step labels */
  labels?: string[]
}>()

const steps = computed(() => {
  return Array.from({ length: props.totalSteps }, (_, i) => ({
    index: i,
    label: props.labels?.[i] || `Step ${i + 1}`,
    isComplete: i < props.currentStep,
    isCurrent: i === props.currentStep,
  }))
})
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <template v-for="(step, index) in steps" :key="index">
      <!-- Step Dot -->
      <div class="w-3 h-3 rounded-full transition-colors" :class="[
        step.isComplete ? 'bg-primary' :
          step.isCurrent ? 'bg-primary ring-2 ring-primary/30' :
            'bg-muted',
      ]" :title="step.label" />

      <!-- Connector -->
      <div v-if="index < steps.length - 1" class="w-8 h-0.5 transition-colors"
        :class="step.isComplete ? 'bg-primary' : 'bg-muted'" />
    </template>
  </div>
</template>
