/**
 * RANK API composable
 * Fetches social ranking data from the RANK API
 */

import type {
  ScriptChunkPlatformUTF8,
  ScriptChunkSentimentUTF8,
} from 'xpi-ts/lib/rank'
import { useNetworkStore } from '~/stores/network'

// Get RANK API URL from network store
const getRankApiUrl = () => {
  const networkStore = useNetworkStore()
  return networkStore.rankApiUrl || 'https://rank.lotusia.org/api/v1'
}

// ============================================================================
// Type Definitions
// ============================================================================

/** Timespan options for API queries */
export type Timespan =
  | 'now'
  | 'today'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'all'

/** Platform icon mapping */
export const PlatformIcon: Record<string, string> = {
  twitter: 'i-simple-icons-x',
  discord: 'i-simple-icons-discord',
  telegram: 'i-simple-icons-telegram',
  reddit: 'i-simple-icons-reddit',
  youtube: 'i-simple-icons-youtube',
  tiktok: 'i-simple-icons-tiktok',
  instagram: 'i-simple-icons-instagram',
}

/** Platform URL helpers */
export const PlatformURL: Record<
  string,
  {
    root: string
    profile: (profileId: string) => string
    post: (profileId: string, postId: string) => string
  }
> = {
  twitter: {
    root: 'https://x.com',
    profile(profileId: string) {
      return `${this.root}/${profileId}`
    },
    post(profileId: string, postId: string) {
      return `${this.root}/${profileId}/status/${postId}`
    },
  },
}

/** Voter details for a profile */
export interface VoterDetails {
  /** ID of the voter is the 20-byte P2PKH */
  voterId: string
  ranking: string
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
  votesNeutral: number
}

/** Profile data from RANK API */
export interface ProfileData {
  platform: ScriptChunkPlatformUTF8
  id: string
  ranking: string
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
  voters: VoterDetails[]
}

/** Profile list item */
export interface ProfileListItem {
  id: string
  platform: ScriptChunkPlatformUTF8
  ranking: string
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
}

/** Profiles API response */
export interface ProfilesResponse {
  profiles: ProfileListItem[]
  numPages: number
}

/** Post list item */
export interface PostListItem {
  id: string
  ranking: string
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
}

/** Profile posts API response */
export interface ProfilePostsResponse {
  posts: PostListItem[]
  numPages: number
}

/** RANK transaction from vote activity */
export interface RankTransaction {
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId: string
  scriptPayload: string
  txid: string
  sentiment: ScriptChunkSentimentUTF8
  firstSeen: string
  timestamp: string
  sats: string
}

/** Vote activity API response */
export interface VoteActivityResponse {
  votes: RankTransaction[]
  numPages: number
}

/** Profile RANK transaction (for profile vote history) */
export interface ProfileRankTransaction {
  txid: string
  sentiment: ScriptChunkSentimentUTF8
  timestamp: string
  sats: string
  post: {
    id: string
    ranking: string
  } | null
}

/** Profile vote activity response */
export interface ProfileVoteActivityResponse {
  votes: ProfileRankTransaction[]
  numPages: number
}

/** Post ranking data */
export interface PostData {
  platform: ScriptChunkPlatformUTF8
  profileId: string
  id: string
  ranking: string
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
}

/** Trending API response (profiles/posts) */
export interface TrendingItem {
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
  total: {
    ranking: string
    votesPositive: number
    votesNegative: number
  }
  changed: {
    ranking: string
    rate: string
    votesPositive: number
    votesNegative: number
  }
  votesTimespan: string[]
}

/** RNKC comment from API */
export interface RnkcComment {
  txid: string
  platform: ScriptChunkPlatformUTF8
  profileId: string
  postId?: string
  /** Comment text (UTF-8 decoded from on-chain data) */
  content: string
  /** Author's script payload (20-byte P2PKH) */
  scriptPayload: string
  /** Burn amount in sats (string for bigint compat) */
  sats: string
  /** Net burn = satsPositive - satsNegative from community votes on this comment */
  netBurn?: string
  /** Positive sats from community votes */
  satsPositive?: string
  /** Negative sats from community votes */
  satsNegative?: string
  /** Parent comment txid for threading */
  inReplyTo?: string
  /** Nested replies */
  replies?: RnkcComment[]
  /** Block height (undefined if mempool) */
  height?: number
  /** Timestamp */
  timestamp: string
  /** First seen */
  firstSeen: string
}

/** Comments API response */
export interface CommentsResponse {
  comments: RnkcComment[]
  numPages: number
}

/** Wallet activity item */
export interface WalletActivity {
  date: string
  timestamp: string
  txid: string
  scriptPayload: string
  profileId: string | null
  postId: string | null
  sentiment: string
  sats: string
  height: number
}

/** Wallet activity summary */
export interface WalletActivitySummary {
  scriptPayload: string
  totalVotes: number
  totalSats: string
  lastSeen: string
  firstSeen: string
}

/** RANK activity result (for charts) */
export interface RankActivityResult {
  totalVotes: number
  totalPayoutsSent: number
  totalPayoutAmount: number
}

/** Wallet summary result */
export interface WalletSummaryResult {
  totalVotes: number
  totalUpvotes: number
  totalDownvotes: number
  totalUniqueWallets: number
  totalSatsBurned: number
}

// ============================================================================
// Composable
// ============================================================================

