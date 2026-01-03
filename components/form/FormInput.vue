<script setup lang="ts">
/**
 * Form Input Component
 *
 * A styled text input with integrated label, description, and error handling.
 * Wraps UInput with FormField for consistent form styling.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    description?: string
    error?: string | null
    required?: boolean
    placeholder?: string
    type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
    icon?: string
    disabled?: boolean
    autofocus?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    required: false,
    disabled: false,
    autofocus: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'input', event: Event): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

function handleInput(event: Event) {
  emit('input', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

function handleFocus(event: FocusEvent) {
  emit('focus', event)
}
</script>

<template>
  <FormField :label="label" :description="description" :error="error" :required="required">
    <UInput v-model="inputValue" :type="type" :placeholder="placeholder" :icon="icon" :disabled="disabled"
      :autofocus="autofocus" :color="error ? 'error' : undefined" class="w-full" @input="handleInput" @blur="handleBlur"
      @focus="handleFocus" />
  </FormField>
</template>
