<script setup lang="ts">
/**
 * SettingsToggleItem
 *
 * Settings item with toggle switch.
 */
const props = defineProps<{
  /** Item label */
  label: string
  /** Item description */
  description?: string
  /** Toggle value */
  modelValue: boolean
  /** Whether toggle is disabled */
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <div class="flex items-center justify-between py-2">
    <div>
      <p class="font-medium" :class="{ 'text-muted': disabled }">{{ label }}</p>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>
    <USwitch :model-value="modelValue" :disabled="disabled" @update:model-value="emit('update:modelValue', $event)" />
  </div>
</template>