export const useRankApi = () => {
  /**
   * Fetch paginated list of profiles
   */
  const getProfiles = async (
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ProfilesResponse | null> => {
    try {
      const url = `${getRankApiUrl()}/profiles/${page}/${pageSize}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch profiles: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching profiles:', error)
      return null
    }
  }

  /**
   * Fetch posts for a specific profile
   */
  const getProfilePosts = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ProfilePostsResponse | null> => {
    try {
      const url = `${getRankApiUrl()}/${platform}/${profileId}/posts/${page}/${pageSize}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch profile posts: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching profile posts:', error)
      return null
    }
  }

  /**
   * Fetch vote activity for all profiles
   */
  const getVoteActivity = async (
    page: number = 1,
    pageSize: number = 10,
  ): Promise<VoteActivityResponse | null> => {
    try {
      const url = `${getRankApiUrl()}/votes/${page}/${pageSize}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch vote activity: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching vote activity:', error)
      return null
    }
  }

  /**
   * Fetch top ranked profiles for a timespan
   */
  const getTopRankedProfiles = async (
    timespan: Timespan = 'today',
  ): Promise<TrendingItem[]> => {
    try {
      const url = `${getRankApiUrl()}/stats/profiles/top-ranked/${timespan}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch top ranked profiles: ${response.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching top ranked profiles:', error)
      return []
    }
  }

  /**
   * Fetch lowest ranked profiles for a timespan
   */
  const getLowestRankedProfiles = async (
    timespan: Timespan = 'today',
  ): Promise<TrendingItem[]> => {
    try {
      const url = `${getRankApiUrl()}/stats/profiles/lowest-ranked/${timespan}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(
          `Failed to fetch lowest ranked profiles: ${response.status}`,
        )
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching lowest ranked profiles:', error)
      return []
    }
  }

  /**
   * Fetch top ranked posts for a timespan
   */
  const getTopRankedPosts = async (
    timespan: Timespan = 'today',
  ): Promise<TrendingItem[]> => {
    try {
      const url = `${getRankApiUrl()}/stats/posts/top-ranked/${timespan}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch top ranked posts: ${response.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching top ranked posts:', error)
      return []
    }
  }

  /**
   * Fetch lowest ranked posts for a timespan
   */
  const getLowestRankedPosts = async (
    timespan: Timespan = 'today',
  ): Promise<TrendingItem[]> => {
    try {
      const url = `${getRankApiUrl()}/stats/posts/lowest-ranked/${timespan}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch lowest ranked posts: ${response.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching lowest ranked posts:', error)
      return []
    }
  }

  /**
   * Fetch ranking data for a specific profile
   */
  const getProfileRanking = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
  ): Promise<ProfileData | null> => {
    try {
      const url = `${getRankApiUrl()}/${platform}/${profileId}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch profile ranking: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching profile ranking:', error)
      return null
    }
  }

  /**
   * Fetch vote transactions for a specific profile
   */
  const getProfileRankTransactions = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ProfileVoteActivityResponse | null> => {
    try {
      const url = `${getRankApiUrl()}/txs/${platform}/${profileId}/${page}/${pageSize}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(
          `Failed to fetch profile transactions: ${response.status}`,
        )
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching profile transactions:', error)
      return null
    }
  }

  /**
   * Fetch ranking data for a specific post
   */
  const getPostRanking = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    postId: string,
  ): Promise<PostData | null> => {
    try {
      const url = `${getRankApiUrl()}/${platform}/${profileId}/${postId}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch post ranking: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching post ranking:', error)
      return null
    }
  }

  /**
   * Fetch wallet activity
   */
  const getWalletActivity = async (
    scriptPayload: string,
    startTime?: string,
    endTime?: string,
  ): Promise<WalletActivity[]> => {
    try {
      let url = `${getRankApiUrl()}/wallet/${scriptPayload}`
      if (startTime) url += `/${startTime}`
      if (endTime) url += `/${endTime}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch wallet activity: ${response.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching wallet activity:', error)
      return []
    }
  }

  /**
   * Fetch wallet activity summary
   */
  const getWalletActivitySummary = async (
    scriptPayload: string,
    startTime?: Timespan,
    endTime?: Timespan,
  ): Promise<WalletActivitySummary | null> => {
    try {
      let url = `${getRankApiUrl()}/wallet/summary/${scriptPayload}`
      if (startTime) url += `/${startTime}`
      if (endTime) url += `/${endTime}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch wallet summary: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching wallet summary:', error)
      return null
    }
  }

  /**
   * Search for profiles across platforms
   */
  const searchProfiles = async (query: string): Promise<ProfileListItem[]> => {
    if (!query || query.trim().length < 2) return []
    try {
      const url = `${getRankApiUrl()}/search/profile/${encodeURIComponent(
        query,
      )}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to search profiles: ${response.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error searching profiles:', error)
      return []
    }
  }

  /**
   * Fetch comments for a specific profile
   */
  const getProfileComments = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<CommentsResponse | null> => {
    try {
      const url = `${getRankApiUrl()}/comments/${platform}/${profileId}/${page}/${pageSize}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch profile comments: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching profile comments:', error)
      return null
    }
  }

  /**
   * Fetch comments for a specific post
   */
  const getPostComments = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    postId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<CommentsResponse | null> => {
    try {
      const url = `${getRankApiUrl()}/comments/${platform}/${profileId}/${postId}/${page}/${pageSize}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch post comments: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching post comments:', error)
      return null
    }
  }

  return {
    // Profile methods
    getProfiles,
    getProfilePosts,
    getProfileRanking,
    getProfileRankTransactions,
    // Post methods
    getPostRanking,
    // Comment methods
    getProfileComments,
    getPostComments,
    // Activity methods
    getVoteActivity,
    getWalletActivity,
    getWalletActivitySummary,
    // Trending methods
    getTopRankedProfiles,
    getLowestRankedProfiles,
    getTopRankedPosts,
    getLowestRankedPosts,
    // Search
    searchProfiles,
    // URL helper
    getRankApiUrl,
  }
}
