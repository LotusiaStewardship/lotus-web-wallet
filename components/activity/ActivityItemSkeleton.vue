<script setup lang="ts">
/**
 * Activity Item Skeleton
 *
 * Loading placeholder for ActivityItem component.
 */
</script>

<template>
  <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="flex items-start gap-3">
      <UiSkeleton width="40px" height="40px" rounded="full" />
      <div class="flex-1 space-y-2">
        <UiSkeleton width="60%" height="16px" />
        <UiSkeleton width="40%" height="12px" />
        <UiSkeleton width="80px" height="12px" />
      </div>
    </div>
  </div>
</template>
