/**
 * Types Index
 *
 * Central export for all type definitions.
 */

// Identity types (unified identity model)
export * from './identity'

// Account types (BIP44 multi-address)
export * from './accounts'

// Wallet types
export * from './wallet'

// Transaction types
export * from './transaction'

// Contact types
// Note: SignerCapabilities is also exported from musig2.ts with different shape
// Use ContactSignerCapabilities from contact.ts for contact-related signer info
export {
  type ContactAddresses,
  type SignerCapabilities as ContactSignerCapabilities,
  type Contact,
  type ContactInput,
  type ContactUpdate,
  type OnlineStatus,
  type ContactWithIdentity,
  type ContactGroup,
  type ContactsState,
  type ContactSearchOptions,
  type ContactSearchResult,
  type ContactExport,
  type ContactImportOptions,
  type ContactImportResult,
  CONTACTS_STORAGE_KEY,
  CONTACTS_EXPORT_VERSION,
  MAX_CONTACTS,
  MAX_TAGS_PER_CONTACT,
  MAX_TAG_LENGTH,
} from './contact'

// Network types
export * from './network'

// P2P types
export * from './p2p'

// MuSig2 types
export * from './musig2'

// UI types
export * from './ui'
