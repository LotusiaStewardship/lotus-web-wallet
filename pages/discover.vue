<script setup lang="ts">
/**
 * Discover Page - Redirects to P2P Hub
 *
 * This page has been deprecated in favor of the new P2P hub at /p2p.
 * We keep this file to handle any existing links/bookmarks.
 */

definePageMeta({
  title: 'Discover',
})

const router = useRouter()

// Redirect to the new P2P hub
onMounted(() => {
  router.replace('/p2p')
})
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <div class="text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
      <p class="text-muted">Redirecting to P2P Hub...</p>
    </div>
  </div>
</template>
