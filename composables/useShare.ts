/**
 * Share Composable
 *
 * Web Share API wrapper with clipboard fallback.
 */

// ============================================================================
// Types
// ============================================================================

export interface ShareData {
  /** Title for the share */
  title: string
  /** Optional text/description */
  text?: string
  /** URL to share */
  url: string
}

// ============================================================================
// Composable
// ============================================================================

export function useShare() {
  const toast = useToast()

  /**
   * Check if Web Share API is available
   */
  const canShare = computed(
    () => typeof navigator !== 'undefined' && 'share' in navigator,
  )

  /**
   * Share content using Web Share API or fallback to clipboard
   * @param data - Share data (title, text, url)
   */
  async function share(data: ShareData): Promise<boolean> {
    if (canShare.value) {
      try {
        await navigator.share(data)
        return true
      } catch (error: any) {
        // User cancelled or share failed
        if (error.name !== 'AbortError') {
          console.warn('[Share] Share failed:', error)
          // Fall through to clipboard fallback
        } else {
          // User cancelled - don't show error
          return false
        }
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(data.url)
      toast.add({
        title: 'Link Copied',
        description: 'Share link copied to clipboard',
        icon: 'i-lucide-link',
        color: 'success',
      })
      return true
    } catch (error) {
      toast.add({
        title: 'Share Failed',
        description: 'Could not share or copy link',
        icon: 'i-lucide-x',
        color: 'error',
      })
      return false
    }
  }

  /**
   * Share a transaction
   */
  async function shareTransaction(txid: string): Promise<boolean> {
    const url = `${window.location.origin}/explore/explorer/tx/${txid}`
    return share({
      title: 'Lotus Transaction',
      text: `View transaction ${txid.slice(0, 8)}...${txid.slice(-8)}`,
      url,
    })
  }

  /**
   * Share an address
   */
  async function shareAddress(address: string): Promise<boolean> {
    const url = `${window.location.origin}/explore/explorer/address/${address}`
    return share({
      title: 'Lotus Address',
      text: `View address on Lotus Explorer`,
      url,
    })
  }

  /**
   * Share a block
   */
  async function shareBlock(height: number): Promise<boolean> {
    const url = `${window.location.origin}/explore/explorer/block/${height}`
    return share({
      title: `Lotus Block ${height.toLocaleString()}`,
      text: `View block ${height.toLocaleString()} on Lotus Explorer`,
      url,
    })
  }

  /**
   * Share a social profile
   */
  async function shareProfile(
    platform: string,
    profileId: string,
  ): Promise<boolean> {
    const url = `${window.location.origin}/explore/social/${platform}/${profileId}`
    return share({
      title: `@${profileId} on ${platform}`,
      text: `View @${profileId}'s RANK profile`,
      url,
    })
  }

  return {
    canShare,
    share,
    shareTransaction,
    shareAddress,
    shareBlock,
    shareProfile,
  }
}
