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
import { computed, ref } from 'vue'
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

export const useUIStore = defineStore('ui', () => {
  // === STATE ===
  const sidebar = ref<SidebarState>({
    collapsed: false,
    mobileOpen: false,
  })
  const activeModal = ref<ModalConfig | null>(null)
  const modalStack = ref<ModalConfig[]>([])
  const commandPaletteOpen = ref(false)
  const globalLoading = ref(false)
  const globalLoadingMessage = ref<string | null>(null)
  const toasts = ref<ToastConfig[]>([])
  const theme = ref<'light' | 'dark' | 'system'>('system')
  const isMobile = ref(false)
  const notificationCount = ref(0)

  // === GETTERS ===
  /**
   * Check if any modal is open
   */
  const hasActiveModal = computed(() => activeModal.value !== null)

  /**
   * Get current modal name
   */
  const currentModalName = computed(() => activeModal.value?.name || null)

  /**
   * Get current modal data
   */
  const currentModalData = computed(() => activeModal.value?.data || {})

  /**
   * Check if sidebar is visible
   */
  const sidebarVisible = computed(() => {
    if (isMobile.value) {
      return sidebar.value.mobileOpen
    }
    return !sidebar.value.collapsed
  })

  /**
   * Get visible toasts (limited)
   */
  const visibleToasts = computed(() => toasts.value.slice(0, MAX_TOASTS))

  /**
   * Check if has notifications
   */
  const hasNotifications = computed(() => notificationCount.value > 0)

  // === ACTIONS ===
  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize UI store from saved preferences
   */
  function initialize() {
    // Load sidebar state
    const savedSidebar = getItem<{ collapsed?: boolean }>(
      STORAGE_KEYS.SIDEBAR,
      {},
    )
    if (savedSidebar.collapsed !== undefined) {
      sidebar.value.collapsed = savedSidebar.collapsed
    }

    // Load theme preference
    const savedTheme = getRawItem(STORAGE_KEYS.THEME)
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      theme.value = savedTheme as 'light' | 'dark' | 'system'
    }

    // Detect mobile
    _detectMobile()

    // Listen for resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', _detectMobile)
    }
  }

  /**
   * Cleanup listeners
   */
  function cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', _detectMobile)
    }
  }

  // ========================================================================
  // Sidebar
  // ========================================================================

  /**
   * Toggle sidebar collapsed state
   */
  function toggleSidebar() {
    if (isMobile.value) {
      sidebar.value.mobileOpen = !sidebar.value.mobileOpen
    } else {
      sidebar.value.collapsed = !sidebar.value.collapsed
      _saveSidebarState()
    }
  }

  /**
   * Set sidebar collapsed state
   */
  function setSidebarCollapsed(collapsed: boolean) {
    sidebar.value.collapsed = collapsed
    _saveSidebarState()
  }

  /**
   * Open mobile sidebar
   */
  function openMobileSidebar() {
    sidebar.value.mobileOpen = true
  }

  /**
   * Close mobile sidebar
   */
  function closeMobileSidebar() {
    sidebar.value.mobileOpen = false
  }

  // ========================================================================
  // Modals
  // ========================================================================

  /**
   * Open a modal
   */
  function openModal(
    name: string,
    data?: Record<string, unknown>,
    options?: { dismissible?: boolean; onClose?: () => void },
  ) {
    // Push current modal to stack if exists
    if (activeModal.value) {
      modalStack.value.push(activeModal.value)
    }

    activeModal.value = {
      name,
      data,
      dismissible: options?.dismissible ?? true,
      onClose: options?.onClose,
    }

    // Close mobile sidebar when opening modal
    sidebar.value.mobileOpen = false
  }

  /**
   * Close current modal
   */
  function closeModal() {
    if (activeModal.value?.onClose) {
      activeModal.value.onClose()
    }

    // Pop from stack if available
    if (modalStack.value.length > 0) {
      activeModal.value = modalStack.value.pop() || null
    } else {
      activeModal.value = null
    }
  }

  /**
   * Close all modals
   */
  function closeAllModals() {
    while (activeModal.value) {
      closeModal()
    }
    modalStack.value = []
  }

  /**
   * Check if a specific modal is open
   */
  function isModalOpen(name: string): boolean {
    return activeModal.value?.name === name
  }

  // ========================================================================
  // Command Palette
  // ========================================================================

  /**
   * Open command palette
   */
  function openCommandPalette() {
    commandPaletteOpen.value = true
  }

  /**
   * Close command palette
   */
  function closeCommandPalette() {
    commandPaletteOpen.value = false
  }

  /**
   * Toggle command palette
   */
  function toggleCommandPalette() {
    commandPaletteOpen.value = !commandPaletteOpen.value
  }

  // ========================================================================
  // Global Loading
  // ========================================================================

  /**
   * Set global loading state
   */
  function setGlobalLoading(loading: boolean, message?: string) {
    globalLoading.value = loading
    globalLoadingMessage.value = message || null
  }

  /**
   * Start global loading
   */
  function startLoading(message?: string) {
    setGlobalLoading(true, message)
  }

  /**
   * Stop global loading
   */
  function stopLoading() {
    setGlobalLoading(false)
  }

  // ========================================================================
  // Toasts
  // ========================================================================

  /**
   * Add a toast notification
   */
  function addToast(config: Omit<ToastConfig, 'id' | 'timestamp'>) {
    const toast: ToastConfig = {
      ...config,
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      duration: config.duration ?? DEFAULT_TOAST_DURATION,
    }

    toasts.value.push(toast)

    // Auto-remove after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(toast.id)
      }, toast.duration)
    }

    // Limit total toasts
    while (toasts.value.length > MAX_TOASTS * 2) {
      toasts.value.shift()
    }
  }

  /**
   * Remove a toast by ID
   */
  function removeToast(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  /**
   * Clear all toasts
   */
  function clearToasts() {
    toasts.value = []
  }

  // ========================================================================
  // Theme
  // ========================================================================

  /**
   * Set theme preference
   */
  function setTheme(newTheme: 'light' | 'dark' | 'system') {
    theme.value = newTheme
    setRawItem(STORAGE_KEYS.THEME, newTheme)
  }

  // ========================================================================
  // Notifications
  // ========================================================================

  /**
   * Set notification count
   */
  function setNotificationCount(count: number) {
    notificationCount.value = Math.max(0, count)
  }

  /**
   * Increment notification count
   */
  function incrementNotifications(amount: number = 1) {
    notificationCount.value += amount
  }

  /**
   * Clear notifications
   */
  function clearNotifications() {
    notificationCount.value = 0
  }

  // ========================================================================
  // Internal Methods
  // ========================================================================

  /**
   * Detect if in mobile view
   */
  function _detectMobile() {
    if (typeof window !== 'undefined') {
      isMobile.value = window.innerWidth < 768
      // Auto-close mobile sidebar on desktop
      if (!isMobile.value) {
        sidebar.value.mobileOpen = false
      }
    }
  }

  /**
   * Save sidebar state to localStorage
   */
  function _saveSidebarState() {
    setItem(STORAGE_KEYS.SIDEBAR, {
      collapsed: sidebar.value.collapsed,
    })
  }

  // === RETURN ===
  return {
    // State
    sidebar,
    activeModal,
    modalStack,
    commandPaletteOpen,
    globalLoading,
    globalLoadingMessage,
    toasts,
    theme,
    isMobile,
    notificationCount,
    // Getters
    hasActiveModal,
    currentModalName,
    currentModalData,
    sidebarVisible,
    visibleToasts,
    hasNotifications,
    // Actions
    initialize,
    cleanup,
    toggleSidebar,
    setSidebarCollapsed,
    openMobileSidebar,
    closeMobileSidebar,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    setGlobalLoading,
    startLoading,
    stopLoading,
    addToast,
    removeToast,
    clearToasts,
    setTheme,
    setNotificationCount,
    incrementNotifications,
    clearNotifications,
  }
})
