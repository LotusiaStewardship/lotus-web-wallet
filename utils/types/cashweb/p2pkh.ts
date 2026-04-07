/**
 * CashWeb P2pkh Types
 * 
 * Type wrappers for p2pkh.proto protobuf definitions.
 * These provide convenient TypeScript types for p2pkh operations.
 */

import type { p2pkh } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  p2pkh
}

// Interface types
export type IP2PKHEntry = p2pkh.IP2PKHEntry

// Helper types
export interface P2PKHPaymentDetails {
  transaction: Uint8Array
  amount?: bigint
}
