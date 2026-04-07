/**
 * CashWeb Signed Payload Types
 * 
 * Type wrappers for payload.proto (signed payload wrapper) protobuf definitions.
 * These provide convenient TypeScript types for signed payload operations.
 */

import type { wrapper } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  wrapper
}

// Signed payload types
export type SignedPayload = wrapper.ISignedPayload

/**
 * Verified signed payload with signature validation
 */
export interface VerifiedSignedPayload extends SignedPayload {
  verified: boolean
  publicKey: Uint8Array
  recoveredAddress?: string
}

/**
 * Payload signing options
 */
export interface PayloadSigningOptions {
  privateKey: Uint8Array
  publicKey?: Uint8Array
  scheme?: 'ECDSA' | string
}
