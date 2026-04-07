/**
 * CashWeb Broadcast Types
 * 
 * Type wrappers for broadcast.proto protobuf definitions.
 * These provide convenient TypeScript types for broadcast operations.
 */

import type { broadcast } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  broadcast
}

// Interface types
export type IForumPost = broadcast.IForumPost
export type IBroadcastEntry = broadcast.IBroadcastEntry
export type IBroadcastMessage = broadcast.IBroadcastMessage

// Helper types
export interface ParsedForumPost {
  title?: string
  url?: string
  message?: string
  timestamp: number
  topic?: string
}
