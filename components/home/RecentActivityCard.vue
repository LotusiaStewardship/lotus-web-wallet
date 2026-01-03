<script setup lang="ts">
/**
 * Recent Activity Card Component
 *
 * Shows recent activity items with quick access to the full activity feed.
 */
import { useActivityStore } from '~/stores/activity'

const activityStore = useActivityStore()

const recentItems = computed(() => activityStore.recentActivity.slice(0, 5))

function handleItemClick(itemId: string) {
  activityStore.markAsRead(itemId)
  navigateTo('/activity')
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-activity" class="w-5 h-5" />
        <span class="font-semibold">Recent Activity</span>
        <UBadge v-if="activityStore.unreadCount > 0" color="primary" size="xs">
          {{ activityStore.unreadCount }} new
        </UBadge>
      </div>
      <NuxtLink to="/activity" class="text-sm text-primary hover:underline">
        View All
      </NuxtLink>
    </div>

    <div v-if="recentItems.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
      <ActivityItemCompact v-for="item in recentItems" :key="item.id" :item="item" @click="handleItemClick(item.id)" />
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No recent activity</p>
    </div>
  </div>
</template>
