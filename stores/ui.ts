/**
 * UI Store
 *
 * Manages global UI state across the application.
 *
 * Responsibilities:
 * - Modal state
 * - Sidebar state
 * - Global loading states
 * - Command palette state
 * - Theme preferences
 */
import { defineStore } from 'pinia'
import {
  getItem,
  setItem,
  getRawItem,
  setRawItem,
  STORAGE_KEYS,
} from '~/utils/storage'

// ============================================================================
// Types
// ============================================================================

/**
 * Modal configuration
 */
export interface ModalConfig {
  /** Modal name/identifier */
  name: string
  /** Modal data/props */
  data?: Record<string, unknown>
  /** Whether modal can be closed by clicking outside */
  dismissible?: boolean
  /** Callback when modal closes */
  onClose?: () => void
}

/**
 * Toast notification configuration
 */
export interface ToastConfig {
  /** Toast ID */
  id: string
  /** Toast title */
  title: string
  /** Toast description */
  description?: string
  /** Toast color */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
  /** Toast icon */
  icon?: string
  /** Duration in ms (0 for persistent) */
  duration?: number
  /** Timestamp */
  timestamp: number
}

/**
 * Sidebar state
 */
export interface SidebarState {
  /** Whether sidebar is collapsed (desktop) */
  collapsed: boolean
  /** Whether mobile sidebar is open */
  mobileOpen: boolean
}

/**
 * UI store state
 */
export interface UIState {
  /** Sidebar state */
  sidebar: SidebarState
  /** Currently active modal */
  activeModal: ModalConfig | null
  /** Modal stack for nested modals */
  modalStack: ModalConfig[]
  /** Command palette open state */
  commandPaletteOpen: boolean
  /** Global loading state */
  globalLoading: boolean
  /** Global loading message */
  globalLoadingMessage: string | null
  /** Active toasts */
  toasts: ToastConfig[]
  /** Theme preference */
  theme: 'light' | 'dark' | 'system'
  /** Whether in mobile view */
  isMobile: boolean
  /** Notification count (unread) */
  notificationCount: number
}

// ============================================================================
// Constants
// ============================================================================

const MAX_TOASTS = 5
const DEFAULT_TOAST_DURATION = 5000

