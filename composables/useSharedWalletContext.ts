/**
 * Shared Wallet Context Composable
 *
 * Phase 3: Facade Composable
 *
 * Provides a unified interface for shared wallet UI.
 * Combines data from musig2, identity, contacts, and wallet stores.
 *
 * This composable eliminates the need for components to import multiple stores
 * and manually coordinate participant data with identity/contact information.
 *
 * Usage:
 * ```typescript
 * const {
 *   wallet,
 *   participants,
 *   onlineParticipantCount,
 *   canPropose,
 *   proposeSpend,
 * } = useSharedWalletContext(walletId)
 * ```
 */
import { computed, unref, type ComputedRef, type Ref } from 'vue'
import { useMuSig2Store } from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'
import { useContactsStore, type Contact } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { AccountPurpose } from '~/types/accounts'
import type { Identity } from '~/types/identity'
import type { OnlineStatus } from '~/types/contact'
import type { WalletSigningSession } from '~/plugins/05.musig2.client'
import type { SharedWallet, SharedWalletParticipant } from '~/types/people'

// ============================================================================
// Types
// ============================================================================

/**
 * Participant with resolved identity and contact information
 */
export interface ParticipantWithContext extends SharedWalletParticipant {
  /** Resolved identity from identity store */
  identity: Identity | null
  /** Resolved contact from contacts store */
  contact: Contact | null
  /** Current online status */
  onlineStatus: OnlineStatus
  /** Display name (contact name, identity nickname, or truncated pubkey) */
  displayName: string
}

/**
 * Parameters for proposing a spend
 */
export interface ProposeSpendParams {
  /** Recipient address */
  recipient: string
  /** Amount in satoshis */
  amount: bigint
  /** Fee in satoshis */
  fee: bigint
  /** Optional purpose/memo */
  purpose?: string
}

/**
 * Shared wallet context returned by the composable
 */
export interface SharedWalletContext {
  // === Data ===
  /** The shared wallet record */
  wallet: ComputedRef<SharedWallet | null>
  /** Participants with resolved identity/contact info */
  participants: ComputedRef<ParticipantWithContext[]>
  /** Active signing sessions for this wallet */
  activeSessions: ComputedRef<WalletSigningSession[]>
  /** Pending signing sessions for this wallet */
  pendingSessions: ComputedRef<WalletSigningSession[]>
  /** Number of online participants */
  onlineParticipantCount: ComputedRef<number>
  /** Total participant count */
  totalParticipantCount: ComputedRef<number>
  /** Whether all participants are online (can propose) */
  canPropose: ComputedRef<boolean>
  /** Wallet balance in satoshis */
  balanceSats: ComputedRef<bigint>
  /** Whether this wallet has any balance */
  hasBalance: ComputedRef<boolean>
  /** Shared address for receiving */
  sharedAddress: ComputedRef<string>
  /** Whether the current user is a participant */
  isParticipant: ComputedRef<boolean>

