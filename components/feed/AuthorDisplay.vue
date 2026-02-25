<script setup lang="ts">
/**
 * Feed Author Component
 *
 * Unified author display for all feed contexts: activity stream, post cards,
 * ancestor items, comment items, and detail page headers. Provides consistent:
 *   - Avatar with platform badge and own-post ring
 *   - Contact name resolution (scriptPayload → address → contact store)
 *   - Truncated address/profileId fallback
 *   - Timestamp display
 *
 * Replaces ad-hoc author rendering across 6+ components with a single source
 * of truth for identity display in the social feed.
 *
 * @see composables/useFeedIdentity.ts — identity resolution logic
 */
import { PlatformIcon } from '~/composables/useRankApi'
import { getProfileInitials } from '~/composables/useAvatars'

const props = withDefaults(defineProps<{
  /** Platform identifier (lotusia, twitter, etc.) */
  platform: string
  /** Profile identifier (scriptPayload for Lotusia, handle for external) */
  profileId: string
  /** Avatar size: xs, sm, md, lg, xl */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Show platform badge overlay on avatar */
  showPlatformBadge?: boolean
  /** Formatted timestamp string (e.g. "2h ago") */
  time?: string
  /** Link target for clicking the author name/avatar */
  to?: string
  /** Whether to show the vertical connector line below the avatar */
  showConnector?: boolean
  /** Minimum height for the connector line */
  connectorMinHeight?: string
  /** Show user icon badge to indicate this is a profile (not a post) */
  showProfileBadge?: boolean
}>(), {
  size: 'xl',
  compact: true,
  showPlatformBadge: true,
  connectorMinHeight: '16px',
  showProfileBadge: false,
})

const { getAvatar } = useAvatars()
const { useResolve } = useFeedIdentity()

const identity = useResolve(() => props.platform, () => props.profileId)

const platformIcon = computed(() => PlatformIcon[props.platform] || 'i-lucide-globe')

const avatarUrl = ref<string | null>(null)
const avatarInitials = computed(() => getProfileInitials(props.profileId))

/** Left column explicit width matching avatar size — ensures connector always centers under avatar */
const avatarColWidth = computed(() => {
  switch (props.size) {
    case 'xs': return 'w-6'
    case 'sm': return 'w-7'
    case 'md': return 'w-8'
    case 'lg': return 'w-9'
    case 'xl': return 'w-10'
    default: return 'w-10'
  }
})

/** Platform badge sizing relative to avatar size */
const badgeSize = computed(() => {
  switch (props.size) {
    case 'xs': return { outer: 'w-3 h-3', icon: 'w-1.5 h-1.5' }
    case 'sm': return { outer: 'w-3.5 h-3.5', icon: 'w-2 h-2' }
    case 'md': return { outer: 'w-4 h-4', icon: 'w-2.5 h-2.5' }
    case 'lg': return { outer: 'w-4 h-4', icon: 'w-2.5 h-2.5' }
    case 'xl': return { outer: 'w-5 h-5', icon: 'w-3 h-3' }
    // Default to medium
    default: return { outer: 'w-4 h-4', icon: 'w-2.5 h-2.5' }
  }
})

onMounted(async () => {
  const avatar = await getAvatar(props.platform, props.profileId)
  avatarUrl.value = avatar.src
})
</script>

<template>
  <div class="flex items-start gap-3">
    <!-- Left column: avatar + optional connector -->
    <div class="flex flex-col items-center flex-shrink-0 self-stretch"
      :class="[avatarColWidth, showConnector ? 'pb-0' : '']">
      <NuxtLink :to="to" class="flex-shrink-0">
        <div class="relative">
          <UAvatar :src="avatarUrl || undefined" :alt="profileId" :text="avatarInitials" :size="size" />
          <!-- Platform badge overlay (bottom-right) -->
          <div v-if="showPlatformBadge"
            class="absolute -bottom-0.5 -right-0.5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center"
            :class="badgeSize.outer">
            <UIcon :name="platformIcon" :class="badgeSize.icon" class="text-gray-600 dark:text-gray-400" />
          </div>
          <!-- Profile badge overlay (top-right) - user icon to distinguish profiles from posts -->
          <div v-if="showProfileBadge"
            class="absolute -top-0.5 -right-0.5 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center"
            :class="badgeSize.outer">
            <UIcon name="i-lucide-user" :class="badgeSize.icon" class="text-white" />
          </div>
        </div>
      </NuxtLink>
      <!-- Vertical connector line -->
      <div v-if="showConnector" class="w-0.5 flex-1 mt-1 bg-gray-200 dark:bg-gray-700 rounded-full"
        :style="{ minHeight: connectorMinHeight }" />
    </div>

    <!-- Right column: name + time + content slot -->
    <div class="flex-1 min-w-0 p-0">
      <NuxtLink :to="to">
        <!-- Compact mode: single line with name and time -->
        <div v-if="compact" class="flex items-center gap-1 flex-wrap">
          <span class="text-[15px] font-bold leading-5" :class="[
            to ? 'hover:underline' : '',
            identity.isOwn ? 'text-primary' : '',
          ]" :title="identity.lotusAddress || profileId">
            {{ identity.displayName }}
          </span>
          <span v-if="time" class="text-[13px] text-gray-500 dark:text-gray-400">
            <span class="text-gray-500 dark:text-gray-400 mx-0.5">&middot;</span>
            {{ time }}
          </span>
          <!-- Extra inline content (badges, vote counts, external links) -->
          <slot name="inline" />
        </div>

        <!-- Non-compact mode: single-line name + time + inline slot, then platform below -->
        <div v-else>
          <!-- Line 1: Author name + time + inline badges -->
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-[15px] font-bold leading-5" :class="[
              to ? 'hover:underline' : '',
              identity.isOwn ? 'text-primary' : '',
            ]" :title="identity.lotusAddress || profileId">
              {{ identity.displayName }}
            </span>
            <!-- Extra inline content (badges, vote counts, external links) -->
            <slot name="inline" />
          </div>
          <!-- Line 2: Platform, time -->
          <div class="text-[13px] text-gray-500 dark:text-gray-400 capitalize">{{ platform }}
            <span v-if="time" class="text-[13px] text-gray-500 dark:text-gray-400">
              <span class="text-gray-500 dark:text-gray-400 mx-0.5">&middot;</span>
              {{ time }}
            </span>
          </div>
        </div>
      </NuxtLink>

      <!-- Main content below author row -->
      <slot />
    </div>
  </div>
</template>
