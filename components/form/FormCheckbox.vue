<script setup lang="ts">
/**
 * Form Checkbox Component
 *
 * A styled checkbox with integrated label and description.
 * Provides consistent checkbox styling across forms.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    label?: string
    description?: string
    disabled?: boolean
  }>(),
  {
    modelValue: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const checked = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="space-y-1.5">
    <label class="flex items-start gap-3 cursor-pointer group">
      <UCheckbox v-model="checked" :disabled="disabled" class="mt-0.5" />
      <div class="flex-1">
        <span v-if="label"
          class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
          {{ label }}
        </span>
        <p v-if="description" class="text-xs text-gray-500 mt-0.5">
          {{ description }}
        </p>
      </div>
    </label>
  </div>
</template>
