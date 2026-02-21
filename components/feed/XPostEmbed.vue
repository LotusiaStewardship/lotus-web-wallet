<script setup lang="ts">
/**
 * X/Twitter Post Content Component
 *
 * Fetches post content via the public Twitter oEmbed API and renders it
 * natively using the app's design system — no iframes, no widgets.js.
 *
 * Extracts only the post text, author name, and date from the oEmbed
 * response, discarding all X chrome (follow buttons, likes, replies, etc.).
 *
 * oEmbed endpoint: https://publish.twitter.com/oembed
 * - Public, no API key required
 * - Does NOT send CORS headers — proxied via /api/oembed Nitro server route
 * - Returns JSON with html field containing a <blockquote> with post text
 *
 * @see https://developer.x.com/en/docs/x-for-websites/oembed-api
 */

interface OEmbedResponse {
  url: string
  author_name: string
  author_url: string
  html: string
  width: number
  height: number | null
  type: string
  cache_age: string
  provider_name: string
  provider_url: string
  version: string
}

interface ParsedTweet {
  text: string
  authorName: string
  authorHandle: string
  date: string
  url: string
  // images: string[] // Removed - Twitter now requires auth for pic.twitter.com
}

const props = withDefaults(defineProps<{
  /** The tweet/post ID (numeric string) */
  tweetId: string
  /** The profile username (for fallback link and URL construction) */
  profileId?: string

  fontSize?: 'sm' | 'md' | 'lg'
}>(), {
  fontSize: 'md',
})

const fontSize = {
  'sm': 'text-[13px]',
  'md': 'text-[14px]',
  'lg': 'text-[16px]',
}

const loading = ref(true)
const error = ref(false)
const tweet = ref<ParsedTweet | null>(null)

const externalUrl = computed(() => {
  if (props.profileId) {
    return `https://x.com/${props.profileId}/status/${props.tweetId}`
  }
  return `https://x.com/i/status/${props.tweetId}`
})

/**
 * Parse the oEmbed HTML blockquote to extract the tweet text and date.
 *
 * The oEmbed html field looks like:
 *   <blockquote class="twitter-tweet" ...>
 *     <p lang="en" dir="ltr">Tweet text here<br><br>More text</p>
 *     &mdash; Author Name (@handle)
 *     <a href="...">February 13, 2026</a>
 *   </blockquote>
 */
function parseOEmbedHtml(html: string, authorName: string, authorUrl: string): ParsedTweet | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const blockquote = doc.querySelector('blockquote')
    if (!blockquote) return null

    // Extract tweet text from the <p> element
    const pEl = blockquote.querySelector('p')
    if (!pEl) return null

    // Convert <br> to newlines, then get text for display
    // We preserve the innerHTML to handle <br> tags properly
    const rawText = decodeHtmlEntities(
      pEl.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1') // Flatten links to text
        .replace(/<[^>]+>/g, '') // Strip remaining HTML
        .trim()
    )

    // Extract the date from the last <a> in the blockquote
    const links = blockquote.querySelectorAll('a')
    const dateLink = links[links.length - 1]
    const dateText = dateLink?.textContent?.trim() || ''

    // Extract handle from author_url (e.g., "https://twitter.com/TheArchivistLC" → "TheArchivistLC")
    const handleMatch = authorUrl.match(/twitter\.com\/(\w+)/) || authorUrl.match(/x\.com\/(\w+)/)
    const handle = handleMatch ? handleMatch[1] : props.profileId || ''

    return {
      text: rawText,
      authorName,
      authorHandle: handle,
      date: dateText,
      url: externalUrl.value,
      // images: imageUrls, // Removed - Twitter now requires auth for pic.twitter.com
    }
  } catch (err) {
    console.warn('[XPostEmbed] Failed to parse oEmbed HTML:', err)
    return null
  }
}

/**
 * Decode HTML entities (e.g., &gt; → >, &amp; → &, &quot; → ")
 * Uses a DOM element for safe decoding without regex vulnerabilities.
 */
function decodeHtmlEntities(html: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = html
  return textarea.value
}

async function fetchTweetContent() {
  loading.value = true
  error.value = false
  tweet.value = null

  const handle = props.profileId || 'i'
  const tweetUrl = `https://twitter.com/${handle}/status/${props.tweetId}`

  try {
    // Proxy through our Nitro server route to avoid CORS issues
    // (publish.twitter.com/oembed does not send CORS headers)
    const data = await $fetch<OEmbedResponse>('/api/oembed', {
      query: { url: tweetUrl },
    })
    const parsed = parseOEmbedHtml(data.html, data.author_name, data.author_url)

    if (parsed) {
      tweet.value = parsed
    } else {
      error.value = true
    }
  } catch (err) {
    console.warn('[XPostEmbed] Failed to fetch tweet:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchTweetContent)

watch(
  () => props.tweetId,
  () => fetchTweetContent(),
)
</script>

<template>
  <div class="x-post-embed">
    <!-- Loading Skeleton -->
    <div v-if="loading && !error">
      <div class="space-y-2">
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-5/6" />
        <USkeleton class="h-4 w-2/3" />
      </div>
      <div class="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <UIcon name="i-simple-icons-x" class="w-3 h-3" />
        <span>Loading post...</span>
      </div>
    </div>

    <!-- Rendered Tweet Content -->
    <div v-else-if="tweet" class="select-text">
      <p :class="`${fontSize} leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line`">
        {{ tweet.text }}
      </p>

      <!-- Note: Twitter images require authentication and cannot be embedded -->
      <!-- Users can click the link to view the original post with images -->
      <!-- <div class="mt-3">
        <a :href="externalUrl" target="_blank" rel="noopener"
          class="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View on X
          <UIcon name="i-lucide-external-link" class="w-3 h-3" />
        </a>
      </div> -->
    </div>

    <!-- Error Fallback -->
    <div v-else-if="error"
      class="rounded-lg border-1 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 mt-1 p-1.5">
      <span class="text-gray-500 dark:text-gray-400">This content is unavailable.</span>
    </div>
  </div>
</template>
