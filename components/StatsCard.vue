<script setup lang="ts">
interface StatsCardProps {
  value: string | number
  label: string
  mono?: boolean
}

const props = withDefaults(defineProps<StatsCardProps>(), {
  mono: false,
})
</script>

<template>
  <div class="text-center">
    <p :class="['text-2xl font-bold', { 'font-mono': mono }]">{{ value }}</p>
    <p class="text-sm text-muted">{{ label }}</p>
  </div>
</template>
