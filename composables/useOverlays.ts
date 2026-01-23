/**
 * Overlay Management Composable
 *
 * Programmatic modal system with browser back button support and modal chaining.
 *
 * ## Architecture
 * - **Lazy Loading**: Modal components are dynamically imported on first access
 * - **Prewarming**: Critical modals are preloaded during app idle time to eliminate first-click delay
 * - **Instance Caching**: Each modal is created once and reused for optimal performance
 * - **History Management**: Browser back button support via `pushState()` integration
 *
 * ## Performance Strategy
 * ```typescript
 * // Prewarming loads components into memory:
 * await import('~/components/actions/SendModal.vue')  // Downloads and parses component
 * getModal('sendModal', LazyActionsSendModal)        // Creates overlay wrapper
 *
 * // User interaction opens instantly:
 * await openSendModal()  // No network request, immediate display
 * ```
 *
 * ## Usage
 * ```typescript
 * const { openSendModal } = useOverlays()
 * await openSendModal({ initialRecipient: 'lotus_123' })
 * ```
 *
 * ## Modal Chaining
 * ```typescript
 * const result = await openScanModal()
 * if (result?.type === 'address') {
 *   resetForChaining()
 *   await openSendModal({ initialRecipient: result.address })
 * }
 * ```
 *
 * ## Multi-Stage Navigation
 * ```typescript
 * onMounted(() => {
 *   registerBackHandler(() => {
 *     if (step.value === 'confirm') {
 *       step.value = 'details'
 *       return false // Handled internally
 *     }
 *     return true // Close modal
 *   })
 * })
 * ```
 */
import {
  LazyActionsSendModal,
  LazyActionsReceiveModal,
  LazyActionsScanModal,
  LazyNavigationActionSheet,
  LazyPeopleAddContactModal,
  LazyPeopleShareContactModal,
  LazyPeopleShareMyContactModal,
  LazySettingsBackupModal,
  LazySettingsRestoreWalletModal,
  LazySettingsViewPhraseModal,
  LazyUiKeyboardShortcutsModal,
  LazyWalletsCreateWalletModal,
  LazyWalletsSpendModal,
} from '#components'

// ============================================================================
// Type Definitions
// ============================================================================

export interface SendModalProps {
  initialRecipient?: Person | string
  initialAmount?: number
}

export interface SendModalResult {
  success: boolean
  txid?: string
  error?: string
}

export interface ScanModalResult {
  type: 'address' | 'payment' | 'contact'
  address?: string
  amount?: number
  contact?: {
    address: string
    name?: string
    publicKeyHex?: string
  }
}

export interface AddContactModalProps {
  initialAddress?: string
  initialName?: string
  initialPublicKey?: string
  editPerson?: Person
}

export interface ShareContactModalProps {
  person: Person | null
}

export interface CreateWalletModalProps {
  preselectedContact?: string
}

export interface SpendModalProps {
  wallet: SharedWallet
  participants: Array<{
    id: string
    name: string
    isOnline: boolean
    isMe: boolean
  }>
}

export type ActionSheetAction = 'send' | 'receive' | 'scan' | 'wallet'

// ============================================================================
// Composable
// ============================================================================

const MODAL_STATE_KEY = '__overlay_open__'

// Type for back handler callback - returns true if modal should close, false if it handled navigation internally
type BackHandler = () => boolean

// Module-level state for back button handling
// These must be module-level because useState can't store functions
let activeBackHandlerRef: BackHandler | null = null
let activeCloseHandlerRef: (() => void) | null = null
let popstateListenerAdded = false
let isChaining = false // Flag to track when we're opening a follow-up modal

// --------------------------------------------------------------------------
// Per-Modal Lazy Loading Cache
// Each modal instance is created only when first opened
// --------------------------------------------------------------------------

// Cached overlay composable (initialized once)
let overlayComposable: ReturnType<typeof useOverlay> | null = null

type OverlayInstance = ReturnType<ReturnType<typeof useOverlay>['create']>

function getOverlay(): ReturnType<typeof useOverlay> {
  if (!overlayComposable) {
    overlayComposable = useOverlay()
  }
  return overlayComposable
}

