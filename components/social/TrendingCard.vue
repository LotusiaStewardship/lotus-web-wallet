<script setup lang="ts">
/**
 * SocialTrendingCard
 *
 * Card showing trending social profiles.
 */
const props = defineProps<{
  /** Trending profiles */
  profiles: Array<{
    id: string
    platform: string
    profileId: string
    displayName: string
    avatarUrl?: string
    rank: number
    rankChange?: number
    totalVotes: number
    positiveVotes: bigint | string
    negativeVotes: bigint | string
  }>
  /** Loading state */
  loading?: boolean
  /** Maximum items to show */
  maxItems?: number
}>()

const emit = defineEmits<{
  vote: [profile: any, type: 'up' | 'down']
  view: [profile: any]
}>()

const displayProfiles = computed(() =>
  props.profiles.slice(0, props.maxItems || 10),
)
</script>

<template>
  <UiAppCard title="Trending Profiles" icon="i-lucide-trending-up" :action="{ label: 'View All', to: '/social' }">
    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading profiles..." size="sm" />

    <!-- Profiles -->
    <div v-else-if="displayProfiles.length" class="divide-y divide-default -mx-4">
      <SocialProfileCard v-for="(profile, index) in displayProfiles" :key="profile.id" :profile="profile"
        :rank="index + 1" @vote="type => emit('vote', profile, type)" @view="emit('view', profile)" />
    </div>

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-users" title="No profiles found"
      description="Be the first to vote on a social profile" />
  </UiAppCard>
</template>
