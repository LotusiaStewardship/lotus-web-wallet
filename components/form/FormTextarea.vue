<script setup lang="ts">
/**
 * Form Textarea Component
 *
 * A styled textarea with integrated label, description, and error handling.
 * Wraps UTextarea with FormField for consistent form styling.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    description?: string
    error?: string | null
    required?: boolean
    placeholder?: string
    rows?: number
    disabled?: boolean
    autofocus?: boolean
  }>(),
  {
    modelValue: '',
    rows: 3,
    required: false,
    disabled: false,
    autofocus: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})
</script>

<template>
  <FormField :label="label" :description="description" :error="error" :required="required">
    <UTextarea v-model="inputValue" :placeholder="placeholder" :rows="rows" :disabled="disabled" :autofocus="autofocus"
      :color="error ? 'error' : undefined" class="w-full" />
  </FormField>
</template>
