<script setup lang="ts">
/**
 * Address Display Component
 *
 * Displays an address with contact resolution and optional amount.
 * Shows contact info if the address belongs to a known contact.
 */
import { usePeopleStore } from '~/stores/people'

const props = defineProps<{
  address: string
  amount?: number | string
  showActions?: boolean
}>()

const peopleStore = usePeopleStore()
const { openAddContactModal } = useOverlays()

const contact = computed(() => peopleStore.getByAddress(props.address))

const truncatedAddress = computed(() => {
  if (!props.address || props.address.length <= 20) return props.address || 'Unknown'
  return `${props.address.slice(0, 10)}...${props.address.slice(-6)}`
})

const amountValue = computed(() => {
  if (props.amount === undefined) return null
  const val = typeof props.amount === 'string' ? parseInt(props.amount) : props.amount
  return val
})

function formatXPI(sats: number): string {
  return (sats / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

async function addToContacts() {
  await openAddContactModal({ initialAddress: props.address })
}
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <!-- Contact Avatar (if known) -->
      <template v-if="contact">
        <PeoplePersonAvatar :person="contact" size="xs" />
        <div class="min-w-0">
          <p class="font-medium truncate">{{ contact.name }}</p>
          <code class="text-xs text-gray-500">{{ truncatedAddress }}</code>
        </div>
      </template>

      <!-- Unknown Address -->
      <template v-else>
        <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-wallet" class="w-3 h-3 text-gray-500" />
        </div>
        <code class="text-sm font-mono truncate">{{ truncatedAddress }}</code>
      </template>
    </div>

    <!-- Amount -->
    <div v-if="amountValue !== null" class="text-right flex-shrink-0">
      <p class="font-mono text-sm">{{ formatXPI(amountValue) }} XPI</p>
    </div>

    <!-- Actions -->
    <div v-if="showActions !== false" class="flex items-center gap-1 flex-shrink-0">
      <UButton v-if="!contact && address" variant="ghost" size="xs" icon="i-lucide-user-plus" title="Add to contacts"
        @click.stop.prevent="addToContacts" />
      <NuxtLink v-if="address" :to="`/explore/address/${address}`" @click.stop>
        <UButton variant="ghost" size="xs" icon="i-lucide-external-link" title="View address" />
      </NuxtLink>
    </div>
  </div>
</template>
