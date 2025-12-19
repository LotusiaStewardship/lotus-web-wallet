/**
 * Signer Context Composable
 *
 * Phase 3: Facade Composable
 *
 * Provides a unified interface for signer discovery and advertisement UI.
 * Combines data from musig2, identity, and contacts stores.
 *
 * This composable eliminates the need for components to import multiple stores
 * and manually coordinate signer data with identity/contact information.
 *
 * Usage:
 * ```typescript
 * const {
 *   discoveredSigners,
 *   isAdvertising,
 *   advertise,
 *   withdraw,
 *   refresh,
 * } = useSignerContext()
 * ```
 */
import { computed, type ComputedRef } from 'vue'
import {
  useMuSig2Store,
  type StoreSigner,
  type SignerConfig,
} from '~/stores/musig2'
import { useIdentityStore } from '~/stores/identity'
import { useContactsStore, type Contact } from '~/stores/contacts'
import { useP2PStore } from '~/stores/p2p'
import type { Identity } from '~/types/identity'
import type { OnlineStatus } from '~/types/contact'

// ============================================================================
// Types
// ============================================================================

/**
 * Signer with resolved identity and contact information
 */
export interface SignerWithContext {
  /** The raw signer data from store */
  signer: StoreSigner
  /** Resolved identity from identity store */
  identity: Identity | null
  /** Resolved contact from contacts store */
  contact: Contact | null
  /** Current online status */
  onlineStatus: OnlineStatus
  /** Display name (contact name, signer nickname, or truncated pubkey) */
  displayName: string
  /** Whether this signer is a known contact */
  isContact: boolean
  /** Whether this is the current user */
  isMe: boolean
}

/**
 * Signer context returned by the composable
 */
export interface SignerContext {
  // === Data ===
  /** Discovered signers with resolved identity/contact info */
  discoveredSigners: ComputedRef<SignerWithContext[]>
  /** Online signers only */
  onlineSigners: ComputedRef<SignerWithContext[]>
  /** Signers who are also contacts */
  contactSigners: ComputedRef<SignerWithContext[]>
  /** Whether currently advertising as a signer */
  isAdvertising: ComputedRef<boolean>
  /** My current signer configuration */
  myConfig: ComputedRef<SignerConfig | null>
  /** Whether MuSig2 is initialized */
  isInitialized: ComputedRef<boolean>
  /** Whether currently loading */
  isLoading: ComputedRef<boolean>
  /** Current error message */
  error: ComputedRef<string | null>
  /** Total discovered signer count */
  signerCount: ComputedRef<number>
  /** Online signer count */
  onlineSignerCount: ComputedRef<number>

  // === Actions ===
  /** Start advertising as a signer */
  advertise: (config: SignerConfig) => Promise<void>
  /** Stop advertising as a signer */
  withdraw: () => Promise<void>
  /** Refresh discovered signers */
  refresh: () => Promise<void>
  /** Initialize MuSig2 system */
  initialize: () => Promise<void>
  /** Add a signer as a contact */
  addAsContact: (signer: SignerWithContext) => Contact
  /** Subscribe to a signer for updates */
  subscribeToSigner: (signerId: string) => Promise<void>
  /** Unsubscribe from a signer */
  unsubscribeFromSigner: (signerId: string) => Promise<void>
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Get unified context for signer discovery and advertisement
 *
 * @returns SignerContext with reactive data and actions
 */
export function useSignerContext(): SignerContext {
  const musig2Store = useMuSig2Store()
  const identityStore = useIdentityStore()
  const contactsStore = useContactsStore()
  const p2pStore = useP2PStore()

  // === Computed Data ===

  const discoveredSigners = computed((): SignerWithContext[] => {
    return musig2Store.discoveredSigners.map(signer => {
      // Resolve identity
      const identity = identityStore.get(signer.publicKey) ?? null

      // Resolve contact (check both identityId and legacy publicKey)
      const contact =
        contactsStore.contacts.find(
          c =>
            c.identityId === signer.publicKey ||
            c.publicKey === signer.publicKey,
        ) ?? null

      // Get online status from identity store
      const onlineStatus = identityStore.getOnlineStatus(signer.publicKey)

      // Check if this is the current user
      const isMe = signer.peerId === p2pStore.peerId

      // Determine display name
      let displayName: string
      if (isMe) {
        displayName = 'You'
      } else if (contact?.name) {
        displayName = contact.name
      } else if (signer.nickname) {
        displayName = signer.nickname
      } else {
        displayName = `${signer.publicKey.slice(0, 8)}...`
      }

      return {
        signer,
        identity,
        contact,
        onlineStatus,
        displayName,
        isContact: !!contact,
        isMe,
      }
    })
  })

  const onlineSigners = computed((): SignerWithContext[] => {
    return discoveredSigners.value.filter(s => s.onlineStatus === 'online')
  })

  const contactSigners = computed((): SignerWithContext[] => {
    return discoveredSigners.value.filter(s => s.isContact)
  })

  const isAdvertising = computed((): boolean => {
    return musig2Store.signerEnabled
  })

  const myConfig = computed((): SignerConfig | null => {
    return musig2Store.signerConfig
  })

  const isInitialized = computed((): boolean => {
    return musig2Store.initialized
  })

  const isLoading = computed((): boolean => {
    return musig2Store.loading
  })

  const error = computed((): string | null => {
    return musig2Store.error
  })

  const signerCount = computed((): number => {
    return discoveredSigners.value.length
  })

  const onlineSignerCount = computed((): number => {
    return onlineSigners.value.length
  })

  // === Actions ===

  async function advertise(config: SignerConfig): Promise<void> {
    await musig2Store.advertiseSigner(config)
  }

  async function withdraw(): Promise<void> {
    await musig2Store.withdrawSigner()
  }

  async function refresh(): Promise<void> {
    await musig2Store.refreshSigners()
  }

  async function initialize(): Promise<void> {
    await musig2Store.initialize()
  }

  function addAsContact(signerCtx: SignerWithContext): Contact {
    // Use the contacts store's addFromSigner method
    return contactsStore.addFromSigner({
      publicKeyHex: signerCtx.signer.publicKey,
      peerId: signerCtx.signer.peerId,
      nickname: signerCtx.signer.nickname,
    })
  }

  async function subscribeToSigner(signerId: string): Promise<void> {
    await musig2Store.subscribeToSigner(signerId)
  }

  async function unsubscribeFromSigner(signerId: string): Promise<void> {
    await musig2Store.unsubscribeFromSigner(signerId)
  }

  // === Return ===

  return {
    // Data
    discoveredSigners,
    onlineSigners,
    contactSigners,
    isAdvertising,
    myConfig,
    isInitialized,
    isLoading,
    error,
    signerCount,
    onlineSignerCount,

    // Actions
    advertise,
    withdraw,
    refresh,
    initialize,
    addAsContact,
    subscribeToSigner,
    unsubscribeFromSigner,
  }
}
