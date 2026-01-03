<script setup lang="ts">
/**
 * Success Animation Component
 *
 * Animated checkmark circle for success states.
 */
const props = withDefaults(
  defineProps<{
    animate?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    animate: true,
    size: 'md',
  },
)

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
}

const circumference = 2 * Math.PI * 45
const checkLength = 60

const circleOffset = ref(props.animate ? circumference : 0)
const checkOffset = ref(props.animate ? checkLength : 0)

onMounted(() => {
  if (props.animate) {
    requestAnimationFrame(() => {
      circleOffset.value = 0
      checkOffset.value = 0
    })
  }
})
</script>

<template>
  <div :class="['relative', sizeClasses[size]]">
    <svg class="w-full h-full" viewBox="0 0 100 100">
      <!-- Circle -->
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4" class="text-success"
        :stroke-dasharray="circumference" :stroke-dashoffset="circleOffset"
        style="transition: stroke-dashoffset 0.5s ease-out" />

      <!-- Checkmark -->
      <path d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"
        stroke-linejoin="round" class="text-success" :stroke-dasharray="checkLength" :stroke-dashoffset="checkOffset"
        style="transition: stroke-dashoffset 0.3s ease-out 0.3s" />
    </svg>
  </div>
</template>
