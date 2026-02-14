<script setup lang="ts">
/**
 * Activity Feed Page
 *
 * Unified activity feed showing all events from wallet, P2P, and MuSig2.
 * Features search, filtering, date grouping, and mark as read functionality.
 */
import { useActivityStore } from '~/stores/activity'

definePageMeta({
  title: 'Activity',
})

const activityStore = useActivityStore()


// Filter options
const filterOptions = computed(() => [
  { value: 'all' as const, label: 'All', count: activityStore.activityCounts.all },
  { value: 'transaction' as const, label: 'Transactions', count: activityStore.activityCounts.transaction },
  { value: 'system' as const, label: 'System', count: activityStore.activityCounts.system },
])

// Handle item click
function handleItemClick(item: ActivityItem) {
  activityStore.markAsRead(item.id)

  const data = item.data as ActivityData
  switch (data.type) {
    case 'transaction':
      navigateTo(`/explore/tx/${data.txid}`)
      break
  }
}

// Handle action button click
function handleAction(item: ActivityItem, actionId: string) {
  const action = item.actions?.find(a => a.id === actionId)
  if (action) {
    // TODO: Wire up action handlers in Phase 5
    console.log('Action triggered:', actionId, 'for item:', item.id)
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Activity</h1>
      <UButton v-if="activityStore.unreadCount > 0" variant="ghost" size="sm" @click="activityStore.markAllAsRead">
        Mark all read
      </UButton>
    </div>

    <!-- Search -->
    <UInput v-model="activityStore.searchQuery" icon="i-lucide-search" placeholder="Search activity..." />

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
      <UButton v-for="option in filterOptions" :key="option.value"
        :color="activityStore.filter === option.value ? 'primary' : 'neutral'"
        :variant="activityStore.filter === option.value ? 'solid' : 'ghost'" size="sm"
        @click="activityStore.filter = option.value">
        {{ option.label }}
        <UBadge v-if="option.count > 0" :color="activityStore.filter === option.value ? 'neutral' : 'primary'" size="xs"
          class="ml-1">
          {{ option.count }}
        </UBadge>
      </UButton>
    </div>

    <!-- Activity List (grouped by date) -->
    <div v-if="activityStore.filteredItems.length > 0" class="space-y-6">
      <div v-for="[date, items] in activityStore.groupedByDate" :key="date" class="space-y-2">
        <!-- Date Header -->
        <h3 class="text-sm font-medium text-gray-500 sticky top-0 bg-gray-50 dark:bg-gray-950 py-1 z-10">
          {{ date }}
        </h3>

        <!-- Items -->
        <div class="space-y-2">
          <ActivityItem v-for="item in items" :key="item.id" :item="item" @click="handleItemClick(item)"
            @action="(actionId: string) => handleAction(item, actionId)" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-medium mb-1">No activity yet</h3>
      <p class="text-gray-500 text-sm">
        Your transactions, signing requests, and other events will appear here.
      </p>
    </div>
  </div>
</template>
