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
}>(), {
  size: 'md',
  compact: false,
  showPlatformBadge: true,
  connectorMinHeight: '16px',
})

const { getAvatar } = useAvatars()
const { useResolve } = useFeedIdentity()

const identity = useResolve(() => props.platform, () => props.profileId)

const platformIcon = computed(() => PlatformIcon[props.platform] || 'i-lucide-globe')

const avatarUrl = ref<string | null>(null)
const avatarInitials = computed(() => getProfileInitials(props.profileId))

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
  <div class="flex gap-2.5">
    <!-- Left column: avatar + optional connector -->
    <div class="flex flex-col items-center flex-shrink-0" :class="showConnector ? 'pb-0' : ''">
      <NuxtLink :to="to" class="flex-shrink-0">
        <div class="relative">
          <UAvatar :src="avatarUrl || undefined" :alt="profileId" :text="avatarInitials" :size="size"
            :class="identity.isOwn ? 'ring-2 ring-primary/40' : ''" />
          <!-- Platform badge -->
          <div v-if="showPlatformBadge"
            class="absolute -bottom-0.5 -right-0.5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center ring-1 ring-white dark:ring-gray-900"
            :class="badgeSize.outer">
            <UIcon :name="platformIcon" class="text-gray-500 dark:text-gray-100" :class="badgeSize.icon" />
          </div>
        </div>
      </NuxtLink>
      <!-- Vertical connector line -->
      <div v-if="showConnector" class="w-0.5 flex-1 mt-1 bg-gray-200 dark:bg-gray-700 rounded-full"
        :style="{ minHeight: connectorMinHeight }" />
    </div>

    <!-- Right column: name + time + slot -->
    <div class="flex-1 min-w-0">
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

        <!-- Non-compact mode: two-line layout -->
        <div v-else>
          <!-- Line 1: Author name -->
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
          <!-- Line 2: Platform and time -->
          <div class="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
            <span class="capitalize">{{ platform }}</span>
            <span v-if="time">
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
