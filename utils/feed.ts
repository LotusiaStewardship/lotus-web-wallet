/**
 * Feed Utility Functions
 *
 * Shared helpers for RANK feed display logic, implementing:
 *   - R1 (Vote-to-Reveal): Bucketed vote count display for pre-vote state
 *   - R2 (Controversy Badge): Burn-weighted controversy score
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md
 */

// ============================================================================
// R1: Vote-to-Reveal — Bucketed Vote Count Display
// ============================================================================

/**
 * Convert an exact vote count into a bucketed display string.
 * Used for pre-vote state where exact counts are hidden per R1 spec.
 *
 * | Actual vote count | Displayed as   |
 * | 0                 | "No votes yet" |
 * | 1–9               | "A few votes"  |
 * | 10–49             | "10+ votes"    |
 * | 50–99             | "50+ votes"    |
 * | 100–499           | "100+ votes"   |
 * | 500+              | "500+ votes"   |
 */
export function bucketVoteCount(count: number): string {
  if (count <= 0) return 'No votes yet'
  if (count < 10) return 'A few votes'
  if (count < 50) return '10+ votes'
  if (count < 100) return '50+ votes'
  if (count < 500) return '100+ votes'
  return '500+ votes'
}

// ============================================================================
// R2: Controversy Badge — Burn-Weighted Formula
// ============================================================================

/**
 * Compute the burn-weighted controversy score per R2 spec.
 *
 * Formula: min(upvoteBurn, downvoteBurn) / max(upvoteBurn, downvoteBurn)
 * Content is "controversial" when score > 0.3 (minority burn ≥ 30% of majority burn).
 *
 * Requires a minimum vote count to avoid flagging low-activity content.
 */
export function controversyScore(
  satsPositive: string | bigint,
  satsNegative: string | bigint,
): number {
  const pos = BigInt(satsPositive)
  const neg = BigInt(satsNegative)
  if (pos === 0n && neg === 0n) return 0
  const minBurn = pos < neg ? pos : neg
  const maxBurn = pos > neg ? pos : neg
  if (maxBurn === 0n) return 0
  // Use Number for the ratio (precision is fine for a 0-1 score)
  return Number(minBurn * 10000n / maxBurn) / 10000
}

/**
 * Determine if content should display the "Controversial" badge.
 *
 * Per R2 spec: controversyScore > 0.3 AND minimum 5 total votes.
 */
export function isControversial(
  satsPositive: string | bigint,
  satsNegative: string | bigint,
  totalVotes: number,
  minVotes: number = 5,
): boolean {
  if (totalVotes < minVotes) return false
  return controversyScore(satsPositive, satsNegative) > 0.3
}
