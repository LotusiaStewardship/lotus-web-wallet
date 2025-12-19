<script setup lang="ts">
/**
 * SharedWalletListSkeleton - Loading skeleton for shared wallet list
 *
 * Shows animated placeholder content while shared wallets are loading.
 */
interface Props {
  count?: number
}

withDefaults(defineProps<Props>(), {
  count: 2,
})
</script>

<template>
  <!-- Phase 6: Semantic color classes -->
  <div class="space-y-4">
    <div v-for="i in count" :key="i" class="animate-pulse">
      <div class="p-4 rounded-xl border border-default bg-background">
        <!-- Header -->
        <div class="flex items-start gap-3 mb-4">
          <!-- Icon skeleton -->
          <div class="w-12 h-12 bg-muted rounded-lg shrink-0" />

          <div class="flex-1">
            <!-- Name skeleton -->
            <div class="h-5 bg-muted rounded w-2/3 mb-2" />
            <!-- Participants skeleton -->
            <div class="h-4 bg-muted rounded w-1/2" />
          </div>

          <!-- Badge skeleton -->
          <div class="w-20 h-6 bg-muted rounded-full shrink-0" />
        </div>

        <!-- Balance skeleton -->
        <div class="flex items-center justify-between pt-3 border-t border-default">
          <div class="h-4 bg-muted rounded w-16" />
          <div class="h-6 bg-muted rounded w-24" />
        </div>
      </div>
    </div>
  </div>
</template>
