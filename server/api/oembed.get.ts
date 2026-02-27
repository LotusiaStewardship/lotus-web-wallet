/**
 * Nitro server proxy for Twitter/X oEmbed API.
 *
 * The publish.twitter.com/oembed endpoint does not send CORS headers
 * for browser-origin requests. This server route proxies the request
 * so the browser fetches from our own origin (no CORS issue).
 *
 * Usage: GET /api/oembed?url=https://twitter.com/user/status/123
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tweetUrl = query.url as string | undefined

  if (!tweetUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required "url" query parameter',
    })
  }

  // Validate the URL points to a Twitter/X tweet
  const isValidUrl =
    tweetUrl.startsWith('https://twitter.com/') ||
    tweetUrl.startsWith('https://x.com/')
  if (!isValidUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'URL must be a twitter.com or x.com URL',
    })
  }

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&dnt=true`
    const data = await $fetch(oembedUrl)
    return data
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.message || 'Failed to fetch oEmbed data',
    })
  }
})
