/**
 * Avatar composable
 * Handles profile avatar fetching and caching for social profiles
 * Cache persists across page reloads via localStorage
 */

import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import { STORAGE_KEYS, getItem, setItem } from '~/utils/storage'

/** Cache TTL: 8 hours */
const AVATAR_CACHE_TTL = 8 * 60 * 60 * 1000

/** Maximum number of entries in the avatar cache */
const MAX_CACHE_SIZE = 200

interface CachedAvatar {
  url: string
  timestamp: number
}

interface PendingRequest {
  promise: Promise<{
    src: string | null
    loading: boolean
    initials: string
    color: string
  }>
}

/**
 * Get Twitter/X profile image URL through unavatar.io
 * Cache-bust uses a TTL-window epoch so the URL stays stable within each
 * 8-hour window (allowing browser HTTP caching) but changes when the
 * window rolls over (forcing a fresh fetch).
 */
const getTwitterProfileImageUrl = (profileId: string): string => {
  const windowEpoch = Math.floor(Date.now() / AVATAR_CACHE_TTL)
  return `https://unavatar.io/x/${profileId}?_w=${windowEpoch}`
}

/**
 * Get a fallback avatar URL using Gravatar's identicon service
 */
const getFallbackAvatarUrl = (profileId: string): string => {
  // Create a simple hash from the profileId
  const simpleHash = Array.from(profileId)
    .reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) | 0
    }, 0)
    .toString(16)
    .replace('-', '')

  // Pad the hash to ensure it's at least 32 chars
  const paddedHash = simpleHash.padStart(32, '0')

  return `https://www.gravatar.com/avatar/${paddedHash}?s=80&d=identicon&r=g`
}

/**
 * Generate initials from a profile ID
 */
export const getProfileInitials = (profileId: string): string => {
  if (!profileId) return '??'
  return profileId.substring(0, 2).toUpperCase()
}

/**
 * Get a consistent color for an avatar based on the profile ID
 */
export const getProfileColor = (profileId: string): string => {
  const colors = ['primary', 'success', 'info', 'warning', 'error', 'neutral']

  let hash = 0
  for (let i = 0; i < profileId.length; i++) {
    hash = profileId.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * Get avatar URL for a profile based on platform (synchronous)
 */
export const getProfileAvatar = (
  platform: string,
  profileId: string,
): string => {
  if (platform.toLowerCase() === 'twitter') {
    return getTwitterProfileImageUrl(profileId)
  }
  return getFallbackAvatarUrl(profileId)
}

/**
 * Composable for handling profile avatars with persistent caching
 */
export function useAvatars() {
  const avatarCache = useState<Record<string, CachedAvatar>>(
    'avatar-cache',
    () => {
      const stored = getItem<Record<string, CachedAvatar>>(
        STORAGE_KEYS.AVATAR_CACHE,
        {},
      )
      const now = Date.now()
      const cleaned: Record<string, CachedAvatar> = {}
      for (const [key, entry] of Object.entries(stored)) {
        if (now - entry.timestamp < AVATAR_CACHE_TTL) {
          cleaned[key] = entry
        }
      }
      if (Object.keys(cleaned).length !== Object.keys(stored).length) {
        setItem(STORAGE_KEYS.AVATAR_CACHE, cleaned)
      }
      return cleaned
    },
  )

  const loadingAvatars = useState<Record<string, boolean>>(
    'avatar-loading',
    () => ({}),
  )

  // Deduplicate concurrent requests for the same key
  const pendingRequests: Record<string, PendingRequest> = {}

  // Debounced persistence to avoid excessive localStorage writes
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Schedule a debounced persistence of the avatar cache to localStorage.
   * Waits 500ms after the last call before writing to avoid excessive writes.
   */
  function schedulePersist() {
    if (persistTimer) {
      clearTimeout(persistTimer)
    }
    persistTimer = setTimeout(() => {
      setItem(STORAGE_KEYS.AVATAR_CACHE, avatarCache.value)
      persistTimer = null
    }, 500)
  }

  function evictOldestIfNeeded() {
    const entries = Object.entries(avatarCache.value)
    if (entries.length <= MAX_CACHE_SIZE) return

    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.length - MAX_CACHE_SIZE
    for (let i = 0; i < toRemove; i++) {
      delete avatarCache.value[entries[i][0]]
    }
  }

  function buildResult(
    platform: string,
    profileId: string,
    src: string | null,
  ) {
    return {
      src,
      loading: false,
      initials: getProfileInitials(profileId),
      color: getProfileColor(profileId),
    }
  }

  async function getAvatar(platform: string, profileId: string) {
    const cacheKey = `${platform}:${profileId}`

    const cached = avatarCache.value[cacheKey]
    if (cached && Date.now() - cached.timestamp < AVATAR_CACHE_TTL) {
      return buildResult(platform, profileId, cached.url)
    }

    if (pendingRequests[cacheKey]) {
      return pendingRequests[cacheKey].promise
    }

    loadingAvatars.value[cacheKey] = true

    const promise = (async () => {
      const avatarUrl = getProfileAvatar(platform, profileId)
      avatarCache.value[cacheKey] = { url: avatarUrl, timestamp: Date.now() }
      evictOldestIfNeeded()
      schedulePersist()
      loadingAvatars.value[cacheKey] = false
      return buildResult(platform, profileId, avatarUrl)
    })()

    pendingRequests[cacheKey] = { promise }
    return promise
  }

  function isAvatarLoading(
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
  ): boolean {
    const cacheKey = `${platform}:${profileId}`
    return loadingAvatars.value[cacheKey] || false
  }

  function getCachedAvatar(
    platform: string,
    profileId: string,
  ): string | undefined {
    const cacheKey = `${platform}:${profileId}`
    const cached = avatarCache.value[cacheKey]
    if (cached && Date.now() - cached.timestamp < AVATAR_CACHE_TTL) {
      return cached.url
    }
    return undefined
  }

  async function preloadAvatars(
    profiles: Array<{ platform: string; profileId: string }>,
  ) {
    const promises = profiles.map(profile =>
      getAvatar(profile.platform, profile.profileId),
    )
    await Promise.allSettled(promises)
  }

  return {
    // State
    avatarCache,
    loadingAvatars,
    // Functions
    getAvatar,
    getCachedAvatar,
    isAvatarLoading,
    preloadAvatars,
  }
}
