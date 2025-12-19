<script setup lang="ts">
/**
 * CopyButton
 *
 * Button to copy text to clipboard with feedback.
 */
const props = defineProps<{
  /** Text to copy */
  text: string
  /** Success message */
  successMessage?: string
  /** Button size */
  size?: 'xs' | 'sm' | 'md'
  /** Show label */
  label?: string
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'solid'
}>()

const toast = useToast()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    toast.add({
      title: props.successMessage || 'Copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.add({
      title: 'Failed to copy',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}
</script>

<template>
  <UButton :size="size || 'sm'" color="neutral" :variant="variant || 'ghost'"
    :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" @click.stop="copy">
    {{ label }}
  </UButton>
</template>