// ============================================================================
// Store Definition
// ============================================================================

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    sidebar: {
      collapsed: false,
      mobileOpen: false,
    },
    activeModal: null,
    modalStack: [],
    commandPaletteOpen: false,
    globalLoading: false,
    globalLoadingMessage: null,
    toasts: [],
    theme: 'system',
    isMobile: false,
    notificationCount: 0,
  }),

  getters: {
    /**
     * Check if any modal is open
     */
    hasActiveModal(): boolean {
      return this.activeModal !== null
    },

    /**
     * Get current modal name
     */
    currentModalName(): string | null {
      return this.activeModal?.name || null
    },

    /**
     * Get current modal data
     */
    currentModalData(): Record<string, unknown> {
      return this.activeModal?.data || {}
    },

    /**
     * Check if sidebar is visible
     */
    sidebarVisible(): boolean {
      if (this.isMobile) {
        return this.sidebar.mobileOpen
      }
      return !this.sidebar.collapsed
    },

    /**
     * Get visible toasts (limited)
     */
    visibleToasts(): ToastConfig[] {
      return this.toasts.slice(0, MAX_TOASTS)
    },

    /**
     * Check if has notifications
     */
    hasNotifications(): boolean {
      return this.notificationCount > 0
    },
  },

  actions: {
    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize UI store from saved preferences
     */
    initialize() {
      // Load sidebar state
      const savedSidebar = getItem<{ collapsed?: boolean }>(
        STORAGE_KEYS.SIDEBAR,
        {},
      )
      if (savedSidebar.collapsed !== undefined) {
        this.sidebar.collapsed = savedSidebar.collapsed
      }

      // Load theme preference
      const savedTheme = getRawItem(STORAGE_KEYS.THEME)
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        this.theme = savedTheme as 'light' | 'dark' | 'system'
      }

      // Detect mobile
      this._detectMobile()

      // Listen for resize
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this._detectMobile.bind(this))
      }
    },

    /**
     * Cleanup listeners
     */
    cleanup() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this._detectMobile.bind(this))
      }
    },

    // ========================================================================
    // Sidebar
    // ========================================================================

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
      if (this.isMobile) {
        this.sidebar.mobileOpen = !this.sidebar.mobileOpen
      } else {
        this.sidebar.collapsed = !this.sidebar.collapsed
        this._saveSidebarState()
      }
    },

    /**
     * Set sidebar collapsed state
     */
    setSidebarCollapsed(collapsed: boolean) {
      this.sidebar.collapsed = collapsed
      this._saveSidebarState()
    },

    /**
     * Open mobile sidebar
     */
    openMobileSidebar() {
      this.sidebar.mobileOpen = true
    },

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
      this.sidebar.mobileOpen = false
    },

    // ========================================================================
    // Modals
    // ========================================================================

    /**
     * Open a modal
     */
    openModal(
      name: string,
      data?: Record<string, unknown>,
      options?: { dismissible?: boolean; onClose?: () => void },
    ) {
      // Push current modal to stack if exists
      if (this.activeModal) {
        this.modalStack.push(this.activeModal)
      }

      this.activeModal = {
        name,
        data,
        dismissible: options?.dismissible ?? true,
        onClose: options?.onClose,
      }

      // Close mobile sidebar when opening modal
      this.sidebar.mobileOpen = false
    },

    /**
     * Close current modal
     */
    closeModal() {
      if (this.activeModal?.onClose) {
        this.activeModal.onClose()
      }

      // Pop from stack if available
      if (this.modalStack.length > 0) {
        this.activeModal = this.modalStack.pop() || null
      } else {
        this.activeModal = null
      }
    },

    /**
     * Close all modals
     */
    closeAllModals() {
      while (this.activeModal) {
        this.closeModal()
      }
      this.modalStack = []
    },

    /**
     * Check if a specific modal is open
     */
    isModalOpen(name: string): boolean {
      return this.activeModal?.name === name
    },

    // ========================================================================
    // Command Palette
    // ========================================================================

    /**
     * Open command palette
     */
    openCommandPalette() {
      this.commandPaletteOpen = true
    },

    /**
     * Close command palette
     */
    closeCommandPalette() {
      this.commandPaletteOpen = false
    },

    /**
     * Toggle command palette
     */
    toggleCommandPalette() {
      this.commandPaletteOpen = !this.commandPaletteOpen
    },

    // ========================================================================
    // Global Loading
    // ========================================================================

    /**
     * Set global loading state
     */
    setGlobalLoading(loading: boolean, message?: string) {
      this.globalLoading = loading
      this.globalLoadingMessage = message || null
    },

    /**
     * Start global loading
     */
    startLoading(message?: string) {
      this.setGlobalLoading(true, message)
    },

    /**
     * Stop global loading
     */
    stopLoading() {
      this.setGlobalLoading(false)
    },

    // ========================================================================
    // Toasts
    // ========================================================================

    /**
     * Add a toast notification
     */
    addToast(config: Omit<ToastConfig, 'id' | 'timestamp'>) {
      const toast: ToastConfig = {
        ...config,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        duration: config.duration ?? DEFAULT_TOAST_DURATION,
      }

      this.toasts.push(toast)

      // Auto-remove after duration
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          this.removeToast(toast.id)
        }, toast.duration)
      }

      // Limit total toasts
      while (this.toasts.length > MAX_TOASTS * 2) {
        this.toasts.shift()
      }
    },

    /**
     * Remove a toast by ID
     */
    removeToast(id: string) {
      const index = this.toasts.findIndex(t => t.id === id)
      if (index !== -1) {
        this.toasts.splice(index, 1)
      }
    },

    /**
     * Clear all toasts
     */
    clearToasts() {
      this.toasts = []
    },

    // ========================================================================
    // Theme
    // ========================================================================

    /**
     * Set theme preference
     */
    setTheme(theme: 'light' | 'dark' | 'system') {
      this.theme = theme
      setRawItem(STORAGE_KEYS.THEME, theme)
    },

    // ========================================================================
    // Notifications
    // ========================================================================

    /**
     * Set notification count
     */
    setNotificationCount(count: number) {
      this.notificationCount = Math.max(0, count)
    },

    /**
     * Increment notification count
     */
    incrementNotifications(amount: number = 1) {
      this.notificationCount += amount
    },

    /**
     * Clear notifications
     */
    clearNotifications() {
      this.notificationCount = 0
    },

    // ========================================================================
    // Internal Methods
    // ========================================================================

    /**
     * Detect if in mobile view
     */
    _detectMobile() {
      if (typeof window !== 'undefined') {
        this.isMobile = window.innerWidth < 768
        // Auto-close mobile sidebar on desktop
        if (!this.isMobile) {
          this.sidebar.mobileOpen = false
        }
      }
    },

    /**
     * Save sidebar state to localStorage
     */
    _saveSidebarState() {
      setItem(STORAGE_KEYS.SIDEBAR, {
        collapsed: this.sidebar.collapsed,
      })
    },
  },
})
