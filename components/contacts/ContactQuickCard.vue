<script setup lang="ts">
/**
 * ContactQuickCard
 *
 * Compact contact card for favorites quick access.
 */
import type { Contact } from '~/stores/contacts'

const props = defineProps<{
  /** Contact data */
  contact: Contact
}>()

const emit = defineEmits<{
  click: []
  send: []
}>()
</script>

<template>
  <button type="button"
    class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors min-w-[80px]"
    @click="emit('click')">
    <ContactsAvatar :contact="contact" size="lg" />
    <span class="text-sm font-medium truncate max-w-[80px]">
      {{ contact.name }}
    </span>
  </button>
</template>
