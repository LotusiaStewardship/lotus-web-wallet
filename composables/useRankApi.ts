/**
 * RANK API composable
 * Fetches social ranking data from the RANK API
 */

import type {
  ScriptChunkPlatformUTF8,
  ScriptChunkSentimentUTF8,
  TransactionRANK,
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

/** Metadata about the voter's activity on a profile, from authorized API responses */
export interface VoterProfileMetadata {
  hasWalletUpvoted: boolean
  hasWalletDownvoted: boolean
}

/** Metadata about the voter's activity on a post, from authorized API responses */
export interface VoterPostMetadata {
  hasWalletUpvoted: boolean
  hasWalletDownvoted: boolean
  satsUpvoted: string
  satsDownvoted: string
  txidsUpvoted: string[]
  txidsDownvoted: string[]
}

/** Profile data from RANK API */
export interface ProfileData {
  platform: ScriptChunkPlatformUTF8
  id: string
  ranking: string
  ranks?: EntityVote[]
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
  voters: VoterDetails[]
  profileMeta?: VoterProfileMetadata | null
  /** RNKC comments on this profile (PostAPI-shaped, from backend) */
  comments?: RnkcComment[] | null
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
  data?: string // Post data (UTF-8) if Lotusia post
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
  timestamp?: string
  firstSeen: string
  sats: string
  post:
    | {
        id: string
        ranking: string
      }
    | undefined
}

/** Profile vote activity response */
export interface ProfileVoteActivityResponse {
  votes: ProfileRankTransaction[]
  numPages: number
}

/** Sort mode for the unified feed */
export type FeedSortMode = 'curated' | 'ranking' | 'recent' | 'controversial'

/** Labels shown to users for each sort mode */
export const FeedSortLabel: Record<FeedSortMode, string> = {
  curated: 'Curated',
  ranking: 'Top Ranked',
  recent: 'Recent',
  controversial: 'Controversial',
}

export interface EntityVote {
  txid: string
  sats: string
  sentiment: ScriptChunkSentimentUTF8
  firstSeen: string
  timestamp: string | null
}

/** Post ranking data */
export interface PostData {
  platform: ScriptChunkPlatformUTF8
  profileId: string
  id: string
  ranking: string
  firstVoted: string
  lastVoted: string
  satsPositive: string
  satsNegative: string
  votesPositive: number
  votesNegative: number
  postMeta?: VoterPostMetadata | null
  profile?: {
    ranking: string
    satsPositive: string
    satsNegative: string
    votesPositive: number
    votesNegative: number
    profileMeta?: VoterProfileMetadata | null
  }
  /** RANK transactions associated with the post (API response format) */
  ranks?: EntityVote[]
  /** Lotusia post data (comment text, UTF-8) */
  data?: string
  /** Parent content fields for RNKC threading */
  inReplyToPlatform?: ScriptChunkPlatformUTF8
  inReplyToProfileId?: string
  inReplyToPostId?: string
  firstSeen?: string
  timestamp?: string
  /** RNKC comment replies (PostAPI-shaped from backend) */
  comments?: RnkcComment[]
  /**
   * Ancestor chain for RNKC replies — ordered from genesis post (index 0) to
   * immediate parent (last index). Only populated when inReplyToPostId is set.
   * Enables Twitter-style "view full conversation" rendering on the detail page.
   */
  ancestors?: PostData[]
  /**
   * Ancestor profile data for profile-level comments (when inReplyToProfileId is set
   * but inReplyToPostId is null). Contains the profile's ranking metrics and vote metadata.
   */
  ancestorProfile?: {
    platform: ScriptChunkPlatformUTF8
    id: string
    ranking: string
    satsPositive: string
    satsNegative: string
    votesPositive: number
    votesNegative: number
    profileMeta?: VoterProfileMetadata | null
  }
  /**
   * Feed ranking signals (R62–R66). Present when sortBy='curated' or 'ranking'.
   * All derived from aggregate burns only (Sybil-neutral).
   */
  /** R62: Logarithmically dampened net feed score */
  feedScore?: number
  /** R63: Z-score-normalized feed score */
  feedScoreNormalized?: number
  /** R65: Fraction of total burns that are positive (0–1) */
  sentimentRatio?: number
  /** R65: How evenly contested the burns are (0 = one-sided, 1 = perfectly split) */
  controversyScore?: number
  /** R65: Log-dampened total of all burns, used as tiebreaker */
  totalEngagement?: number
  /** R65: Whether this post exceeds the controversy threshold */
  isControversial?: boolean
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

/**
 * RNKC comment from API.
 *
 * Comments are returned as nested PostAPI objects within profile and post
 * responses from rank-backend-ts. There are no dedicated /comments/ endpoints.
 *
 * The backend converts RankComment → PostAPI via convertRankCommentToPostAPI():
 *   id = txid, profileId = scriptPayload (comment author),
 *   data = comment text (UTF-8), ranking/sats/votes = community votes on the comment,
 *   inReplyTo* = parent content being replied to, comments = nested replies.
 */
export interface RnkcComment {
  /** Comment txid (used as the post ID in the backend) */
  id: string
  /** Platform of the content being commented on */
  platform: ScriptChunkPlatformUTF8
  /** Author's script payload (20-byte P2PKH, stored as profileId in backend) */
  profileId: string
  /** Comment text (UTF-8 decoded from on-chain data) */
  data?: string
  /** Platform of the parent content being replied to */
  inReplyToPlatform?: ScriptChunkPlatformUTF8
  /** Profile ID of the parent content being replied to */
  inReplyToProfileId?: string
  /** Post ID of the parent content being replied to */
  inReplyToPostId?: string
  /** Timestamp (seconds since epoch, as string) */
  timestamp?: string
  /** First seen by indexer (seconds since epoch, as string) */
  firstSeen?: string
  /** Net ranking of the comment (satsPositive - satsNegative, as string) */
  ranking: string
  /** Positive sats from community votes on this comment */
  satsPositive: string
  /** Negative sats from community votes on this comment */
  satsNegative: string
  /** Number of positive votes on this comment */
  votesPositive: number
  /** Number of negative votes on this comment */
  votesNegative: number
  /** Author's profile ranking metrics */
  profile: {
    ranking: string
    satsPositive: string
    satsNegative: string
    votesPositive: number
    votesNegative: number
  }
  /** Nested replies (also PostAPI-shaped) */
  comments?: RnkcComment[]
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

/**
 * Feed posts API response (unified feed with Vote-to-Reveal support)
 */
export interface FeedPostsResponse {
  posts: PostData[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
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
    scriptPayload?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ProfilePostsResponse | null> => {
    try {
      let url = `${getRankApiUrl()}/${platform}/${profileId}/posts/${page}/${pageSize}`
      if (scriptPayload) {
        url += `?scriptPayload=${encodeURIComponent(scriptPayload)}`
      }
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
    scriptPayload?: string,
  ): Promise<ProfileData | null> => {
    try {
      const url = `${getRankApiUrl()}/${platform}/${profileId}${
        scriptPayload
          ? `?scriptPayload=${encodeURIComponent(scriptPayload)}`
          : ''
      }`
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
   * Fetch vote transactions for a specific profile.
   * When days is provided, only returns transactions within the last N days,
   * stopping pagination early once timestamps fall outside the window.
   */
  const getProfileRankTransactions = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    page: number = 1,
    pageSize: number = 10,
    days?: number,
  ): Promise<ProfileVoteActivityResponse | null> => {
    try {
      if (!days) {
        const url = `${getRankApiUrl()}/txs/${platform}/${profileId}/${page}/${pageSize}`
        const response = await fetch(url)
        if (!response.ok) {
          console.error(
            `Failed to fetch profile transactions: ${response.status}`,
          )
          return null
        }
        return await response.json()
      }
      // Windowed fetch: collect all pages within the time window
      const cutoff = Math.floor(Date.now() / 1000) - days * 86_400
      const allVotes: ProfileRankTransaction[] = []
      let numPages = 1
      for (let p = 1; p <= 20; p++) {
        const url = `${getRankApiUrl()}/txs/${platform}/${profileId}/${p}/${pageSize}`
        const response = await fetch(url)
        if (!response.ok) break
        const data: ProfileVoteActivityResponse = await response.json()
        numPages = data.numPages
        let reachedCutoff = false
        for (const vote of data.votes) {
          if (Number(vote.timestamp) >= cutoff) {
            allVotes.push(vote)
          } else {
            reachedCutoff = true
            break
          }
        }
        if (reachedCutoff || p >= numPages) break
      }
      return { votes: allVotes, numPages }
    } catch (error) {
      console.error('Error fetching profile transactions:', error)
      return null
    }
  }

  /**
   * Fetch RANK vote transactions for a specific post (R5: Temporal Diversity).
   * The backend /txs endpoint is profile-scoped, so we fetch profile txs and
   * filter client-side by postId. When days is provided, stops early once
   * timestamps fall outside the window (backend efficiency).
   */
  const getPostRankTransactions = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    postId: string,
    days: number = 30,
  ): Promise<ProfileRankTransaction[]> => {
    try {
      const cutoff = Math.floor(Date.now() / 1000) - days * 86_400
      const pageSize = 40
      const allVotes: ProfileRankTransaction[] = []
      for (let page = 1; page <= 20; page++) {
        const url = `${getRankApiUrl()}/txs/${platform}/${profileId}/${page}/${pageSize}`
        const response = await fetch(url)
        if (!response.ok) break
        const data: ProfileVoteActivityResponse = await response.json()
        let reachedCutoff = false
        for (const vote of data.votes) {
          if (Number(vote.timestamp) < cutoff) {
            reachedCutoff = true
            break
          }
          if (vote.post?.id === postId) {
            allVotes.push(vote)
          }
        }
        if (reachedCutoff || page >= data.numPages) break
      }
      return allVotes
    } catch (error) {
      console.error('Error fetching post rank transactions:', error)
      return []
    }
  }

  /**
   * Fetch ranking data for a specific post.
   * When scriptPayload is provided, the API returns postMeta and profile.profileMeta
   * indicating whether the wallet has voted on this content (R1 Vote-to-Reveal).
   */
  const getPostRanking = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    postId: string,
    scriptPayload?: string,
  ): Promise<PostData | null> => {
    try {
      const { authorizedFetch } = useRankAuth()
      let url = `${getRankApiUrl()}/${platform}/${profileId}/${postId}`
      if (scriptPayload) {
        url += `?scriptPayload=${encodeURIComponent(scriptPayload)}`
      }
      const response = await authorizedFetch(url)
      if (!response) {
        console.error(
          `Failed to fetch post ranking: no result from authorizedFetch`,
        )
        return null
      }
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
   * Fetch wallet activity (authenticated endpoint).
   * Requires wallet to be initialized for BlockDataSig auth.
   */
  const getWalletActivity = async (
    scriptPayload: string,
    startTime?: string,
    endTime?: string,
  ): Promise<WalletActivity[]> => {
    try {
      const { authorizedFetch, getInstanceId } = useRankAuth()
      const instanceId = await getInstanceId()
      let url = `${getRankApiUrl()}/wallet/${instanceId}/${scriptPayload}`
      if (startTime) url += `/${startTime}`
      if (endTime) url += `/${endTime}`
      const response = await authorizedFetch(url)
      if (!response || !response.ok) {
        console.error(`Failed to fetch wallet activity: ${response?.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching wallet activity:', error)
      return []
    }
  }

  /**
   * Fetch wallet activity summary (authenticated endpoint).
   * Requires wallet to be initialized for BlockDataSig auth.
   */
  const getWalletActivitySummary = async (
    scriptPayload: string,
    startTime?: Timespan,
    endTime?: Timespan,
  ): Promise<WalletActivitySummary | null> => {
    try {
      const { authorizedFetch, getInstanceId } = useRankAuth()
      const instanceId = await getInstanceId()
      let url = `${getRankApiUrl()}/wallet/summary/${instanceId}/${scriptPayload}`
      if (startTime) url += `/${startTime}`
      if (endTime) url += `/${endTime}`
      const response = await authorizedFetch(url)
      if (!response || !response.ok) {
        console.error(`Failed to fetch wallet summary: ${response?.status}`)
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
   * Fetch comments for a specific profile.
   *
   * Comments are embedded in the profile response from the backend
   * (GET /:platform/:profileId). There is no dedicated /comments/ endpoint.
   * This function fetches the profile and extracts the comments array.
   *
   * @param platform - The platform identifier
   * @param profileId - The profile identifier
   * @param scriptPayload - Optional script payload for enhanced postMeta data
   */
  const getProfileComments = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    scriptPayload?: string,
  ): Promise<RnkcComment[]> => {
    try {
      let url = `${getRankApiUrl()}/${platform}/${profileId}`
      if (scriptPayload) {
        url += `?scriptPayload=${encodeURIComponent(scriptPayload)}`
      }
      const response = await fetch(url)
      if (!response.ok) {
        console.error(
          `Failed to fetch profile for comments: ${response.status}`,
        )
        return []
      }
      const data: ProfileData = await response.json()
      return data.comments ?? []
    } catch (error) {
      console.error('Error fetching profile comments:', error)
      return []
    }
  }

  /**
   * Fetch comments for a specific post.
   *
   * Comments are embedded in the post response from the backend
   * (GET /:platform/:profileId/:postId). There is no dedicated /comments/ endpoint.
   * This function fetches the post and extracts the comments array.
   */
  const getPostComments = async (
    platform: ScriptChunkPlatformUTF8,
    profileId: string,
    postId: string,
    scriptPayload?: string,
  ): Promise<RnkcComment[]> => {
    try {
      let url = `${getRankApiUrl()}/${platform}/${profileId}/${postId}`
      if (scriptPayload) {
        url += `?scriptPayload=${encodeURIComponent(scriptPayload)}`
      }
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch post for comments: ${response.status}`)
        return []
      }
      const data: PostData = await response.json()
      return data.comments ?? []
    } catch (error) {
      console.error('Error fetching post comments:', error)
      return []
    }
  }

  /**
   * Fetch unified feed posts with filtering, sorting, and Vote-to-Reveal support.
   * Replaces activity-based polling with post-centric feed queries.
   */
  const getFeedPosts = async ({
    platform,
    sortBy,
    startTime,
    page,
    pageSize,
    scriptPayload,
  }: {
    platform?: ScriptChunkPlatformUTF8
    sortBy?: FeedSortMode
    startTime?: Timespan
    page?: number
    pageSize?: number
    scriptPayload?: string
  }): Promise<FeedPostsResponse | null> => {
    try {
      const params = new URLSearchParams()
      if (platform) params.append('platform', platform)
      if (sortBy) params.append('sortBy', sortBy)
      if (startTime) params.append('startTime', startTime)
      if (page) params.append('page', String(page))
      if (pageSize) params.append('pageSize', String(pageSize))
      if (scriptPayload) params.append('scriptPayload', scriptPayload)

      const url = `${getRankApiUrl()}/feed/posts?${params.toString()}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch feed posts: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching feed posts:', error)
      return null
    }
  }

  /**
   * Fetch trending posts based on recent vote activity volume.
   * Returns full PostAPI objects ordered by activity count in the time window.
   */
  const getFeedTrending = async (
    windowHours: number = 24,
    limit: number = 20,
    scriptPayload?: string,
  ): Promise<PostData[]> => {
    try {
      let url = `${getRankApiUrl()}/feed/trending/${windowHours}/${limit}`
      if (scriptPayload) {
        url += `?scriptPayload=${encodeURIComponent(scriptPayload)}`
      }
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to fetch trending posts: ${response.status}`)
        return []
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching trending posts:', error)
      return []
    }
  }

  return {
    // Feed methods
    getFeedPosts,
    getFeedTrending,
    // Profile methods
    getProfiles,
    getProfilePosts,
    getProfileRanking,
    getProfileRankTransactions,
    // Post methods
    getPostRanking,
    getPostRankTransactions,
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
