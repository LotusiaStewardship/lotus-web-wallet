<script setup lang="ts">
/**
 * Comment Item Component
 *
 * Displays a single RNKC comment with burn weight, author, and collapse behavior.
 * Comments with negative net burn are collapsed by default.
 */
import type { RnkcComment } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'

const props = defineProps<{
  comment: RnkcComment
  /** Current nesting depth (max 3 levels) */
  depth?: number
}>()

const depth = computed(() => props.depth ?? 0)

const netBurn = computed(() => {
  if (!props.comment.netBurn) return 0n
  return BigInt(props.comment.netBurn)
})

const isNegative = computed(() => netBurn.value < 0n)
const isCollapsed = ref(isNegative.value)

const formattedBurn = computed(() =>
  formatXPI(props.comment.sats, { minDecimals: 0, maxDecimals: 2 }),
)

const formattedNetBurn = computed(() => {
  if (!props.comment.netBurn) return null
  const abs = netBurn.value < 0n ? -netBurn.value : netBurn.value
  const prefix = netBurn.value > 0n ? '+' : netBurn.value < 0n ? '-' : ''
  return prefix + formatXPI(abs.toString(), { minDecimals: 0, maxDecimals: 0 })
})

const truncatedAuthor = computed(() => {
  const sp = props.comment.scriptPayload
  if (!sp || sp.length < 12) return sp || 'Unknown'
  return sp.slice(0, 6) + '...' + sp.slice(-6)
})

const timeAgo = computed(() => {
  const ts = props.comment.timestamp || props.comment.firstSeen
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
})

const hasReplies = computed(() =>
  props.comment.replies && props.comment.replies.length > 0,
)
</script>

<template>
  <div
    class="group"
    :class="depth > 0 ? 'ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-700' : ''"
  >
    <!-- Collapsed state -->
    <button
      v-if="isCollapsed"
      class="w-full text-left py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      @click="isCollapsed = false"
    >
      <UIcon name="i-lucide-chevron-right" class="w-3 h-3 inline mr-1" />
      Comment hidden (negative score) — tap to expand
    </button>

    <!-- Expanded state -->
    <div v-else class="py-2 space-y-1.5">
      <!-- Author + metadata row -->
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="font-mono">{{ truncatedAuthor }}</span>
        <span>·</span>
        <span>{{ timeAgo }}</span>
        <span>·</span>
        <span class="font-medium" :class="isNegative ? 'text-error-500' : 'text-success-500'">
          {{ formattedBurn }} XPI
        </span>
        <span
          v-if="formattedNetBurn"
          class="text-xs px-1.5 py-0.5 rounded-full"
          :class="isNegative
            ? 'bg-error-50 dark:bg-error-900/20 text-error-500'
            : 'bg-success-50 dark:bg-success-900/20 text-success-500'"
        >
          {{ formattedNetBurn }}
        </span>
        <!-- Collapse button for negative comments -->
        <button
          v-if="isNegative"
          class="ml-auto text-gray-400 hover:text-gray-600"
          @click="isCollapsed = true"
        >
          <UIcon name="i-lucide-chevron-up" class="w-3 h-3" />
        </button>
      </div>

      <!-- Comment content -->
      <p class="text-sm whitespace-pre-wrap break-words">
        {{ comment.content }}
      </p>

      <!-- Replies (recursive, max depth 3) -->
      <div v-if="hasReplies && depth < 3" class="mt-2 space-y-1">
        <FeedCommentItem
          v-for="reply in comment.replies"
          :key="reply.txid"
          :comment="reply"
          :depth="depth + 1"
        />
      </div>
    </div>
  </div>
</template>
