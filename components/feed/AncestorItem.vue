<script setup lang="ts">
/**
 * Ancestor Item Component
 *
 * Renders a single post in the ancestor chain above a RNKC comment on the
 * post detail page. Mirrors the Twitter/X "view full conversation" pattern:
 * each ancestor is shown with a vertical connector line running down from its
 * avatar to the next item, visually chaining the thread from genesis → current.
 *
 * Supports both Lotusia (text) and external platform (Twitter embed / link)
 * ancestors, since a comment can reply to any platform's content.
 *
 * Strategy compliance:
 *   R1 (Vote-to-Reveal): Burn amounts and sentiment hidden — ancestors are
 *     independent posts the viewer may not have voted on. Only bucketed vote
 *     count shown; full sentiment requires navigating to the ancestor's detail page.
 *   R38 (Curation language): "Endorse"/"Flag" framing on detail page, not here.
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R1
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import type { PostData } from '~/composables/useRankApi'
import { PlatformURL } from '~/composables/useRankApi'
import { bucketVoteCount } from '~/utils/feed'
import { useTime } from '~/composables/useTime'

const props = defineProps<{
  post: PostData
  /** Whether to draw the vertical connector line below this ancestor */
  showConnector?: boolean
}>()

const { timeAgo } = useTime()

const isLotusia = computed(() => props.post.platform === 'lotusia')
const isTwitter = computed(() => props.post.platform === 'twitter')

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[props.post.platform]
  if (!urlHelper) return null
  return urlHelper.post(props.post.profileId, props.post.id)
})

const detailUrl = computed(() =>
  `/feed/${props.post.platform}/${props.post.profileId}/${props.post.id}`,
)

/** R1: Bucketed vote count — exact sentiment hidden until viewer votes on this post */
const totalVotes = computed(() => (props.post.votesPositive ?? 0) + (props.post.votesNegative ?? 0))
const bucketedVotesDisplay = computed(() => bucketVoteCount(totalVotes.value))

/** Formatted timestamp using shared useTime composable */
const formattedTime = computed(() => {
  const ts = props.post.timestamp || props.post.firstSeen || props.post.lastVoted
  if (!ts) return ''
  return timeAgo(Number(ts))
})
</script>

<template>
  <div class="py-1.5 pb-0">
    <FeedAuthorDisplay :platform="post.platform" :profile-id="post.profileId" size="md" :to="detailUrl"
      :time="formattedTime" :show-connector="showConnector" connector-min-height="16px">
      <template #inline>
        <!-- R1: Bucketed vote count only — no burn amount or sentiment direction -->
        <span class="text-xs text-gray-300 dark:text-gray-600">&middot;</span>
        <span class="text-xs text-gray-400">{{ bucketedVotesDisplay }}</span>
        <!-- External link for non-Lotusia posts -->
        <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
          class="ml-auto text-gray-400 hover:text-primary transition-colors" @click.stop>
          <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
        </a>
      </template>

      <!-- Content: Lotusia text or Twitter embed or platform link -->
      <NuxtLink :to="detailUrl" class="block group mt-0.5 mb-1">
        <p v-if="isLotusia && post.data"
          class="text-[14px] leading-snug text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words group-hover:opacity-90 transition-opacity line-clamp-3">
          {{ post.data }}
        </p>
        <div v-else-if="isTwitter" class="mt-1">
          <FeedXPostEmbed font-size="sm" :tweet-id="post.id" :profile-id="post.profileId" />
        </div>
        <p v-else class="text-sm text-gray-400 italic">
          {{ post.platform }} post · {{ post.id.slice(0, 12) }}...
        </p>
      </NuxtLink>
    </FeedAuthorDisplay>
  </div>
</template>
