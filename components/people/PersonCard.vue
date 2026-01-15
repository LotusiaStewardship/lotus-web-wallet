<script setup lang="ts">
/**
 * Person Card Component
 *
 * Displays a person with avatar, name, address, and quick actions.
 */
import type { Person } from '~/utils/types/people'
import { truncateAddress, formatRelativeTime } from '~/utils/formatting'
import { usePersonContext } from '~/composables/usePersonContext'
import { useOverlays } from '~/composables/useOverlays'
import { useClipboard } from '~/composables/useClipboard'

const props = defineProps<{
  person: Person
}>()

// Use person context for actions and computed values
const {
  displayName,
  address,
  isOnline,
  isFavorite,
  canSign,
  send,
  toggleFavorite,
} = usePersonContext(props.person.id)

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'send'): void
  (e: 'favorite'): void
}>()

// Overlay management for edit/share functionality
const { openShareContactModal, openAddContactModal } = useOverlays()

// Clipboard functionality
const { copy } = useClipboard()

const truncatedAddress = computed(() => {
  const addr = address.value
  return addr ? truncateAddress(addr) : ''
})

const lastActivity = computed(() => {
  if (!props.person.lastActivityAt) return null
  return `Active ${formatRelativeTime(props.person.lastActivityAt)}`
})

const relationshipIndicators = computed(() => {
  const indicators: { icon: string; label: string }[] = []

  if (props.person.transactionCount > 0) {
    indicators.push({
      icon: 'i-lucide-repeat',
      label: `${props.person.transactionCount} transaction${props.person.transactionCount > 1 ? 's' : ''}`,
    })
  }

  if (props.person.sharedWalletIds.length > 0) {
    indicators.push({
      icon: 'i-lucide-shield',
      label: `${props.person.sharedWalletIds.length} shared wallet${props.person.sharedWalletIds.length > 1 ? 's' : ''}`,
    })
  }

  if (props.person.level >= 2) {
    indicators.push({
      icon: 'i-lucide-wifi',
      label: 'P2P enabled',
    })
  }

  return indicators
})

// Event handlers
async function handleSend() {
  await send()
}

function handleFavorite() {
  toggleFavorite()
}

async function handleEdit() {
  await openAddContactModal({
    editPerson: props.person
  })
}

async function handleShare() {
  await openShareContactModal({ person: props.person })
}

async function handleCopyAddress() {
  const addr = address.value
  if (addr) {
    await copy(addr, 'Address')
  }
}
</script>

<template>
  <div
    class="group p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
    @click="emit('click')">
    <div class="flex items-center gap-3">
      <!-- Avatar with presence -->
      <div class="relative">
        <PeoplePersonAvatar :person="person" size="md" />
        <span v-if="isOnline"
          class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-white dark:border-gray-900" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold truncate">{{ displayName }}</h3>
          <UIcon v-if="isFavorite" name="i-lucide-star" class="w-4 h-4 text-warning flex-shrink-0" />
          <UBadge v-if="canSign" color="primary" variant="subtle" size="xs">
            Signer
          </UBadge>
        </div>

        <p class="text-sm text-gray-500 truncate">
          {{ truncatedAddress }}
        </p>

        <p v-if="lastActivity" class="text-xs text-gray-500 mt-0.5">
          {{ lastActivity }}
        </p>
      </div>

      <!-- Desktop Quick Actions (shown on hover) -->
      <div class="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <UButton color="primary" variant="ghost" size="xs" icon="i-lucide-send" @click.stop="handleSend" />
        <UButton :color="isFavorite ? 'warning' : 'neutral'" variant="ghost" size="xs" icon="i-lucide-star"
          @click.stop="handleFavorite" />
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-share-2" @click.stop="handleShare" />
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-edit" @click.stop="handleEdit" />
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click.stop="handleCopyAddress" />
      </div>
    </div>

    <!-- Relationship indicators -->
    <div v-if="relationshipIndicators.length > 0"
      class="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div v-for="indicator in relationshipIndicators" :key="indicator.label"
        class="flex items-center gap-1 text-xs text-gray-500">
        <UIcon :name="indicator.icon" class="w-3 h-3" />
        <span>{{ indicator.label }}</span>
      </div>
    </div>

    <!-- Mobile Quick Actions Button Row -->
    <div class="md:hidden flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
      <UButtonGroup size="xs" class="flex w-full">
        <UButton class="flex-1 py-2 justify-center" color="primary" variant="soft" icon="i-lucide-send"
          @click.stop="handleSend" />
        <UButton class="flex-1 py-2 justify-center" :color="isFavorite ? 'warning' : 'neutral'" variant="soft"
          icon="i-lucide-star" @click.stop="handleFavorite" />
        <UButton class="flex-1 py-2 justify-center" color="neutral" variant="soft" icon="i-lucide-share-2"
          @click.stop="handleShare" />
        <UButton class="flex-1 py-2 justify-center" color="neutral" variant="soft" icon="i-lucide-edit"
          @click.stop="handleEdit" />
        <UButton class="flex-1 py-2 justify-center" color="neutral" variant="soft" icon="i-lucide-copy"
          @click.stop="handleCopyAddress" />
      </UButtonGroup>
    </div>
  </div>
</template>
