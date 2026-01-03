<script setup lang="ts">
/**
 * Shared Wallet Card Skeleton
 *
 * Loading placeholder for SharedWalletCard component.
 */
</script>

<template>
  <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-3 mb-3">
      <UiSkeleton width="48px" height="48px" rounded="lg" />
      <div class="flex-1 space-y-2">
        <UiSkeleton width="140px" height="16px" />
        <UiSkeleton width="100px" height="12px" />
      </div>
    </div>
    <div class="flex items-center justify-between">
      <UiSkeleton width="80px" height="20px" />
      <UiSkeleton width="60px" height="12px" />
    </div>
  </div>
</template>
