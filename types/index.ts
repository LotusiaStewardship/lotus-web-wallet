/**
 * Types Index
 *
 * Central export for all type definitions.
 */

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

// P2P types
export * from './p2p'

// Transaction types
export * from './transaction'

// UI types
export * from './ui'
