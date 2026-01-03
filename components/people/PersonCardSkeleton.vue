<script setup lang="ts">
/**
 * Person Card Skeleton
 *
 * Loading placeholder for PersonCard component.
 */
</script>

<template>
  <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-3">
      <UiSkeleton width="40px" height="40px" rounded="full" />
      <div class="flex-1 space-y-2">
        <UiSkeleton width="120px" height="16px" />
        <UiSkeleton width="180px" height="12px" />
      </div>
    </div>
  </div>
</template>
