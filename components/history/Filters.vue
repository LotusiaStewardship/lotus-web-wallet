<script setup lang="ts">
/**
 * HistoryFilters
 *
 * Filter buttons for transaction history.
 */
const props = defineProps<{
  /** Currently active filter */
  modelValue: string
  /** Search query */
  searchQuery?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:searchQuery': [value: string]
  export: []
}>()

const activeFilter = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const search = computed({
  get: () => props.searchQuery || '',
  set: (value: string) => emit('update:searchQuery', value),
})

const filters = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
  { value: 'coinbase', label: 'Mining' },
]
</script>

<template>
  <UiAppCard>
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-history" class="w-5 h-5" />
        <h1 class="text-xl font-semibold">Transaction History</h1>
      </div>

      <!-- Search -->
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search by address, amount, or note..." />

      <!-- Filter Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <UButton v-for="filter in filters" :key="filter.value" size="sm"
          :color="activeFilter === filter.value ? 'primary' : 'neutral'"
          :variant="activeFilter === filter.value ? 'solid' : 'outline'" @click="activeFilter = filter.value">
          {{ filter.label }}
        </UButton>

        <div class="flex-1" />

        <!-- Export Button -->
        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-download" @click="emit('export')">
          Export
        </UButton>
      </div>
    </div>
  </UiAppCard>
</template>
