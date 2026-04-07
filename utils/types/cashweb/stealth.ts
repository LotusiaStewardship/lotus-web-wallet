/**
 * CashWeb Stealth Types
 * 
 * Type wrappers for stealth.proto protobuf definitions.
 * These provide convenient TypeScript types for stealth operations.
 */

import type { stealth } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  stealth
}

// Interface types
export type IStealthOutpoints = stealth.IStealthOutpoints
export type IStealthPaymentEntry = stealth.IStealthPaymentEntry

// Helper types
export interface StealthAddressInfo {
  ephemeralPubKey: Uint8Array
  stealthTx: Uint8Array
  vouts: number[]
}

export interface ParsedStealthPayment extends StealthPaymentEntry {
  txid?: string
  totalAmount?: bigint
}
