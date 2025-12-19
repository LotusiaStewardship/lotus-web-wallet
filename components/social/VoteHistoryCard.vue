<script setup lang="ts">
/**
 * SocialVoteHistoryCard
 *
 * Card showing vote history for a profile.
 */
const props = defineProps<{
  /** Vote history */
  votes: Array<{
    txid: string
    voterAddress: string
    platform: string
    profileId: string
    profileName: string
    amount: string | bigint
    isPositive: boolean
    timestamp: number
  }>
  /** Loading state */
  loading?: boolean
  /** Has more votes to load */
  hasMore?: boolean
  /** Loading more state */
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  loadMore: []
  clickVote: [txid: string]
}>()
</script>

<template>
  <UiAppCard title="Recent Votes" icon="i-lucide-history" :no-padding="true">
    <!-- Loading -->
    <div v-if="loading" class="p-4">
      <AppLoadingState message="Loading votes..." size="sm" />
    </div>

    <!-- Votes -->
    <div v-else-if="votes.length" class="divide-y divide-default">
      <SocialActivityItem v-for="vote in votes" :key="vote.txid" :activity="vote"
        @click="emit('clickVote', vote.txid)" />
    </div>

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-history" title="No votes yet"
      description="Be the first to vote on this profile" />

    <!-- Load More -->
    <div v-if="hasMore" class="p-4 text-center border-t border-default">
      <UButton color="neutral" variant="ghost" :loading="loadingMore" @click="emit('loadMore')">
        Load More
      </UButton>
    </div>
  </UiAppCard>
</template>
