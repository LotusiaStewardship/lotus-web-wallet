<script setup lang="ts">
interface QuickActionCardProps {
  label: string
  icon: string
  to?: string
  color?: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
}

const props = withDefaults(defineProps<QuickActionCardProps>(), {
  color: 'primary',
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (!props.to) {
    emit('click')
  }
}
</script>

<template>
  <UCard class="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
    @click="to ? navigateTo(to) : handleClick()">
    <div class="flex flex-col items-center py-4">
      <div :class="[
        'w-12 h-12 rounded-full flex items-center justify-center mb-3',
        `bg-${color}-100 dark:bg-${color}-900/20`
      ]">
        <UIcon :name="icon" :class="['w-6 h-6', `text-${color}-500`]" />
      </div>
      <span class="font-medium">{{ label }}</span>
    </div>
  </UCard>
</template>
