<script setup lang="ts">
/**
 * SettingsSelectItem
 *
 * Settings item with select dropdown.
 */
const props = defineProps<{
  /** Item label */
  label: string
  /** Item description */
  description?: string
  /** Selected value */
  modelValue: string
  /** Select options */
  options: Array<{ label: string; value: string }>
  /** Whether select is disabled */
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex items-center justify-between py-2">
    <div>
      <p class="font-medium" :class="{ 'text-muted': disabled }">{{ label }}</p>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>
    <USelect :model-value="modelValue" :options="options" option-attribute="label" value-attribute="value"
      :disabled="disabled" size="sm" class="w-32" @update:model-value="emit('update:modelValue', String($event))" />
  </div>
</template>
