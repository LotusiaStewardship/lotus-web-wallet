/**
 * Contacts Store
 * Manages contact list with CRUD operations and search functionality
 *
 * Phase 4: Contact System Refactor
 * - Contacts now link to unified identities via identityId
 * - Address derivation from public key
 * - Multi-signal online status detection
 */
import { defineStore } from 'pinia'
import { getItem, setItem, STORAGE_KEYS } from '~/utils/storage'
import { useIdentityStore } from './identity'
import { useP2PStore } from './p2p'
import type { NetworkType } from './network'
import { useNetworkStore } from './network'
import type { Identity, IdentitySignerCapabilities } from '~/types/identity'
import { IdentityLevel } from '~/types/identity'
import type { OnlineStatus, ContactWithIdentity } from '~/types/contact'
import {
  isValidPublicKey,
  deriveAddressFromPublicKey,
  getIdentityLevel,
} from '~/utils/identity'

// Types
export interface ContactAddresses {
  /** Mainnet address */
  livenet?: string
  /** Testnet address */
  testnet?: string
  /** Regtest address */
  regtest?: string
}

/**
 * Signer capabilities for MuSig2
 */
export interface SignerCapabilities {
  /** Supports MuSig2 signing */
  musig2: boolean
  /** Threshold for multi-sig (optional) */
  threshold?: number
}

export interface Contact {
  // === IDENTIFICATION ===
  id: string
  name: string

  // === IDENTITY LINK ===
  /**
   * Reference to unified identity (publicKeyHex).
   * When set, identity properties come from the Identity store.
   */
  identityId?: string

  // === ADDRESS ===
  /**
   * Lotus address for this contact.
   * - If identityId is set: derived from identity's publicKey
   * - If identityId is not set: stored directly (legacy contact)
   */
  address: string
  /** Network-specific addresses */
  addresses?: ContactAddresses

  // === RELATIONSHIP METADATA ===
  notes?: string
  avatar?: string
  tags?: string[]
  isFavorite?: boolean
  groupId?: string

  // === P2P CONNECTIVITY (legacy - prefer identityId) ===
  /** @deprecated Use identityId to link to Identity with peerId */
  peerId?: string
  serviceType?: string
  /** @deprecated Use identityId to link to Identity with publicKeyHex */
  publicKey?: string
  /** @deprecated Use identityId to link to Identity with signerCapabilities */
  signerCapabilities?: SignerCapabilities
  /** @deprecated Use identityId to link to Identity with lastSeenAt */
  lastSeenOnline?: number

  // === ACTIVITY TRACKING ===
  lastTransactionAt?: number
  totalSent?: bigint
  totalReceived?: bigint
  transactionCount?: number

  // === TIMESTAMPS ===
  createdAt: number
  updatedAt: number
}

export interface ContactGroup {
  id: string
  name: string
  icon: string
  color: string
  createdAt: number
}

export interface ContactsState {
  contacts: Contact[]
  groups: ContactGroup[]
  initialized: boolean
}

// Generate unique ID
const generateId = (prefix: string = 'contact') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

/**
 * Get online status for a contact.
 * Phase 2: Delegates to identity store as the canonical source.
 *
 * @param contact - The contact to check
 * @param identity - Resolved identity (if any)
 * @param _p2pStore - P2P store instance (kept for backwards compatibility)
 * @returns OnlineStatus
 */
function getOnlineStatusForContact(
  contact: Contact,
  identity: Identity | undefined,
  _p2pStore: ReturnType<typeof useP2PStore>,
): OnlineStatus {
  const identityStore = useIdentityStore()

  // If contact has identity reference, use identity store's canonical method
  if (contact.identityId) {
    return identityStore.getOnlineStatus(contact.identityId)
  }

  // Legacy: Try to find identity by public key
  if (contact.publicKey) {
    return identityStore.getOnlineStatus(contact.publicKey)
  }

  // Legacy fallback: Check identity if resolved
  if (identity) {
    return identityStore.getOnlineStatus(identity.publicKeyHex)
  }

  return 'unknown'
}

/**
 * Get the address for a contact on the specified network
 * Falls back to the legacy address field if no network-specific address exists
 */
