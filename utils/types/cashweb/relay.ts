/**
 * CashWeb Relay Types
 * 
 * Type wrappers for relay.proto protobuf definitions.
 * These provide convenient TypeScript types for relay operations.
 */

import type { relay } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  relay
}

// Interface types
export type IHeader = relay.IHeader
export type IProfileEntry = relay.IProfileEntry
export type IProfile = relay.IProfile
export type IPayloadEntry = relay.IPayloadEntry
export type IPayload = relay.IPayload
export type IStampOutpoints = relay.IStampOutpoints
export type IStamp = relay.IStamp
export type IMessage = relay.IMessage
export type IMessageSet = relay.IMessageSet
export type IPushError = relay.IPushError
export type IPushErrors = relay.IPushErrors
export type IMessagePage = relay.IMessagePage
export type IPayloadPage = relay.IPayloadPage

// Helper types
export type EncryptionScheme = relay.Message.EncryptionScheme

export type PayloadEntryKind = 
  | 'text-utf8'
  | 'stealth-payment'
  | 'image'
  | 'vcard'
  | 'public-profile'
  | 'json'

export interface ParsedMessage {
  sourcePublicKey: Uint8Array
  destinationPublicKey: Uint8Array
  payload: Uint8Array
  payloadDigest: Uint8Array
  timestamp: number
  scheme: EncryptionScheme
}

export interface MessageFilter {
  sourcePublicKey?: Uint8Array
  destinationPublicKey?: Uint8Array
  since?: number
  until?: number
  limit?: number
}