  // === Actions ===
  /** Propose a spend from this wallet */
  proposeSpend: (params: ProposeSpendParams) => Promise<{ sessionId: string }>
  /** Refresh the wallet balance */
  refreshBalance: () => Promise<void>
  /** Delete this shared wallet */
  deleteWallet: () => void
  /** Copy shared address to clipboard */
  copyAddress: () => Promise<void>
  /** Navigate to wallet detail page */
  viewDetails: () => void
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Get unified context for a shared wallet
 *
 * @param walletId - Shared wallet ID (string or ref)
 * @returns SharedWalletContext with reactive data and actions
 */
export function useSharedWalletContext(
  walletId: string | Ref<string>,
): SharedWalletContext {
  const musig2Store = useMuSig2Store()
  const identityStore = useIdentityStore()
  const contactsStore = useContactsStore()
  const walletStore = useWalletStore()
  const router = useRouter()

  // Resolve the ID (handles both string and ref)
  const id = computed(() => unref(walletId))

  // Get my public key for participant identification
  const myPublicKeyHex = computed(() =>
    walletStore.getPublicKeyHex(AccountPurpose.MUSIG2),
  )

  // === Computed Data ===

  const wallet = computed(
    () => musig2Store.sharedWallets.find(w => w.id === id.value) ?? null,
  )

  const participants = computed((): ParticipantWithContext[] => {
    if (!wallet.value) return []

    return wallet.value.participants.map(p => {
      // Resolve identity
      const identity = identityStore.get(p.publicKeyHex) ?? null

      // Resolve contact (check both identityId and legacy publicKey)
      const contact =
        contactsStore.contacts.find(
          c =>
            c.identityId === p.publicKeyHex || c.publicKey === p.publicKeyHex,
        ) ?? null

      // Get online status from identity store
      const onlineStatus = identityStore.getOnlineStatus(p.publicKeyHex)

      // Determine display name
      let displayName: string
      if (p.isMe) {
        displayName = 'You'
      } else if (contact?.name) {
        displayName = contact.name
      } else {
        displayName = `${p.publicKeyHex.slice(0, 8)}...`
      }

      return {
        ...p,
        identity,
        contact,
        onlineStatus,
        displayName,
      }
    })
  })

  const activeSessions = computed((): WalletSigningSession[] => {
    return musig2Store.activeSessions.filter(
      s => s.metadata?.walletId === id.value,
    )
  })

  const pendingSessions = computed((): WalletSigningSession[] => {
    return musig2Store.pendingSessions.filter(
      s => s.metadata?.walletId === id.value,
    )
  })

  const onlineParticipantCount = computed((): number => {
    return participants.value.filter(p => p.onlineStatus === 'online').length
  })

  const totalParticipantCount = computed((): number => {
    return participants.value.length
  })

  const canPropose = computed((): boolean => {
    if (!wallet.value) return false

    // MuSig2 is n-of-n: all participants must be online
    // However, we consider ourselves always "online"
    const othersOnline = participants.value.filter(
      p => !p.isMe && p.onlineStatus === 'online',
    ).length
    const othersCount = participants.value.filter(p => !p.isMe).length

    return othersOnline === othersCount
  })

  const balanceSats = computed((): bigint => {
    if (!wallet.value) return 0n
    return BigInt(wallet.value.balanceSats)
  })

  const hasBalance = computed((): boolean => {
    return balanceSats.value > 0n
  })

  const sharedAddress = computed((): string => {
    return wallet.value?.address ?? ''
  })

  const isParticipant = computed((): boolean => {
    if (!wallet.value || !myPublicKeyHex.value) return false
    return wallet.value.participants.some(
      p => p.publicKeyHex === myPublicKeyHex.value,
    )
  })

  // === Actions ===

  async function proposeSpend(
    params: ProposeSpendParams,
  ): Promise<{ sessionId: string }> {
    if (!wallet.value) {
      throw new Error('Wallet not found')
    }

    return await musig2Store.proposeSpend({
      walletId: wallet.value.id,
      recipient: params.recipient,
      amount: params.amount,
      fee: params.fee,
      purpose: params.purpose,
    })
  }

  async function refreshBalance(): Promise<void> {
    if (!wallet.value) return
    await musig2Store.refreshSharedWalletBalances()
  }

  function deleteWallet(): void {
    if (!wallet.value) return
    musig2Store.deleteSharedWallet(wallet.value.id)
  }

  async function copyAddress(): Promise<void> {
    if (!sharedAddress.value) return

    try {
      await navigator.clipboard.writeText(sharedAddress.value)
    } catch (error) {
      console.error('[useSharedWalletContext] Failed to copy address:', error)
    }
  }

  function viewDetails(): void {
    if (!wallet.value) return

    router.push({
      path: `/people/shared-wallets/${wallet.value.id}`,
    })
  }

  // === Return ===

  return {
    // Data
    wallet,
    participants,
    activeSessions,
    pendingSessions,
    onlineParticipantCount,
    totalParticipantCount,
    canPropose,
    balanceSats,
    hasBalance,
    sharedAddress,
    isParticipant,

    // Actions
    proposeSpend,
    refreshBalance,
    deleteWallet,
    copyAddress,
    viewDetails,
  }
}
