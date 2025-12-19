<script setup lang="ts">
/**
 * ContactListItem
 *
 * List item for displaying a contact with actions.
 */
import type { Contact } from '~/stores/contacts'

const props = defineProps<{
  /** Contact data */
  contact: Contact
}>()

const emit = defineEmits<{
  click: []
  send: []
  toggleFavorite: []
}>()

const { toFingerprint } = useAddress()
const { timeAgo } = useTime()

// Check if contact has P2P/signing capabilities
const isSigner = computed(() => !!props.contact.publicKey)

const isOnline = computed(() => {
  // Would check P2P status if available
  return false
})
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    @click="emit('click')">
    <!-- Avatar -->
    <ContactsContactAvatar :contact="contact" size="md" />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="font-medium truncate">{{ contact.name }}</p>
        <UIcon v-if="contact.isFavorite" name="i-lucide-star" class="w-4 h-4 text-warning flex-shrink-0" />
        <UBadge v-if="isSigner" color="primary" variant="subtle" size="xs">
          Signer
        </UBadge>
        <span v-if="isOnline" class="w-2 h-2 rounded-full bg-success flex-shrink-0" title="Online" />
      </div>
      <p class="text-sm text-muted truncate">
        {{ toFingerprint(contact.address) }}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      <UButton color="primary" variant="ghost" size="xs" icon="i-lucide-send" title="Send" @click.stop="emit('send')" />
      <UButton color="neutral" variant="ghost" size="xs" :icon="contact.isFavorite ? 'i-lucide-star' : 'i-lucide-star'"
        :class="contact.isFavorite && 'text-warning'"
        :title="contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        @click.stop="emit('toggleFavorite')" />
    </div>
  </div>
</template>