// --------------------------------------------------------------------------
// Exported standalone functions (for performance - no need to call useOverlays())
// --------------------------------------------------------------------------

/**
 * Register a back handler for multi-stage modals.
 * The handler should return true if the modal should close,
 * or false if it handled navigation internally.
 *
 * This is exported separately for performance - modals can import
 * this directly without calling useOverlays().
 */
export function registerBackHandler(handler: BackHandler) {
  activeBackHandlerRef = handler
}

/**
 * Reset overlay state for modal chaining.
 * Call this before opening a follow-up modal to properly
 * transfer the history entry to the new modal.
 */
export function resetForChaining() {
  const { activeOverlayName, activeOverlayId } = useOverlayState()
  activeOverlayName.value = null
  activeOverlayId.value = null
  activeCloseHandlerRef = null
  activeBackHandlerRef = null
  // Keep historyStatePushed true so next modal reuses the history entry
}

// Module-level popstate handler - must be defined here so it's the same function reference
function handlePopstateGlobal(_event: PopStateEvent) {
  // Access shared state via useState (works because useState is shared)
  const historyStatePushed = useState<boolean>(
    'overlay-history-pushed',
    () => false,
  )
  const activeOverlayName = useState<string | null>(
    'overlay-active-name',
    () => null,
  )
  const activeOverlayId = useState<symbol | null>(
    'overlay-active-id',
    () => null,
  )

  if (historyStatePushed.value && activeOverlayName.value) {
    // For multi-stage modals with a registered back handler, call it
    if (activeBackHandlerRef) {
      const shouldClose = activeBackHandlerRef()
      if (shouldClose) {
        // Modal wants to close - use the registered close handler
        if (activeCloseHandlerRef) {
          activeCloseHandlerRef()
        }
        // Clear state
        historyStatePushed.value = false
        activeOverlayName.value = null
        activeOverlayId.value = null
        activeBackHandlerRef = null
        activeCloseHandlerRef = null
      } else {
        // Modal handled navigation internally - re-push history state
        window.history.pushState({ [MODAL_STATE_KEY]: true }, '')
      }
      return
    }

    // For single-stage modals (no back handler), close immediately
    if (activeCloseHandlerRef) {
      activeCloseHandlerRef()
    }
    historyStatePushed.value = false
    activeOverlayName.value = null
    activeOverlayId.value = null
    activeCloseHandlerRef = null
  }
}

const useOverlayState = () => {
  const activeOverlayName = useState<string | null>(
    'overlay-active-name',
    () => null,
  )
  const activeOverlayId = useState<symbol | null>(
    'overlay-active-id',
    () => null,
  )
  const historyStatePushed = useState<boolean>(
    'overlay-history-pushed',
    () => false,
  )
  return {
    activeOverlayName,
    activeOverlayId,
    historyStatePushed,
  }
}

// --------------------------------------------------------------------------
// Generic Modal Registry
// Each modal is created only when first accessed
// --------------------------------------------------------------------------

type ModalMap = {
  sendModal: typeof LazyActionsSendModal
  receiveModal: typeof LazyActionsReceiveModal
  scanModal: typeof LazyActionsScanModal
  actionSheet: typeof LazyNavigationActionSheet
  addContactModal: typeof LazyPeopleAddContactModal
  shareContactModal: typeof LazyPeopleShareContactModal
  shareMyContactModal: typeof LazyPeopleShareMyContactModal
  backupModal: typeof LazySettingsBackupModal
  restoreWalletModal: typeof LazySettingsRestoreWalletModal
  viewPhraseModal: typeof LazySettingsViewPhraseModal
  keyboardShortcutsModal: typeof LazyUiKeyboardShortcutsModal
  createWalletModal: typeof LazyWalletsCreateWalletModal
  spendModal: typeof LazyWalletsSpendModal
}

type ModalKey = keyof ModalMap

// Generic modal registry
const modalRegistry = new Map<ModalKey, OverlayInstance>()

/**
 * Generic modal registry with lazy loading and caching.
 *
 * Each modal is created only when first accessed, then cached for reuse.
 * This provides optimal performance by avoiding repeated component instantiation.
 *
 * @template K - Modal key type from ModalMap
 * @param key - Unique identifier for the modal
 * @param component - Lazy-loaded Vue component
 * @returns Cached overlay instance ready for use
 */
