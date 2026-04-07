/**
 * CashWeb Wrapper Types
 * 
 * Type wrappers for wrapper.proto protobuf definitions.
 * These provide convenient TypeScript types for wrapper operations.
 */

import type { wrapper } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  wrapper
}

// Interface types
export type IBurnOutputs = wrapper.IBurnOutputs
export type ISignedPayload = wrapper.ISignedPayload
export type ISignedPayloadSet = wrapper.ISignedPayloadSet

// Helper types
export interface VerifiedSignedPayload {
  payload: SignedPayload
  isValid: boolean
  publicKey: Uint8Array
}

export interface PayloadSigningOptions {
  privateKey: Uint8Array
  scheme?: 'schnorr' | 'ecdsa'
  payload: Uint8Array
}
