/**
 * Avatar composable
 * Handles profile avatar fetching and caching for social profiles
 */

import type { ScriptChunkPlatformUTF8 } from 'lotus-sdk/lib/rank'

/**
 * Get Twitter/X profile image URL through unavatar.io
 */
const getTwitterProfileImageUrl = (profileId: string): string => {
  return `https://unavatar.io/x/${profileId}`
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
 * Get avatar URL for a profile based on platform
 */
export const getProfileAvatar = async (
  platform: string,
  profileId: string,
): Promise<string | null> => {
  try {
    if (platform.toLowerCase() === 'twitter') {
      return getTwitterProfileImageUrl(profileId)
    }
    // For other platforms, use Gravatar fallback
    return getFallbackAvatarUrl(profileId)
  } catch (error) {
    console.error('Error getting profile avatar:', error)
    return getFallbackAvatarUrl(profileId)
  }
}

/**
 * Composable for handling profile avatars with caching
 */
export function useAvatars() {
  // Cache for avatar URLs to avoid repeated requests
  const avatarCache = useState<Record<string, string>>(
    'avatar-cache',
    () => ({}),
  )
  // Cache for loading states
  const loadingAvatars = useState<Record<string, boolean>>(
    'avatar-loading',
    () => ({}),
  )

  /**
   * Get an avatar URL for a profile, with caching
   */
  async function getAvatar(platform: string, profileId: string) {
    const cacheKey = `${platform}:${profileId}`

    // Return from cache if available
    if (avatarCache.value[cacheKey]) {
      return {
        src: avatarCache.value[cacheKey],
        loading: false,
        initials: getProfileInitials(profileId),
        color: getProfileColor(profileId),
      }
    }

    // Set loading state
    loadingAvatars.value[cacheKey] = true

    try {
      const avatarUrl = await getProfileAvatar(platform, profileId)
      if (avatarUrl) {
        // Cache the result
        avatarCache.value[cacheKey] = avatarUrl
      }
      loadingAvatars.value[cacheKey] = false

      return {
        src: avatarUrl,
        loading: false,
        initials: getProfileInitials(profileId),
        color: getProfileColor(profileId),
      }
    } catch (error) {
      console.error('Error fetching avatar:', error)
      loadingAvatars.value[cacheKey] = false

      return {
        src: null,
        loading: false,
        initials: getProfileInitials(profileId),
        color: getProfileColor(profileId),
      }
    }
  }

  /**
   * Check if avatar is currently loading
   */
  function isAvatarLoading(
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
  ): boolean {
    const cacheKey = `${platform}:${profileId}`
    return loadingAvatars.value[cacheKey] || false
  }

  /**
   * Get cached avatar URL synchronously (returns undefined if not cached)
   */
  function getCachedAvatar(
    platform: string,
    profileId: string,
  ): string | undefined {
    const cacheKey = `${platform}:${profileId}`
    return avatarCache.value[cacheKey]
  }

  /**
   * Preload avatars for a list of profiles
   */
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