function getModal<K extends ModalKey>(
  key: K,
  component: ModalMap[K],
): OverlayInstance {
  let instance = modalRegistry.get(key)
  if (!instance) {
    instance = getOverlay().create(component, {
      destroyOnClose: false,
    })
    modalRegistry.set(key, instance)
  }
  return instance
}

// --------------------------------------------------------------------------
// Pre-warming: Dynamic component preloading for instant modal opening
// --------------------------------------------------------------------------

let prewarmed = false

/**
 * Pre-warm modal components by dynamically importing them and creating overlay instances.
 *
 * This eliminates the first-click delay by:
 * 1. Using dynamic `import()` to download and parse component chunks
 * 2. Creating overlay instances so they're ready to open immediately
 * 3. Preloading all modal dependencies (stores, utils, composables)
 *
 * **Performance Impact**: Adds 200-400ms to app initialization but eliminates
 * 200-500ms delay on first modal interaction. Net positive for user experience.
 *
 * **Bundle Strategy**: Maintains code splitting while preloading critical paths.
 * Main bundle stays small, but modal chunks are loaded during idle time.
 *
 * Should be called once after app initialization, typically via
 * `requestIdleCallback` or `setTimeout` in `app.vue`.
 *
 * @returns Promise that resolves when all modals are preloaded
 */
export async function prewarmOverlays(): Promise<void> {
  if (prewarmed) return

  console.log('[Overlays] Starting prewarming...')
  const startTime = performance.now()

  // Step 1: Dynamically import all modal components
  // This downloads the JavaScript chunks and executes the component code
  // Components are now available in the module registry for instant access
  console.log('[Overlays] Preloading modal components...')
  try {
    await Promise.all([
      import('~/components/actions/SendModal.vue'),
      import('~/components/actions/ReceiveModal.vue'),
      import('~/components/actions/ScanModal.vue'),
      import('~/components/navigation/ActionSheet.vue'),
      import('~/components/people/AddContactModal.vue'),
      import('~/components/people/ShareContactModal.vue'),
      import('~/components/people/ShareMyContactModal.vue'),
      import('~/components/settings/BackupModal.vue'),
      import('~/components/settings/RestoreWalletModal.vue'),
      import('~/components/settings/ViewPhraseModal.vue'),
      import('~/components/ui/KeyboardShortcutsModal.vue'),
      import('~/components/wallets/CreateWalletModal.vue'),
      import('~/components/wallets/SpendModal.vue'),
    ])
    console.log('[Overlays] Modal components preloaded')
  } catch (error) {
    console.warn('[Overlays] Component preloading failed:', error)
    // Continue without prewarming - modals will load on demand
  }

  // Step 2: Create overlay instances for all modals
  // This ensures the overlay wrapper is ready to open immediately
  // Components are already loaded, so this is just wrapper creation
  console.log('[Overlays] Creating overlay instances...')
  getModal('sendModal', LazyActionsSendModal)
  getModal('receiveModal', LazyActionsReceiveModal)
  getModal('scanModal', LazyActionsScanModal)
  getModal('actionSheet', LazyNavigationActionSheet)
  getModal('addContactModal', LazyPeopleAddContactModal)
  getModal('shareContactModal', LazyPeopleShareContactModal)
  getModal('shareMyContactModal', LazyPeopleShareMyContactModal)
  getModal('backupModal', LazySettingsBackupModal)
  getModal('restoreWalletModal', LazySettingsRestoreWalletModal)
  getModal('viewPhraseModal', LazySettingsViewPhraseModal)
  getModal('keyboardShortcutsModal', LazyUiKeyboardShortcutsModal)
  getModal('createWalletModal', LazyWalletsCreateWalletModal)
  getModal('spendModal', LazyWalletsSpendModal)
  console.log('[Overlays] Overlay instances created')

  // Set to prewarmed after component preloading and instance creation
  prewarmed = true
  const endTime = performance.now()
  console.log(
    `[Overlays] Prewarming completed in ${(endTime - startTime).toFixed(2)}ms`,
  )
}

