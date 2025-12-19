<script setup lang="ts">
/**
 * SignerListSkeleton - Loading skeleton for signer list
 *
 * Shows animated placeholder content while signers are loading.
 */
interface Props {
  count?: number
}

withDefaults(defineProps<Props>(), {
  count: 3,
})
</script>

<template>
  <!-- Phase 6: Semantic color classes -->
  <div class="space-y-3">
    <div v-for="i in count" :key="i" class="animate-pulse">
      <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
        <!-- Avatar skeleton -->
        <div class="w-10 h-10 bg-muted rounded-full shrink-0" />

        <!-- Content skeleton -->
        <div class="flex-1 min-w-0">
          <div class="h-4 bg-muted rounded w-1/3 mb-2" />
          <div class="h-3 bg-muted rounded w-1/2" />
        </div>

        <!-- Status skeleton -->
        <div class="w-16 h-6 bg-muted rounded-full shrink-0" />
      </div>
    </div>
  </div>
</template>
