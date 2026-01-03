<script setup lang="ts">
/**
 * Shared Wallet Card Component
 *
 * Displays a shared wallet with participants and balance.
 */
import type { SharedWallet } from '~/types/people'
import { formatXPI } from '~/utils/formatting'
import { usePeopleStore } from '~/stores/people'

const props = withDefaults(
  defineProps<{
    wallet: SharedWallet
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

const peopleStore = usePeopleStore()

const participantPeople = computed(() =>
  props.wallet.participants
    .map(participant => peopleStore.getById(participant.personId))
    .filter((p): p is NonNullable<typeof p> => p !== undefined),
)
</script>

<template>
  <div :class="[
    'p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    'hover:shadow-md hover:border-primary/30 transition-all cursor-pointer',
  ]" @click="emit('click')">
    <div class="flex items-center gap-3">
      <!-- Icon -->
      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold truncate">{{ wallet.name }}</h3>
        <p class="text-sm text-gray-500">
          {{ wallet.participants.length }} participants •
          {{ wallet.threshold }}-of-{{ wallet.participants.length }}
        </p>
      </div>

      <!-- Balance -->
      <div class="text-right">
        <p class="font-mono font-medium">
          {{ formatXPI(wallet.balanceSats, { showSymbol: true, minDecimals: 2 }) }}
        </p>
      </div>
    </div>

    <!-- Participants preview (if not compact) -->
    <div v-if="!compact && participantPeople.length > 0" class="flex -space-x-2 mt-3">
      <PeoplePersonAvatar v-for="participant in participantPeople.slice(0, 4)" :key="participant.id"
        :person="participant" size="sm" class="ring-2 ring-white dark:ring-gray-900" />
      <div v-if="wallet.participants.length > 4"
        class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-900">
        +{{ wallet.participants.length - 4 }}
      </div>
    </div>
  </div>
</template>
