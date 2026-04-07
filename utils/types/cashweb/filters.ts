/**
 * CashWeb Filters Types
 * 
 * Type wrappers for filters.proto protobuf definitions.
 * These provide convenient TypeScript types for filters operations.
 */

import type { filters } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  filters
}

// Interface types
export type IPriceFilter = filters.IPriceFilter
export type IFilters = filters.IFilters

// Helper types
export interface FilterOptions {
  minAcceptancePrice?: bigint
  minNotificationPrice?: bigint
  isPublic?: boolean
}
