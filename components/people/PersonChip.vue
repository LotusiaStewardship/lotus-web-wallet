<script setup lang="ts">
/**
 * Person Chip Component
 *
 * Compact person display for the "Online Now" section.
 */
import type { Person } from '~/types/people'

defineProps<{
  person: Person
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button class="flex items-center gap-2 px-3 py-2 rounded-full bg-success/10 hover:bg-success/20 transition-colors"
    @click="emit('click')">
    <div class="relative">
      <PeoplePersonAvatar :person="person" size="xs" />
      <span
        class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-white dark:border-gray-900" />
    </div>
    <span class="text-sm font-medium">{{ person.name }}</span>
  </button>
</template>
