/**
 * Contacts Store
 * Manages contact list with CRUD operations and search functionality
 */
import { defineStore } from 'pinia'

import type { NetworkType } from './network'
import { useNetworkStore } from './network'

// Types
export interface ContactAddresses {
  /** Mainnet address */
  livenet?: string
  /** Testnet address */
  testnet?: string
  /** Regtest address */
  regtest?: string
}

export interface Contact {
  id: string
  name: string
  /** @deprecated Use addresses object instead. Kept for backward compatibility. */
  address: string
  /** Network-specific addresses */
  addresses?: ContactAddresses
  notes?: string
  avatar?: string // Optional avatar URL or base64
  tags?: string[] // Optional tags for categorization
  peerId?: string // Optional P2P peer ID for discovered services
  serviceType?: string // Optional service type from P2P discovery
  isFavorite?: boolean // Favorite/starred contact for quick access
  createdAt: number
  updatedAt: number
}

export interface ContactsState {
  contacts: Contact[]
  initialized: boolean
}

// Storage key
const STORAGE_KEY = 'lotus-wallet-contacts'

// Generate unique ID
const generateId = () =>
  `contact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

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
    case 'R':
      return 'regtest'
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
  },

  actions: {
    /**
     * Initialize contacts from localStorage
     */
    initialize() {
      if (this.initialized) return

      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          this.contacts = parsed.contacts || []
        }
        this.initialized = true
      } catch (error) {
        console.error('Failed to load contacts:', error)
        this.contacts = []
        this.initialized = true
      }
    },

    /**
     * Save contacts to localStorage
     */
    saveContacts() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ contacts: this.contacts }),
        )
      } catch (error) {
        console.error('Failed to save contacts:', error)
      }
    },

    /**
     * Add a new contact
     */
    addContact(
      contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
    ): Contact {
      const now = Date.now()
      const newContact: Contact = {
        ...contact,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }

      this.contacts.push(newContact)
      this.saveContacts()

      return newContact
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
  },
})