export const getContactAddress = (
  contact: Contact,
  network: NetworkType,
): string | undefined => {
  // First check network-specific addresses
  if (contact.addresses?.[network]) {
    return contact.addresses[network]
  }
  // Fall back to legacy address field if it matches the requested network
  // (determined by the address prefix)
  if (contact.address) {
    const addressNetwork = getNetworkFromAddress(contact.address)
    if (addressNetwork === network) {
      return contact.address
    }
  }
  return undefined
}

/**
 * Determine network from address string
 */
const getNetworkFromAddress = (address: string): NetworkType | null => {
  if (!address || !address.startsWith('lotus')) return null
  const networkChar = address.charAt(5)
  switch (networkChar) {
    case '_':
      return 'livenet'
    case 'T':
      return 'testnet'
    /* case 'R':
      return 'regtest' */
    default:
      return null
  }
}

/**
 * Check if contact has an address for the specified network
 */
export const hasAddressForNetwork = (
  contact: Contact,
  network: NetworkType,
): boolean => {
  return !!getContactAddress(contact, network)
}

export const useContactsStore = defineStore('contacts', {
  state: (): ContactsState => ({
    contacts: [],
    groups: [],
    initialized: false,
  }),

  getters: {
    /**
     * Get all contacts sorted alphabetically by name
     */
    sortedContacts: state => {
      return [...state.contacts].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      )
    },

    /**
     * Get contact count
     */
    contactCount: state => state.contacts.length,

    /**
     * Search contacts by name or address (favorites prioritized)
     */
    searchContacts: state => {
      return (query: string) => {
        if (!query.trim()) return []
        const lowerQuery = query.toLowerCase()
        return state.contacts
          .filter(
            c =>
              c.name.toLowerCase().includes(lowerQuery) ||
              c.address.toLowerCase().includes(lowerQuery) ||
              c.tags?.some(t => t.toLowerCase().includes(lowerQuery)),
          )
          .sort((a, b) => {
            // Favorites first
            if (a.isFavorite && !b.isFavorite) return -1
            if (!a.isFavorite && b.isFavorite) return 1
            // Then prioritize name matches over address matches
            const aNameMatch = a.name.toLowerCase().includes(lowerQuery)
            const bNameMatch = b.name.toLowerCase().includes(lowerQuery)
            if (aNameMatch && !bNameMatch) return -1
            if (!aNameMatch && bNameMatch) return 1
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          })
      }
    },

    /**
     * Get contact by ID
     */
    getContactById: state => {
      return (id: string) => state.contacts.find(c => c.id === id)
    },

    /**
     * Get contact by address
     */
    getContactByAddress: state => {
      return (address: string) =>
        state.contacts.find(
          c => c.address.toLowerCase() === address.toLowerCase(),
        )
    },

    /**
     * Get contact by peer ID (for P2P integration)
     */
    getContactByPeerId: state => {
      return (peerId: string) => state.contacts.find(c => c.peerId === peerId)
    },

    /**
     * Get contacts with P2P peer IDs
     */
    p2pContacts: state => {
      return state.contacts.filter(c => c.peerId)
    },

    /**
     * Get contacts by tag
     */
    getContactsByTag: state => {
      return (tag: string) =>
        state.contacts.filter(c =>
          c.tags?.some(t => t.toLowerCase() === tag.toLowerCase()),
        )
    },

    /**
     * Get all unique tags
     */
    allTags: state => {
      const tags = new Set<string>()
      state.contacts.forEach(c => c.tags?.forEach(t => tags.add(t)))
      return Array.from(tags).sort()
    },

    /**
     * Get favorite contacts
     */
    favoriteContacts: state => {
      return state.contacts
        .filter(c => c.isFavorite)
        .sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
        )
    },

    /**
     * Get favorite count
     */
    favoriteCount: state => state.contacts.filter(c => c.isFavorite).length,

    /**
     * Get contacts with public keys (for MuSig2)
     * Checks both identityId and legacy publicKey field
     */
    contactsWithPublicKeys: state => {
      return state.contacts.filter(c => c.identityId || c.publicKey)
    },

    /**
     * Find contact by public key (checks both identityId and legacy publicKey)
     */
    findByPublicKey: state => {
      return (publicKey: string) => {
        const normalized = publicKey.toLowerCase()
        return state.contacts.find(
          c =>
            c.identityId?.toLowerCase() === normalized ||
            c.publicKey?.toLowerCase() === normalized,
        )
      }
    },

    /**
     * Find contact by address
     */
    findByAddress: state => {
      return (address: string) =>
        state.contacts.find(
          c => c.address.toLowerCase() === address.toLowerCase(),
        )
    },

    /**
     * Find contact by peer ID (checks identity and legacy peerId)
     */
    findByPeerId: state => {
      return (peerId: string) => {
        // Check legacy field first
        const legacy = state.contacts.find(c => c.peerId === peerId)
        if (legacy) return legacy

        // Check via identity store
        const identityStore = useIdentityStore()
        const identity = identityStore.findByPeerId(peerId)
        if (identity) {
          return state.contacts.find(
            c => c.identityId === identity.publicKeyHex,
          )
        }

        return undefined
      }
    },

    /**
     * Get contacts sorted with favorites first
     */
    contactsWithFavoritesFirst: state => {
      return [...state.contacts].sort((a, b) => {
        // Favorites first
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        // Then alphabetically
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      })
    },

    /**
     * Get all groups sorted by name
     */
    sortedGroups: state => {
      return [...state.groups].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      )
    },

    /**
     * Get contacts by group ID
     */
    getContactsByGroup: state => {
      return (groupId: string) =>
        state.contacts.filter(c => c.groupId === groupId)
    },

    /**
     * Get contacts without a group
     */
    ungroupedContacts: state => {
      return state.contacts.filter(c => !c.groupId)
    },

    /**
     * Get group by ID
     */
    getGroupById: state => {
      return (id: string) => state.groups.find(g => g.id === id)
    },

    /**
     * Get contacts with MuSig2 capabilities (can participate in shared wallets)
     */
    signerContacts(): ContactWithIdentity[] {
      return this.contactsWithIdentity.filter(c => c.canMuSig2)
    },

    /**
     * Get online contacts
     */
    onlineContacts(): ContactWithIdentity[] {
      return this.contactsWithIdentity.filter(c => c.isOnline)
    },

    /**
     * Get contacts with resolved identity information
     */
    contactsWithIdentity(): ContactWithIdentity[] {
      const identityStore = useIdentityStore()
      const p2pStore = useP2PStore()

      return this.contacts.map(contact => {
        const identity = contact.identityId
          ? identityStore.get(contact.identityId)
          : undefined

        const onlineStatus = getOnlineStatusForContact(
          contact,
          identity,
          p2pStore,
        )

        return {
          ...contact,
          identity,
          onlineStatus,
          isOnline: onlineStatus === 'online',
          canMuSig2: !!(identity?.publicKeyHex || contact.publicKey),
          level: identity
            ? getIdentityLevel(identity)
            : IdentityLevel.ADDRESS_ONLY,
        }
      })
    },
  },

  actions: {
    /**
     * Initialize contacts and groups from storage service
     */
    initialize() {
      if (this.initialized) return

      const saved = getItem<{ contacts: Contact[]; groups: ContactGroup[] }>(
        STORAGE_KEYS.CONTACTS,
        { contacts: [], groups: [] },
      )
      this.contacts = saved.contacts || []
      this.groups = saved.groups || []
      this.initialized = true

      // Phase 2: Migrate legacy contacts to identity system
      this._migrateContactsToIdentity()
    },

    /**
     * Save contacts and groups to storage service
     */
    saveContacts() {
      setItem(STORAGE_KEYS.CONTACTS, {
        contacts: this.contacts,
        groups: this.groups,
      })
    },

    /**
     * Add a new contact.
     * If publicKey is provided, creates/links to an Identity and derives address.
     *
     * @param data - Contact data (without auto-generated fields)
     * @returns The created contact
     */
    addContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
      const identityStore = useIdentityStore()
      const networkStore = useNetworkStore()

      let identityId: string | undefined
      let derivedAddress = data.address

      // If public key provided, create/link identity and derive address
      if (data.publicKey && isValidPublicKey(data.publicKey)) {
        const network = networkStore.currentNetwork as 'livenet' | 'testnet'
        const identity = identityStore.findOrCreate(data.publicKey, network)
        identityId = identity.publicKeyHex
        derivedAddress = identity.address

        // Copy P2P info to identity if present
        if (data.peerId) {
          identityStore.update(identity.publicKeyHex, {
            peerId: data.peerId,
          })
        }

        // Copy signer capabilities to identity if present
        if (data.signerCapabilities) {
          identityStore.update(identity.publicKeyHex, {
            signerCapabilities: {
              transactionTypes: ['any'],
              available: data.signerCapabilities.musig2,
            },
          })
        }

        console.log('[Contacts] Created identity for contact:', {
          publicKey: data.publicKey.slice(0, 16) + '...',
          address: derivedAddress?.slice(0, 20) + '...',
        })
      }

      // Check for duplicate address
      if (derivedAddress) {
        const existing = this.contacts.find(
          c => c.address.toLowerCase() === derivedAddress.toLowerCase(),
        )
        if (existing) {
          console.warn(
            '[Contacts] Contact already exists with address:',
            existing.name,
          )
          // Return existing contact instead of throwing
          return existing
        }
      }

      const now = Date.now()
      const newContact: Contact = {
        ...data,
        id: generateId(),
        identityId,
        address: derivedAddress || '',
        tags: data.tags || [],
        isFavorite: data.isFavorite || false,
        createdAt: now,
        updatedAt: now,
      }

      this.contacts.push(newContact)
      this.saveContacts()

      console.log('[Contacts] Added contact:', {
        name: newContact.name,
        hasIdentity: !!identityId,
        address: newContact.address?.slice(0, 20) + '...',
      })

      return newContact
    },

    /**
     * Create a contact from a discovered signer.
     * Automatically derives address from signer's public key.
     *
     * @param signer - Discovered signer data
     * @returns The created or existing contact
     */
    addFromSigner(signer: {
      publicKeyHex: string
      peerId?: string
      nickname?: string
      transactionTypes?: string[]
      amountRange?: { min?: number; max?: number }
      fee?: number
      expiresAt?: number
    }): Contact {
      // Check if contact already exists by public key
      const existingByPubKey = this.contacts.find(
        c =>
          c.identityId === signer.publicKeyHex ||
          c.publicKey === signer.publicKeyHex,
      )
      if (existingByPubKey) {
        console.log(
          '[Contacts] Contact already exists for signer:',
          existingByPubKey.name,
        )
        return existingByPubKey
      }

      return this.addContact({
        name: signer.nickname || `Signer ${signer.publicKeyHex.slice(0, 8)}`,
        address: '', // Will be derived from publicKey
        publicKey: signer.publicKeyHex,
        peerId: signer.peerId,
        signerCapabilities: {
          musig2: true,
        },
        tags: ['signer'],
        isFavorite: false,
      })
    },

    /**
     * Update an existing contact
     */
    updateContact(
      id: string,
      updates: Partial<Omit<Contact, 'id' | 'createdAt'>>,
    ): Contact | null {
      const index = this.contacts.findIndex(c => c.id === id)
      if (index === -1) return null

      const updated: Contact = {
        ...this.contacts[index],
        ...updates,
        updatedAt: Date.now(),
      }

      this.contacts[index] = updated
      this.saveContacts()

      return updated
    },

    /**
     * Delete a contact
     */
    deleteContact(id: string): boolean {
      const index = this.contacts.findIndex(c => c.id === id)
      if (index === -1) return false

      this.contacts.splice(index, 1)
      this.saveContacts()

      return true
    },

    /**
     * Check if an address exists in contacts
     */
    hasAddress(address: string): boolean {
      return this.contacts.some(
        c => c.address.toLowerCase() === address.toLowerCase(),
      )
    },

    /**
     * Import contacts from JSON
     */
    importContacts(
      contactsData: Array<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>,
      merge: boolean = true,
    ): number {
      let imported = 0
      const now = Date.now()

      if (!merge) {
        this.contacts = []
      }

      for (const data of contactsData) {
        // Skip if address already exists (when merging)
        if (merge && this.hasAddress(data.address)) {
          continue
        }

        this.contacts.push({
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        })
        imported++
      }

      this.saveContacts()
      return imported
    },

    /**
     * Export contacts as JSON
     */
    exportContacts(): string {
      const exportData = this.contacts.map(
        ({ id, createdAt, updatedAt, ...rest }) => rest,
      )
      return JSON.stringify(exportData, null, 2)
    },

    /**
     * Add or update contact from P2P service discovery
     */
    upsertFromP2P(
      peerId: string,
      name: string,
      address: string,
      serviceType?: string,
    ): Contact {
      const existing = this.getContactByPeerId(peerId)

      if (existing) {
        return this.updateContact(existing.id, {
          name,
          address,
          serviceType,
        })!
      }

      return this.addContact({
        name,
        address,
        peerId,
        serviceType,
        tags: ['p2p'],
      })
    },

    /**
     * Clear all contacts
     */
    clearAllContacts() {
      this.contacts = []
      this.saveContacts()
    },

    /**
     * Toggle favorite status for a contact
     */
    toggleFavorite(id: string): boolean {
      const contact = this.contacts.find(c => c.id === id)
      if (!contact) return false

      contact.isFavorite = !contact.isFavorite
      contact.updatedAt = Date.now()
      this.saveContacts()

      return contact.isFavorite
    },

    /**
     * Set favorite status for a contact
     */
    setFavorite(id: string, isFavorite: boolean): boolean {
      const contact = this.contacts.find(c => c.id === id)
      if (!contact) return false

      contact.isFavorite = isFavorite
      contact.updatedAt = Date.now()
      this.saveContacts()

      return true
    },

    // =========================================================================
    // Group Management
    // =========================================================================

    /**
     * Create a new contact group
     */
    createGroup(name: string, icon: string, color: string): ContactGroup {
      const group: ContactGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name,
        icon,
        color,
        createdAt: Date.now(),
      }

      this.groups.push(group)
      this.saveContacts()

      return group
    },

    /**
     * Update a group
     */
    updateGroup(
      id: string,
      updates: Partial<Omit<ContactGroup, 'id' | 'createdAt'>>,
    ): ContactGroup | null {
      const group = this.groups.find(g => g.id === id)
      if (!group) return null

      Object.assign(group, updates)
      this.saveContacts()

      return group
    },

    /**
     * Delete a group (contacts in the group become ungrouped)
     */
    deleteGroup(id: string): boolean {
      const index = this.groups.findIndex(g => g.id === id)
      if (index === -1) return false

      // Remove group from all contacts
      this.contacts.forEach(c => {
        if (c.groupId === id) {
          c.groupId = undefined
          c.updatedAt = Date.now()
        }
      })

      this.groups.splice(index, 1)
      this.saveContacts()

      return true
    },

    /**
     * Assign a contact to a group
     */
    assignToGroup(contactId: string, groupId: string | null): boolean {
      const contact = this.contacts.find(c => c.id === contactId)
      if (!contact) return false

      contact.groupId = groupId || undefined
      contact.updatedAt = Date.now()
      this.saveContacts()

      return true
    },

    /**
     * Update contact's P2P info (public key, peer ID, capabilities, last seen)
     */
    updateP2PInfo(
      id: string,
      info: {
        publicKey?: string
        peerId?: string
        signerCapabilities?: SignerCapabilities
        lastSeenOnline?: number
      },
    ): Contact | null {
      const contact = this.contacts.find(c => c.id === id)
      if (!contact) return null

      if (info.publicKey !== undefined) contact.publicKey = info.publicKey
      if (info.peerId !== undefined) contact.peerId = info.peerId
      if (info.signerCapabilities !== undefined)
        contact.signerCapabilities = info.signerCapabilities
      if (info.lastSeenOnline !== undefined)
        contact.lastSeenOnline = info.lastSeenOnline

      contact.updatedAt = Date.now()
      this.saveContacts()

      return contact
    },

    /**
     * Update contact's last seen online timestamp by peer ID
     * Called when peer activity is detected
     */
    updateLastSeen(peerId: string): void {
      // Update legacy contact field
      const contact = this.contacts.find(c => c.peerId === peerId)
      if (contact) {
        contact.lastSeenOnline = Date.now()
        this.saveContacts()
      }

      // Also update identity store if identity exists for this peer
      const identityStore = useIdentityStore()
      const identity = identityStore.findByPeerId(peerId)
      if (identity) {
        identityStore.updatePresence(identity.publicKeyHex, {
          isOnline: true,
          lastSeenAt: Date.now(),
        })
      }
    },

    /**
     * Update contact's signer capabilities
     */
    updateSignerCapabilities(
      contactId: string,
      capabilities: SignerCapabilities,
    ): Contact | null {
      const contact = this.contacts.find(c => c.id === contactId)
      if (!contact) return null

      contact.signerCapabilities = capabilities
      contact.updatedAt = Date.now()
      this.saveContacts()

      return contact
    },

    /**
     * Get a single contact with resolved identity information
     *
     * @param id - Contact ID
     * @returns ContactWithIdentity or undefined if not found
     */
    getContactWithIdentity(id: string): ContactWithIdentity | undefined {
      const contact = this.contacts.find(c => c.id === id)
      if (!contact) return undefined

      const identityStore = useIdentityStore()
      const p2pStore = useP2PStore()

      const identity = contact.identityId
        ? identityStore.get(contact.identityId)
        : undefined

      const onlineStatus = getOnlineStatusForContact(
        contact,
        identity,
        p2pStore,
      )

      return {
        ...contact,
        identity,
        onlineStatus,
        isOnline: onlineStatus === 'online',
        canMuSig2: !!(identity?.publicKeyHex || contact.publicKey),
        level: identity
          ? getIdentityLevel(identity)
          : IdentityLevel.ADDRESS_ONLY,
      }
    },

    /**
     * Get online status for a contact
     *
     * @param contact - Contact to check
     * @returns OnlineStatus
     */
    getOnlineStatus(contact: Contact): OnlineStatus {
      const identityStore = useIdentityStore()
      const p2pStore = useP2PStore()

      const identity = contact.identityId
        ? identityStore.get(contact.identityId)
        : undefined

      return getOnlineStatusForContact(contact, identity, p2pStore)
    },

    /**
     * Check if a contact is currently online
     *
     * @param contact - Contact to check
     * @returns true if online
     */
    isContactOnline(contact: Contact): boolean {
      return this.getOnlineStatus(contact) === 'online'
    },

    // =========================================================================
    // Phase 2: Identity Migration
    // =========================================================================

    /**
     * Migrate legacy contacts to use identityId.
     * Copies legacy P2P data to identity store.
     */
    _migrateContactsToIdentity() {
      const identityStore = useIdentityStore()
      const networkStore = useNetworkStore()
      const network = networkStore.currentNetwork as 'livenet' | 'testnet'

      let migrated = 0

      for (const contact of this.contacts) {
        // Skip if already has identityId
        if (contact.identityId) continue

        // Migrate contacts with public key
        if (contact.publicKey) {
          try {
            const identity = identityStore.findOrCreate(
              contact.publicKey,
              network,
            )

            // Copy legacy data to identity
            if (contact.peerId && !identity.peerId) {
              identity.peerId = contact.peerId
            }
            if (contact.lastSeenOnline && !identity.lastSeenAt) {
              identity.lastSeenAt = contact.lastSeenOnline
            }
            if (contact.signerCapabilities && !identity.signerCapabilities) {
              identity.signerCapabilities = {
                transactionTypes: ['any'],
                available: contact.signerCapabilities.musig2,
              }
            }

            // Set identity reference
            contact.identityId = identity.publicKeyHex
            migrated++
          } catch (error) {
            console.warn(
              `[Contacts] Failed to migrate contact ${contact.name}:`,
              error,
            )
          }
        }
      }

      if (migrated > 0) {
        console.log(
          `[Contacts] Migrated ${migrated} contacts to identity system`,
        )
        identityStore.save()
        this.saveContacts()
      }
    },
  },
})
