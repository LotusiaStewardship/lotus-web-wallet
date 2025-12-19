<script setup lang="ts">
/**
 * SocialActivityItem
 *
 * List item showing a RANK vote activity.
 */
import { useContactsStore } from '~/stores/contacts'

const props = defineProps<{
  /** Activity data */
  activity: {
    txid: string
    voterAddress: string
    platform: string
    profileId: string
    profileName: string
    amount: string | bigint
    isPositive: boolean
    timestamp: number
  }
  /** Show profile link */
  showProfile?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const contactsStore = useContactsStore()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()
const { toFingerprint } = useAddress()

// Find contact for voter
const voterContact = computed(() =>
  contactsStore.contacts.find(c => c.address === props.activity.voterAddress),
)

const voterDisplay = computed(() =>
  voterContact.value?.name || toFingerprint(props.activity.voterAddress),
)

const isUpvote = computed(() => props.activity.isPositive)

const amountDisplay = computed(() => {
  const amount = typeof props.activity.amount === 'string'
    ? BigInt(props.activity.amount)
    : props.activity.amount
  return formatXPI(amount, { showUnit: false })
})

const platformIcon = computed(() => {
  const icons: Record<string, string> = {
    twitter: 'i-lucide-twitter',
    youtube: 'i-lucide-youtube',
    twitch: 'i-lucide-twitch',
    github: 'i-lucide-github',
  }
  return icons[props.activity.platform] || 'i-lucide-user'
})
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    @click="emit('click')">
    <!-- Icon -->
    <div :class="[
      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
      isUpvote
        ? 'bg-success-100 dark:bg-success-900/30'
        : 'bg-error-100 dark:bg-error-900/30',
    ]">
      <UIcon :name="isUpvote ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
        :class="isUpvote ? 'text-success' : 'text-error'" class="w-5 h-5" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm">
        <span class="font-medium">{{ voterDisplay }}</span>
        <span class="text-muted">
          voted {{ isUpvote ? '+' : '-' }}{{ amountDisplay }} XPI for
        </span>
        <NuxtLink v-if="showProfile" :to="`/social/${activity.platform}/${activity.profileId}`"
          class="font-medium hover:text-primary" @click.stop>
          @{{ activity.profileName }}
        </NuxtLink>
        <span v-else class="font-medium">@{{ activity.profileName }}</span>
      </p>
      <div class="flex items-center gap-2 mt-1">
        <UIcon :name="platformIcon" class="w-3 h-3 text-muted" />
        <span class="text-xs text-muted capitalize">{{ activity.platform }}</span>
      </div>
    </div>

    <!-- Time -->
    <div class="text-right flex-shrink-0">
      <p class="text-xs text-muted">{{ timeAgo(activity.timestamp) }}</p>
    </div>
  </div>
</template>
