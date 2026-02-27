/**
 * Post-Vote Polling Composable
 *
 * Handles polling the RANK API after a vote is cast to verify the vote
 * was indexed and to fetch updated vote counts from other users.
 *
 * Strategy:
 * - Immediate poll after vote (0ms)
 * - Exponential backoff: 1s → 2s → 4s → 8s
 * - Stop after 15s total or when vote is confirmed
 * - Accounts for blockchain propagation delays (5-30s typical)
 *
 * Based on rank-extension-ts polling pattern but adapted for:
 * - Nuxt/Vue reactivity
 * - Decentralized blockchain delays
 * - Same-backend architecture (reduced network latency)
 */

import type {
  ScriptChunkPlatformUTF8,
  ScriptChunkSentimentUTF8,
} from 'xpi-ts/lib/rank'

// ============================================================================
// Types
// ============================================================================

export interface PollConfig {
  /** Platform identifier */
  platform: ScriptChunkPlatformUTF8
  /** Profile ID */
  profileId: string
  /** Optional post ID (if polling post-level vote) */
  postId?: string
  /** Transaction ID of the vote */
  txid: string
  /** Expected sentiment that was voted */
  sentiment: ScriptChunkSentimentUTF8
  /** Wallet script payload for vote verification */
  scriptPayload?: string
}

export interface PollResult {
  /** Whether the vote was confirmed in the API */
  confirmed: boolean
  /** Updated vote counts if available */
  votesPositive?: number
  votesNegative?: number
  /** Updated ranking if available */
  ranking?: string
  /** Number of poll attempts made */
  attempts: number
  /** Updated satsPositive if available (for profiles) */
  satsPositive?: string
  /** Updated satsNegative if available (for profiles) */
  satsNegative?: string
}

// ============================================================================
// Constants
// ============================================================================

/** Polling schedule in milliseconds: [0, 1000, 2000, 4000, 8000] */
const POLL_SCHEDULE = [0, 1000, 2000, 4000, 8000]

/** Maximum total polling duration (15 seconds) */
const MAX_POLL_DURATION = 15000

// ============================================================================
// Composable
// ============================================================================

export function usePostVotePolling() {
  const { getPostRanking, getProfileRanking } = useRankApi()

  /**
   * Poll the API after a vote to verify it was indexed and get updated counts.
   *
   * Returns a promise that resolves when:
   * - Vote is confirmed in the API (postMeta/profileMeta shows wallet voted)
   * - Maximum polling duration is reached
   *
   * The promise resolves with poll results including confirmation status.
   */
  async function pollAfterVote(config: PollConfig): Promise<PollResult> {
    const { platform, profileId, postId, txid, sentiment, scriptPayload } =
      config

    let attempts = 0
    let confirmed = false
    let votesPositive: number | undefined
    let votesNegative: number | undefined
    let ranking: string | undefined

    const startTime = Date.now()

    // Execute polling schedule
    for (const delay of POLL_SCHEDULE) {
      // Check if we've exceeded max duration
      if (Date.now() - startTime >= MAX_POLL_DURATION) {
        console.warn('[usePostVotePolling] Max poll duration reached, stopping')
        break
      }

      // Wait for scheduled delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      attempts++

      try {
        // Poll the appropriate endpoint
        if (postId) {
          // Post-level vote
          const data = await getPostRanking(
            platform,
            profileId,
            postId,
            scriptPayload,
          )

          if (data) {
            votesPositive = data.votesPositive
            votesNegative = data.votesNegative
            ranking = data.ranking

            // Check if vote is confirmed via postMeta
            const meta = data.postMeta
            if (meta) {
              if (sentiment === 'positive' && meta.hasWalletUpvoted) {
                confirmed = true
                console.log(
                  `[usePostVotePolling] Vote confirmed after ${attempts} attempts`,
                )
                break
              }
              if (sentiment === 'negative' && meta.hasWalletDownvoted) {
                confirmed = true
                console.log(
                  `[usePostVotePolling] Vote confirmed after ${attempts} attempts`,
                )
                break
              }
            }
          }
        } else {
          // Profile-level vote
          const data = await getProfileRanking(
            platform,
            profileId,
            scriptPayload,
          )

          if (data) {
            votesPositive = data.votesPositive
            votesNegative = data.votesNegative
            ranking = data.ranking

            // Check if vote is confirmed via profileMeta
            const meta = data.profileMeta
            if (meta) {
              if (sentiment === 'positive' && meta.hasWalletUpvoted) {
                confirmed = true
                console.log(
                  `[usePostVotePolling] Vote confirmed after ${attempts} attempts`,
                )
                break
              }
              if (sentiment === 'negative' && meta.hasWalletDownvoted) {
                confirmed = true
                console.log(
                  `[usePostVotePolling] Vote confirmed after ${attempts} attempts`,
                )
                break
              }
            }
          }
        }
      } catch (err) {
        console.warn(
          `[usePostVotePolling] Poll attempt ${attempts} failed:`,
          err,
        )
        // Continue polling even if one attempt fails
      }
    }

    return {
      confirmed,
      votesPositive,
      votesNegative,
      ranking,
      attempts,
    }
  }

  /**
   * Poll and update reactive refs with the results.
   * Useful for components that need to react to poll completion.
   */
  async function pollAndUpdate(
    config: PollConfig,
    onUpdate: (result: PollResult) => void,
  ): Promise<PollResult> {
    const result = await pollAfterVote(config)
    onUpdate(result)
    return result
  }

  /**
   * Poll after a vote and return updated data for list items.
   * This is a simplified version for components that manage their own reactive state.
   *
   * Usage in PostCard/ProfileCard:
   * ```typescript
   * async function handleVoted(txid: string, sentiment: 'positive' | 'negative') {
   *   // Optimistic update (component's own reactive data)
   *   localVotesPositive.value++
   *
   *   // Poll and get confirmed data
   *   const result = await pollForListItem({ platform, profileId, postId, txid, sentiment })
   *   if (result.confirmed) {
   *     localVotesPositive.value = result.votesPositive
   *     localVotesNegative.value = result.votesNegative
   *   }
   * }
   * ```
   */
  async function pollForListItem(config: PollConfig): Promise<PollResult> {
    // Same as pollAfterVote, but returns data suitable for list item updates
    return pollAfterVote(config)
  }

  return {
    pollAfterVote,
    pollAndUpdate,
    pollForListItem,
    // Export constants for testing/debugging
    POLL_SCHEDULE,
    MAX_POLL_DURATION,
  }
}
