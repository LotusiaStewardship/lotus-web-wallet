/**
 * Contact Context Composable
 *
 * Phase 3: Facade Composable
 *
 * Provides a unified interface for contact-related UI.
 * Combines data from contacts, identity, p2p, musig2, and wallet stores.
 *
 * This composable eliminates the need for components to import multiple stores
 * and manually coordinate data from different sources.
 *
 * Usage:
 * ```typescript
 * const {
 *   contact,
 *   identity,
 *   onlineStatus,
 *   sharedWallets,
 *   send,
 *   createSharedWallet,
 * } = useContactContext(contactId)
 * ```
 */
import { computed, unref, type ComputedRef, type Ref } from 'vue'
import { useContactsStore, type Contact } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
import { useMuSig2Store, type SharedWallet } from '~/stores/musig2'
import { useWalletStore } from '~/stores/wallet'
import type { Identity } from '~/types/identity'
import type { OnlineStatus } from '~/types/contact'

// ============================================================================
// Types
// ============================================================================

/**
 * Contact context returned by the composable
 */
export interface ContactContext {
  // === Data ===
  /** The contact record */
  contact: ComputedRef<Contact | null>
  /** Resolved identity from identity store */
  identity: ComputedRef<Identity | null>
  /** Current online status */
  onlineStatus: ComputedRef<OnlineStatus>
  /** Shared wallets involving this contact */
  sharedWallets: ComputedRef<SharedWallet[]>
  /** Number of transactions with this contact */
  transactionCount: ComputedRef<number>
  /** Whether this contact can participate in MuSig2 */
  canMuSig2: ComputedRef<boolean>
  /** Whether the contact is currently online */
  isOnline: ComputedRef<boolean>
  /** Whether the contact is a favorite */
  isFavorite: ComputedRef<boolean>
  /** Display name for the contact */
  displayName: ComputedRef<string>
  /** Public key hex (from identity or legacy field) */
  publicKeyHex: ComputedRef<string | null>

  // === Actions ===
  /** Navigate to send page with this contact as recipient */
  send: () => void
  /** Navigate to edit this contact */
  edit: () => void
  /** Delete this contact */
  remove: () => Promise<boolean>
  /** Navigate to create shared wallet with this contact */
  createSharedWallet: () => void
  /** Copy address to clipboard */
  copyAddress: () => Promise<void>
  /** Copy public key to clipboard */
  copyPublicKey: () => Promise<void>
  /** Toggle favorite status */
  toggleFavorite: () => boolean
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Get unified context for a contact
 *
 * @param contactId - Contact ID (string or ref)
 * @returns ContactContext with reactive data and actions
 */
export function useContactContext(
  contactId: string | Ref<string>,
): ContactContext {
  const contactsStore = useContactsStore()
  const identityStore = useIdentityStore()
  const musig2Store = useMuSig2Store()
  const walletStore = useWalletStore()
  const router = useRouter()

  // Resolve the ID (handles both string and ref)
  const id = computed(() => unref(contactId))

  // === Computed Data ===

  const contact = computed(
    () => contactsStore.contacts.find(c => c.id === id.value) ?? null,
  )

  const identity = computed((): Identity | null => {
    if (!contact.value) return null

    // Try identityId first (preferred)
    if (contact.value.identityId) {
      return identityStore.get(contact.value.identityId) ?? null
    }

    // Fall back to legacy publicKey field
    if (contact.value.publicKey) {
      return identityStore.get(contact.value.publicKey) ?? null
    }

    return null
  })

  const onlineStatus = computed((): OnlineStatus => {
    // Use identity store's canonical method
    if (identity.value) {
      return identityStore.getOnlineStatus(identity.value.publicKeyHex)
    }

    // Legacy fallback
    if (contact.value?.publicKey) {
      return identityStore.getOnlineStatus(contact.value.publicKey)
    }

    return 'unknown'
  })

  const isOnline = computed(() => onlineStatus.value === 'online')

  const sharedWallets = computed((): SharedWallet[] => {
    const pubKey = publicKeyHex.value
    if (!pubKey) return []

    return musig2Store.sharedWallets.filter(w =>
      w.participants.some(p => p.publicKeyHex === pubKey),
    )
  })

  const transactionCount = computed((): number => {
    // Use contact's stored transaction count if available
    return contact.value?.transactionCount ?? 0
  })

  const canMuSig2 = computed((): boolean => {
    return !!(identity.value?.publicKeyHex || contact.value?.publicKey)
  })

  const isFavorite = computed((): boolean => {
    return contact.value?.isFavorite ?? false
  })

  const displayName = computed((): string => {
    return contact.value?.name ?? 'Unknown Contact'
  })

  const publicKeyHex = computed((): string | null => {
    return identity.value?.publicKeyHex ?? contact.value?.publicKey ?? null
  })

  // === Actions ===

  function send(): void {
    if (!contact.value?.address) return

    router.push({
      path: '/transact/send',
      query: { to: contact.value.address },
    })
  }

  function edit(): void {
    if (!contact.value) return

    router.push({
      path: '/people/contacts',
      query: { edit: contact.value.id },
    })
  }

  async function remove(): Promise<boolean> {
    if (!contact.value) return false
    return contactsStore.deleteContact(contact.value.id)
  }

  function createSharedWallet(): void {
    if (!contact.value) return

    router.push({
      path: '/people/shared-wallets',
      query: { createWith: contact.value.id },
    })
  }

  async function copyAddress(): Promise<void> {
    if (!contact.value?.address) return

    try {
      await navigator.clipboard.writeText(contact.value.address)
    } catch (error) {
      console.error('[useContactContext] Failed to copy address:', error)
    }
  }

  async function copyPublicKey(): Promise<void> {
    const pubKey = publicKeyHex.value
    if (!pubKey) return

    try {
      await navigator.clipboard.writeText(pubKey)
    } catch (error) {
      console.error('[useContactContext] Failed to copy public key:', error)
    }
  }

  function toggleFavorite(): boolean {
    if (!contact.value) return false
    return contactsStore.toggleFavorite(contact.value.id)
  }

  // === Return ===

  return {
    // Data
    contact,
    identity,
    onlineStatus,
    sharedWallets,
    transactionCount,
    canMuSig2,
    isOnline,
    isFavorite,
    displayName,
    publicKeyHex,

    // Actions
    send,
    edit,
    remove,
    createSharedWallet,
    copyAddress,
    copyPublicKey,
    toggleFavorite,
  }
}
