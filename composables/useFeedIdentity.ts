/**
 * Feed Identity Composable
 *
 * Resolves a RANK feed profileId into a display-friendly identity by:
 *   1. Converting Lotusia scriptPayloads to Lotus addresses via $bitcore
 *   2. Looking up the address in the contact store for a human-readable name
 *   3. Detecting "own" posts by comparing against the wallet's scriptPayload
 *   4. Providing consistent truncation for addresses and raw profileIds
 *
 * This is the single source of truth for author display across all feed
 * components (AncestorItem, CommentItem, ActivityItem, PostCard, PostDetail,
 * CommentInput). Every component should use this instead of ad-hoc truncation.
 */
import { getProfileInitials } from '~/composables/useAvatars'
import { useWalletStore } from '~/stores/wallet'
import { usePeopleStore } from '~/stores/people'

export interface FeedIdentity {
  /** Display name: contact name > truncated address > truncated profileId */
  displayName: string
  /** Whether this profileId belongs to the current wallet */
  isOwn: boolean
  /** Contact name if found, null otherwise */
  contactName: string | null
  /** Lotus address derived from scriptPayload (Lotusia only), null for external platforms */
  lotusAddress: string | null
  /** Avatar initials (consistent 2-char uppercase) */
  initials: string
  /** The raw profileId passed in */
  profileId: string
  /** The platform */
  platform: string
}

/**
 * Resolve a profileId into a FeedIdentity.
 *
 * For Lotusia posts, profileId is a scriptPayload (hex). We convert it to a
 * Lotus address via Script.fromPayload('p2pkh', payload) → Address.fromScript(),
 * then look up the address in the contact store.
 *
 * For external platforms (twitter, etc.), profileId is the platform handle
 * and is displayed as-is (no address conversion needed).
 */
export function useFeedIdentity() {
  const { $bitcore } = useNuxtApp()
  const walletStore = useWalletStore()
  const peopleStore = usePeopleStore()
  const networkStore = useNetworkStore()

  /**
   * Convert a Lotusia scriptPayload (20-byte P2PKH hash hex) to a Lotus address.
   * Returns null if conversion fails.
   */
  function scriptPayloadToAddress(scriptPayload: string): string | null {
    if (!scriptPayload || scriptPayload.length !== 40) return null
    try {
      const script = $bitcore.Script.fromPayload('p2pkh', scriptPayload)
      const network = $bitcore.Networks.get(networkStore.currentNetwork)
      const addr = $bitcore.Address.fromScript(script, network)
      return addr.toXAddress(network)
    } catch {
      return null
    }
  }

  /**
   * Truncate a Lotus address for display: "lotus_1abc...xyz8"
   */
  function truncateAddress(address: string): string {
    if (!address || address.length <= 20) return address
    return address.slice(0, 14) + '...' + address.slice(-6)
  }

  /**
   * Truncate a raw profileId (hex scriptPayload or platform handle) for display.
   * For hex strings (Lotusia), show first 6 + last 4.
   * For short strings (Twitter handles), show as-is.
   */
  function truncateProfileId(profileId: string): string {
    if (!profileId) return 'Unknown'
    if (profileId.length <= 16) return profileId
    return profileId.slice(0, 6) + '...' + profileId.slice(-4)
  }

  /**
   * Resolve a feed author's identity from platform + profileId.
   */
  function resolve(platform: string, profileId: string): FeedIdentity {
    const isOwn =
      !!walletStore.scriptPayload && profileId === walletStore.scriptPayload

    // For non-Lotusia platforms, profileId is the platform handle
    if (platform !== 'lotusia') {
      return {
        displayName: profileId,
        isOwn: false,
        contactName: null,
        lotusAddress: null,
        initials: getProfileInitials(profileId),
        profileId,
        platform,
      }
    }

    // Lotusia: convert scriptPayload → address → contact lookup
    const lotusAddress = scriptPayloadToAddress(profileId)

    // Look up contact by address
    let contactName: string | null = null
    if (lotusAddress) {
      const contact = peopleStore.getByAddress(lotusAddress)
      if (contact) {
        contactName = contact.name
      }
    }

    // Display priority: contact name > "You" (own) > truncated address > truncated hex
    let displayName: string
    if (contactName) {
      displayName = contactName
    } else if (isOwn) {
      displayName = 'You'
    } else if (lotusAddress) {
      displayName = truncateAddress(lotusAddress)
    } else {
      displayName = truncateProfileId(profileId)
    }

    return {
      displayName,
      isOwn,
      contactName,
      lotusAddress,
      initials: getProfileInitials(profileId),
      profileId,
      platform,
    }
  }

  /**
   * Reactive version: returns a computed FeedIdentity that updates when
   * contacts or wallet state change.
   */
  function useResolve(
    platform: MaybeRefOrGetter<string>,
    profileId: MaybeRefOrGetter<string>,
  ): ComputedRef<FeedIdentity> {
    return computed(() => resolve(toValue(platform), toValue(profileId)))
  }

  return {
    resolve,
    useResolve,
    scriptPayloadToAddress,
    truncateAddress,
    truncateProfileId,
  }
}
