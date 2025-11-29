<script setup lang="ts">
interface InstructionStepProps {
  number: number
  title: string
  description: string
  color?: 'primary' | 'success' | 'info' | 'warning' | 'error'
}

const props = withDefaults(defineProps<InstructionStepProps>(), {
  color: 'primary',
})
</script>

<template>
  <div class="flex gap-3">
    <div :class="[
      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
      `bg-${color}-100 dark:bg-${color}-900/20`
    ]">
      <span :class="['text-sm font-semibold', `text-${color}`]">{{ number }}</span>
    </div>
    <div>
      <p class="font-medium">{{ title }}</p>
      <p class="text-sm text-muted">{{ description }}</p>
    </div>
  </div>
</template>
