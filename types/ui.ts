/**
 * UI Types
 *
 * Type definitions for UI state management.
 */

// ============================================================================
// Modal Types
// ============================================================================

/**
 * Modal configuration
 */
export interface ModalConfig {
  /** Unique modal ID */
  id: string
  /** Modal component name */
  component: string
  /** Modal props */
  props?: Record<string, unknown>
  /** Whether modal can be closed by clicking outside */
  closeable?: boolean
  /** Callback when modal is closed */
  onClose?: () => void
}

// ============================================================================
// Toast Types
// ============================================================================

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Toast notification configuration
 */
export interface ToastConfig {
  /** Unique toast ID */
  id: string
  /** Toast type */
  type: ToastType
  /** Toast title */
  title: string
  /** Optional description */
  description?: string
  /** Optional icon */
  icon?: string
  /** Duration in milliseconds (0 = persistent) */
  duration?: number
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
  }
}

// ============================================================================
// Loading State Types
// ============================================================================

/**
 * Loading state configuration
 */
export interface LoadingState {
  /** Whether loading */
  isLoading: boolean
  /** Loading message */
  message?: string
  /** Progress percentage (0-100) */
  progress?: number
}

// ============================================================================
// Sidebar Types
// ============================================================================

/**
 * Sidebar state
 */
export interface SidebarState {
  /** Whether sidebar is open (mobile) */
  isOpen: boolean
  /** Whether sidebar is collapsed (desktop) */
  isCollapsed: boolean
}

// ============================================================================
// Theme Types
// ============================================================================

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system'

// ============================================================================
// UI State Types
// ============================================================================

/**
 * UI store state
 */
export interface UIState {
  /** Active modals stack */
  modals: ModalConfig[]
  /** Toast notifications queue */
  toasts: ToastConfig[]
  /** Global loading states by key */
  loadingStates: Record<string, LoadingState>
  /** Sidebar state */
  sidebar: SidebarState
  /** Current theme mode */
  themeMode: ThemeMode
  /** Whether app is in mobile view */
  isMobile: boolean
  /** Whether app is offline */
  isOffline: boolean
}

// ============================================================================
// Confirmation Dialog Types
// ============================================================================

/**
 * Confirmation dialog configuration
 */
export interface ConfirmDialogConfig {
  /** Dialog title */
  title: string
  /** Dialog message */
  message: string
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Confirm button color */
  confirmColor?: 'primary' | 'error' | 'warning'
  /** Whether action is destructive */
  destructive?: boolean
}

/**
 * Confirmation dialog result
 */
export interface ConfirmDialogResult {
  /** Whether user confirmed */
  confirmed: boolean
}

// ============================================================================
// Empty State Types
// ============================================================================

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  /** Icon name */
  icon: string
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Action button */
  action?: {
    label: string
    onClick: () => void
  }
}

// ============================================================================
// Error State Types
// ============================================================================

/**
 * Error state configuration
 */
export interface ErrorStateConfig {
  /** Error title */
  title: string
  /** Error message */
  message: string
  /** Whether retry is available */
  canRetry?: boolean
  /** Retry callback */
  onRetry?: () => void
}

// ============================================================================
// Constants
// ============================================================================

/** Default toast duration (5 seconds) */
export const DEFAULT_TOAST_DURATION = 5000

/** Maximum toasts to show at once */
export const MAX_TOASTS = 5

/** Mobile breakpoint in pixels */
export const MOBILE_BREAKPOINT = 768

/** Storage key for theme preference */
export const THEME_STORAGE_KEY = 'lotus-wallet-theme'

/** Storage key for sidebar preference */
export const SIDEBAR_STORAGE_KEY = 'lotus-wallet-sidebar'
