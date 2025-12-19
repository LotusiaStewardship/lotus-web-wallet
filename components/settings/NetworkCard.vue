<script setup lang="ts">
/**
 * SettingsNetworkCard
 *
 * Network selection card.
 */
const props = defineProps<{
  /** Network ID */
  id: string
  /** Network name */
  name: string
  /** Network description */
  description: string
  /** Icon name */
  icon: string
  /** Icon background class */
  iconBg?: string
  /** Icon color class */
  iconColor?: string
  /** Whether this network is selected */
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button type="button"
    class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors w-full text-left" :class="[
      selected
        ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
        : 'border-default hover:border-primary/50',
    ]" @click="emit('select')">
    <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="iconBg || 'bg-muted'">
      <UIcon :name="icon" :class="iconColor || 'text-muted'" class="w-5 h-5" />
    </div>
    <div class="flex-1">
      <p class="font-medium">{{ name }}</p>
      <p class="text-sm text-muted">{{ description }}</p>
    </div>
    <UIcon v-if="selected" name="i-lucide-check-circle" class="w-5 h-5 text-primary" />
  </button>
</template>