export function useOverlays() {
  // Shared state across all useOverlays() calls
  const { activeOverlayName, activeOverlayId, historyStatePushed } =
    useOverlayState()

  // --------------------------------------------------------------------------
  // History State Management (for back button support)
  // --------------------------------------------------------------------------

  function pushHistoryState(
    overlayName: string,
    overlayId: symbol,
    closeHandler: () => void,
  ) {
    if (!historyStatePushed.value) {
      // First modal - push new history state
      window.history.pushState({ [MODAL_STATE_KEY]: true }, '')
      historyStatePushed.value = true
    }
    // Always update the active overlay info (allows chaining modals)
    activeOverlayName.value = overlayName
    activeOverlayId.value = overlayId
    // Store the close handler so the module-level popstate handler can use it
    activeCloseHandlerRef = closeHandler
    // Clear any previous back handler
    activeBackHandlerRef = null
  }

  function clearHistoryState() {
    historyStatePushed.value = false
    activeOverlayName.value = null
    activeOverlayId.value = null
    activeCloseHandlerRef = null
    activeBackHandlerRef = null
  }

  function clearBackHandler() {
    activeBackHandlerRef = null
  }

  // Only add the popstate listener once (singleton pattern)
  // This prevents multiple listeners from different useOverlays() calls
  if (import.meta.client && !popstateListenerAdded) {
    popstateListenerAdded = true
    window.addEventListener('popstate', handlePopstateGlobal)
  }

  // --------------------------------------------------------------------------
  // Helper to handle history cleanup after overlay closes
  // --------------------------------------------------------------------------

  async function cleanupHistoryAfterClose(overlayName: string) {
    // Skip cleanup if we're chaining to another modal
    if (isChaining) {
      isChaining = false
      return
    }
    // Only clean up if this overlay is still the active one
    // If another overlay has already taken over, don't touch history
    if (historyStatePushed.value && activeOverlayName.value === overlayName) {
      window.history.back()
      clearHistoryState()
    }
  }

  // --------------------------------------------------------------------------
  // Action Modals - Core user interactions
  // --------------------------------------------------------------------------

  /**
   * Open the Send modal for sending XPI to recipients.
   *
   * Supports multi-stage navigation: recipient → amount → confirmation → result.
   * Handles both person contacts and raw addresses.
   *
   * @param props - Optional initial state for the modal
   * @returns Promise resolving to send result or undefined if cancelled
   */
  async function openSendModal(
    props?: SendModalProps,
  ): Promise<SendModalResult | undefined> {
    const modal = getModal('sendModal', LazyActionsSendModal)
    pushHistoryState('sendModal', modal.id, () => modal.close())
    const result = await modal.open(props)
    clearBackHandler()
    await cleanupHistoryAfterClose('sendModal')

    return result as SendModalResult | undefined
  }

  /**
   * Open the Receive modal for displaying QR code and address.
   *
   * Shows wallet address as QR code with optional amount request.
   * Provides copy and share functionality.
   */
  async function openReceiveModal(): Promise<void> {
    const modal = getModal('receiveModal', LazyActionsReceiveModal)
    pushHistoryState('receiveModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('receiveModal')
  }

  /**
   * Open the Scan modal for QR code scanning.
   *
   * Supports scanning:
   * - Payment URIs (lotus:xpi...?amount=0.1)
   * - Contact URIs (lotus:contact?pubkey=...)
   * - Raw addresses (lotus_...)
   *
   * Returns structured scan result for downstream processing.
   */
  async function openScanModal(): Promise<
    ScanModalResult | { manualEntry: true } | undefined
  > {
    const modal = getModal('scanModal', LazyActionsScanModal)
    pushHistoryState('scanModal', modal.id, () => modal.close())
    const result = await modal.open()
    // Don't cleanup here - let the caller decide (they may chain to another modal)
    // If no result, cleanup now
    if (!result) {
      await cleanupHistoryAfterClose('scanModal')
    }
    return result as ScanModalResult | { manualEntry: true } | undefined
  }

  // --------------------------------------------------------------------------
  // Action Sheet
  // --------------------------------------------------------------------------

  async function openActionSheet(): Promise<ActionSheetAction | undefined> {
    const modal = getModal('actionSheet', LazyNavigationActionSheet)
    pushHistoryState('actionSheet', modal.id, () => modal.close())
    const result = await modal.open()
    // Don't cleanup here - let the caller decide (they may chain to another modal)
    // If no action selected, cleanup now
    if (!result) {
      await cleanupHistoryAfterClose('actionSheet')
    }
    return result as ActionSheetAction | undefined
  }

  // --------------------------------------------------------------------------
  // People Modals
  // --------------------------------------------------------------------------

  async function openAddContactModal(
    props?: AddContactModalProps,
  ): Promise<void> {
    const modal = getModal('addContactModal', LazyPeopleAddContactModal)
    pushHistoryState('addContactModal', modal.id, () => modal.close())
    await modal.open(props)
    await cleanupHistoryAfterClose('addContactModal')
  }

  async function openShareContactModal(
    props: ShareContactModalProps,
  ): Promise<void> {
    const modal = getModal('shareContactModal', LazyPeopleShareContactModal)
    pushHistoryState('shareContactModal', modal.id, () => modal.close())
    await modal.open(props)
    await cleanupHistoryAfterClose('shareContactModal')
  }

  async function openShareMyContactModal(): Promise<void> {
    const modal = getModal('shareMyContactModal', LazyPeopleShareMyContactModal)
    pushHistoryState('shareMyContactModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('shareMyContactModal')
  }

  // --------------------------------------------------------------------------
  // Settings Modals
  // --------------------------------------------------------------------------

  async function openBackupModal(): Promise<void> {
    const modal = getModal('backupModal', LazySettingsBackupModal)
    pushHistoryState('backupModal', modal.id, () => modal.close())
    await modal.open()
    clearBackHandler()
    await cleanupHistoryAfterClose('backupModal')
  }

  async function openRestoreWalletModal(): Promise<void> {
    const modal = getModal('restoreWalletModal', LazySettingsRestoreWalletModal)
    pushHistoryState('restoreWalletModal', modal.id, () => modal.close())
    await modal.open()
    clearBackHandler()
    await cleanupHistoryAfterClose('restoreWalletModal')
  }

  async function openViewPhraseModal(): Promise<void> {
    const modal = getModal('viewPhraseModal', LazySettingsViewPhraseModal)
    pushHistoryState('viewPhraseModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('viewPhraseModal')
  }

  // --------------------------------------------------------------------------
  // UI Modals
  // --------------------------------------------------------------------------

  async function openKeyboardShortcutsModal(): Promise<void> {
    const modal = getModal(
      'keyboardShortcutsModal',
      LazyUiKeyboardShortcutsModal,
    )
    pushHistoryState('keyboardShortcutsModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('keyboardShortcutsModal')
  }

  // --------------------------------------------------------------------------
  // Wallet Modals
  // --------------------------------------------------------------------------

  async function openCreateWalletModal(
    props?: CreateWalletModalProps,
  ): Promise<void> {
    const modal = getModal('createWalletModal', LazyWalletsCreateWalletModal)
    pushHistoryState('createWalletModal', modal.id, () => modal.close())
    await modal.open(props)
    clearBackHandler()
    await cleanupHistoryAfterClose('createWalletModal')
  }

  async function openSpendModal(props: SpendModalProps): Promise<void> {
    const modal = getModal('spendModal', LazyWalletsSpendModal)
    pushHistoryState('spendModal', modal.id, () => modal.close())
    await modal.open(props)
    clearBackHandler()
    await cleanupHistoryAfterClose('spendModal')
  }

  // --------------------------------------------------------------------------
  // Return API
  // --------------------------------------------------------------------------

  return {
    // Action modals
    openSendModal,
    openReceiveModal,
    openScanModal,

    // Action sheet
    openActionSheet,

    // People modals
    openAddContactModal,
    openShareContactModal,
    openShareMyContactModal,

    // Settings modals
    openBackupModal,
    openRestoreWalletModal,
    openViewPhraseModal,

    // UI modals
    openKeyboardShortcutsModal,

    // Wallet modals
    openCreateWalletModal,
    openSpendModal,
  }
}
