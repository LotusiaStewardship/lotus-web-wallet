/**
 * CashWeb Metadata Types
 * 
 * Type wrappers for keyserver.proto protobuf definitions.
 * These provide convenient TypeScript types for metadata operations.
 */

import type { keyserver } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  keyserver
}

// Interface types
export type IHeader = keyserver.IHeader
export type IEntry = keyserver.IEntry
export type IAddressMetadata = keyserver.IAddressMetadata
export type IPeer = keyserver.IPeer
export type IPeers = keyserver.IPeers

// Helper types
export interface ProfileMetadata {
  name?: string
  avatar?: string
  bio?: string
  pubkey?: string
  peers?: string[]
}

export interface ParsedMetadataEntry {
  kind: string
  value: string
  headers?: Record<string, string>
}
