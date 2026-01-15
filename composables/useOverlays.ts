/**
 * Centralized Overlay Management Composable
 *
 * Programmatic modal system built on Nuxt UI 3's useOverlay. All modals are opened
 * via functions (not template components), providing consistent behavior, history
 * management, and modal chaining support.
 *
 * ## Architecture
 *
 * - **Lazy Loading**: Modal components are lazy-imported and code-split by Nuxt
 * - **Instance Caching**: Each modal instance is created once and reused (destroyOnClose: false)
 * - **History Management**: Browser back button support via history.pushState()
 * - **Modal Chaining**: Support for flows like ActionSheet → Send or Scan → AddContact
 * - **Multi-Stage Navigation**: Internal back navigation for wizard-style modals
 *
 * ## How Modals Work
 *
 * 1. **Opening**: Call `openModal()` function (e.g., `openSendModal()`)
 * 2. **Instance Creation**: Modal instance is created via `useOverlay().create()` (lazy, cached)
 * 3. **History State**: `pushHistoryState()` adds browser history entry for back button
 * 4. **Modal Opens**: `modal.open(props)` displays the modal and returns a Promise
 * 5. **User Interaction**: User interacts with modal (X button, ESC, back button, submit)
 * 6. **Modal Closes**: Modal emits 'close' event, Promise resolves with result
 * 7. **Cleanup**: History state is cleaned up, query params removed (if syncToRoute)
 *
 * ## URL Synchronization (syncToRoute)
 *
 * Some modals support `syncToRoute` flag to sync modal state with URL query parameters.
 * This enables:
 * - Deep linking (e.g., `/?send=lotus_123` opens SendModal)
 * - Browser refresh preserves modal state
 * - Shareable URLs with pre-filled modal data
 *
 * ### CRITICAL: Query Param Cleanup Pattern
 *
 * For modals with `syncToRoute = true`, query params MUST be cleaned up BEFORE calling
 * `cleanupHistoryAfterClose()`. This is because:
 *
 * 1. Modal opens with `?param=value` in URL
 * 2. History stack: `[/, /?param=value]` (pushState adds entry)
 * 3. User clicks X button → modal closes
 * 4. If we call `history.back()` first, browser navigates to previous entry
 * 5. Previous entry STILL has `?param=value` in URL
 * 6. Query params reappear after cleanup! ❌
 *
 * **Correct Pattern**:
 * ```typescript
 * if (syncToRoute) {
 *   // 1. Clean query params via router.replace() (changes current URL)
 *   if (route.query.param) {
 *     await router.replace({ query: { ...route.query, param: undefined } })
 *   }
 *   // 2. Clear history state WITHOUT calling history.back()
 *   clearHistoryState()
 * } else {
 *   // For non-syncToRoute modals, use normal cleanup (calls history.back())
 *   await cleanupHistoryAfterClose('modalName')
 * }
 * ```
 *
 * ## Modal Chaining
 *
 * When one modal opens another (e.g., Scan → Send), call `resetForChaining()` between them:
 *
 * ```typescript
 * const result = await openScanModal()
 * if (!result) return
 *
 * resetForChaining() // Transfer history entry to next modal
 * await openSendModal({ initialRecipient: result.address })
 * ```
 *
 * This prevents creating duplicate history entries and ensures back button works correctly.
 *
 * ## Multi-Stage Modals
 *
 * Wizard-style modals with multiple steps use `registerBackHandler()` for internal navigation:
 *
 * ```typescript
 * onMounted(() => {
 *   registerBackHandler(() => {
 *     if (step.value === 'confirm') {
 *       step.value = 'details'
 *       return false // Handled internally, don't close modal
 *     }
 *     return true // Close modal
 *   })
 * })
 * ```
 *
 * The handler returns:
 * - `false`: Back navigation handled internally (go to previous step)
 * - `true`: Close the modal
 *
 * @example
 * // Basic usage
 * const { openSendModal, openReceiveModal } = useOverlays()
 * await openSendModal({ initialRecipient: 'lotus_123' })
 *
 * @example
 * // With URL synchronization
 * await openSendModal({ initialRecipient: 'lotus_123' }, true) // syncToRoute = true
 * // URL becomes: /?send=lotus_123
 *
 * @example
 * // Modal chaining
 * const result = await openScanModal()
 * if (result?.type === 'address') {
 *   resetForChaining()
 *   await openSendModal({ initialRecipient: result.address })
 * }
 *
 * @example
 * // With result handling
 * const result = await openSendModal()
 * if (result?.success) {
 *   console.log('Transaction sent:', result.txid)
 * }
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
  initialRecipient?: string
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

// Multi-stage modals that support internal back navigation
const MULTI_STAGE_MODALS = new Set([
  'sendModal',
  'backupModal',
  'restoreWalletModal',
  'createWalletModal',
  'spendModal',
])

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

type OverlayInstance = ReturnType<ReturnType<typeof useOverlay>['create']>

// Cached overlay composable (initialized once)
let overlayComposable: ReturnType<typeof useOverlay> | null = null

// Individual modal instance caches (each created on-demand)
let sendModalInstance: OverlayInstance | null = null
let receiveModalInstance: OverlayInstance | null = null
let scanModalInstance: OverlayInstance | null = null
let actionSheetInstance: OverlayInstance | null = null
let addContactModalInstance: OverlayInstance | null = null
let shareContactModalInstance: OverlayInstance | null = null
let shareMyContactModalInstance: OverlayInstance | null = null
let backupModalInstance: OverlayInstance | null = null
let restoreWalletModalInstance: OverlayInstance | null = null
let viewPhraseModalInstance: OverlayInstance | null = null
let keyboardShortcutsModalInstance: OverlayInstance | null = null
let createWalletModalInstance: OverlayInstance | null = null
let spendModalInstance: OverlayInstance | null = null

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
// Per-Modal Lazy Getters
// Each modal is created only when first accessed
// --------------------------------------------------------------------------

function getOverlay(): ReturnType<typeof useOverlay> {
  if (!overlayComposable) {
    overlayComposable = useOverlay()
  }
  return overlayComposable
}

function getSendModal(): OverlayInstance {
  if (!sendModalInstance) {
    sendModalInstance = getOverlay().create(LazyActionsSendModal, {
      destroyOnClose: false,
    })
  }
  return sendModalInstance
}

function getReceiveModal(): OverlayInstance {
  if (!receiveModalInstance) {
    receiveModalInstance = getOverlay().create(LazyActionsReceiveModal, {
      destroyOnClose: false,
    })
  }
  return receiveModalInstance
}

function getScanModal(): OverlayInstance {
  if (!scanModalInstance) {
    scanModalInstance = getOverlay().create(LazyActionsScanModal, {
      destroyOnClose: false,
    })
  }
  return scanModalInstance
}

function getActionSheet(): OverlayInstance {
  if (!actionSheetInstance) {
    actionSheetInstance = getOverlay().create(LazyNavigationActionSheet, {
      destroyOnClose: false,
    })
  }
  return actionSheetInstance
}

function getAddContactModal(): OverlayInstance {
  if (!addContactModalInstance) {
    addContactModalInstance = getOverlay().create(LazyPeopleAddContactModal, {
      destroyOnClose: false,
    })
  }
  return addContactModalInstance
}

function getShareContactModal(): OverlayInstance {
  if (!shareContactModalInstance) {
    shareContactModalInstance = getOverlay().create(
      LazyPeopleShareContactModal,
      {
        destroyOnClose: false,
      },
    )
  }
  return shareContactModalInstance
}

function getShareMyContactModal(): OverlayInstance {
  if (!shareMyContactModalInstance) {
    shareMyContactModalInstance = getOverlay().create(
      LazyPeopleShareMyContactModal,
      {
        destroyOnClose: false,
      },
    )
  }
  return shareMyContactModalInstance
}

function getBackupModal(): OverlayInstance {
  if (!backupModalInstance) {
    backupModalInstance = getOverlay().create(LazySettingsBackupModal, {
      destroyOnClose: false,
    })
  }
  return backupModalInstance
}

function getRestoreWalletModal(): OverlayInstance {
  if (!restoreWalletModalInstance) {
    restoreWalletModalInstance = getOverlay().create(
      LazySettingsRestoreWalletModal,
      {
        destroyOnClose: false,
      },
    )
  }
  return restoreWalletModalInstance
}

function getViewPhraseModal(): OverlayInstance {
  if (!viewPhraseModalInstance) {
    viewPhraseModalInstance = getOverlay().create(LazySettingsViewPhraseModal, {
      destroyOnClose: false,
    })
  }
  return viewPhraseModalInstance
}

function getKeyboardShortcutsModal(): OverlayInstance {
  if (!keyboardShortcutsModalInstance) {
    keyboardShortcutsModalInstance = getOverlay().create(
      LazyUiKeyboardShortcutsModal,
      {
        destroyOnClose: false,
      },
    )
  }
  return keyboardShortcutsModalInstance
}

function getCreateWalletModal(): OverlayInstance {
  if (!createWalletModalInstance) {
    createWalletModalInstance = getOverlay().create(
      LazyWalletsCreateWalletModal,
      {
        destroyOnClose: false,
      },
    )
  }
  return createWalletModalInstance
}

function getSpendModal(): OverlayInstance {
  if (!spendModalInstance) {
    spendModalInstance = getOverlay().create(LazyWalletsSpendModal, {
      destroyOnClose: false,
    })
  }
  return spendModalInstance
}

// --------------------------------------------------------------------------
// Pre-warming: Prefetch component chunks and create modal instances
// --------------------------------------------------------------------------

let prewarmed = false

/**
 * Pre-warm modal components by prefetching their chunks and creating instances.
 * This eliminates the first-click delay by:
 * 1. Using Nuxt's prefetchComponents to download component chunks in background
 * 2. Creating overlay instances so they're ready to open immediately
 *
 * Should be called once after app initialization, typically via
 * requestIdleCallback or setTimeout.
 */
export async function prewarmOverlays(): Promise<void> {
  if (prewarmed) return

  // Step 1: Prefetch all modal component chunks using Nuxt's built-in utility
  // This downloads the JavaScript chunks in the background
  // Component names must be Pascal-cased without the "Lazy" prefix
  await prefetchComponents([
    'ActionsSendModal',
    'ActionsReceiveModal',
    'ActionsScanModal',
    'NavigationActionSheet',
    'PeopleAddContactModal',
    'PeopleShareContactModal',
    'PeopleShareMyContactModal',
    'SettingsBackupModal',
    'SettingsRestoreWalletModal',
    'SettingsViewPhraseModal',
    'UiKeyboardShortcutsModal',
    'WalletsCreateWalletModal',
    'WalletsSpendModal',
  ])

  // Step 2: Create overlay instances for commonly used modals
  // This ensures the overlay wrapper is ready to open immediately
  getAddContactModal()
  getActionSheet()
  getSendModal()
  getReceiveModal()
  getScanModal()
  getAddContactModal()

  // Set to prewarmed after prefetching and instance creation
  prewarmed = true
}

export function useOverlays() {
  const route = useRoute()
  const router = useRouter()

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
  // Action Modals
  // --------------------------------------------------------------------------

  async function openSendModal(
    props?: SendModalProps,
    syncToRoute = false,
  ): Promise<SendModalResult | undefined> {
    if (syncToRoute && props?.initialRecipient) {
      const query: Record<string, string> = { send: props.initialRecipient }
      if (props.initialAmount) {
        query.amount = String(props.initialAmount)
      }
      await router.replace({ query: { ...route.query, ...query } })
    }

    const modal = getSendModal()
    pushHistoryState('sendModal', modal.id, () => modal.close())
    const result = await modal.open(props)
    clearBackHandler()

    if (syncToRoute) {
      // Clean query params before history cleanup (see top-level JSDoc for details)
      if (route.query.send) {
        const newQuery = { ...route.query }
        delete newQuery.send
        delete newQuery.amount
        await router.replace({ query: newQuery })
      }
      // Clear history state without calling history.back()
      clearHistoryState()
    } else {
      // For non-syncToRoute modals, use normal cleanup (calls history.back())
      await cleanupHistoryAfterClose('sendModal')
    }

    return result as SendModalResult | undefined
  }

  async function openReceiveModal(): Promise<void> {
    const modal = getReceiveModal()
    pushHistoryState('receiveModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('receiveModal')
  }

  async function openScanModal(): Promise<
    ScanModalResult | { manualEntry: true } | undefined
  > {
    const modal = getScanModal()
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
    const modal = getActionSheet()
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
    syncToRoute = false,
  ): Promise<void> {
    if (syncToRoute) {
      const query: Record<string, string> = { add: 'true' }
      if (props?.initialAddress) query.address = props.initialAddress
      if (props?.initialName) query.name = props.initialName
      if (props?.initialPublicKey) query.pubkey = props.initialPublicKey
      await router.replace({ query: { ...route.query, ...query } })
    }

    const modal = getAddContactModal()
    pushHistoryState('addContactModal', modal.id, () => modal.close())
    await modal.open(props)

    if (syncToRoute) {
      // Clean query params before history cleanup (see top-level JSDoc for details)
      if (route.query.add) {
        const newQuery = { ...route.query }
        delete newQuery.add
        delete newQuery.address
        delete newQuery.name
        delete newQuery.pubkey
        await router.replace({ query: newQuery })
      }
      // Clear history state without calling history.back()
      clearHistoryState()
    } else {
      // For non-syncToRoute modals, use normal cleanup (calls history.back())
      await cleanupHistoryAfterClose('addContactModal')
    }
  }

  async function openShareContactModal(
    props: ShareContactModalProps,
  ): Promise<void> {
    const modal = getShareContactModal()
    pushHistoryState('shareContactModal', modal.id, () => modal.close())
    await modal.open(props)
    await cleanupHistoryAfterClose('shareContactModal')
  }

  async function openShareMyContactModal(): Promise<void> {
    const modal = getShareMyContactModal()
    pushHistoryState('shareMyContactModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('shareMyContactModal')
  }

  // --------------------------------------------------------------------------
  // Settings Modals
  // --------------------------------------------------------------------------

  async function openBackupModal(syncToRoute = false): Promise<void> {
    if (syncToRoute) {
      await router.replace({ query: { ...route.query, backup: 'true' } })
    }

    const modal = getBackupModal()
    pushHistoryState('backupModal', modal.id, () => modal.close())
    await modal.open()
    clearBackHandler()

    if (syncToRoute) {
      // Clean query params before history cleanup (see top-level JSDoc for details)
      if (route.query.backup) {
        const newQuery = { ...route.query }
        delete newQuery.backup
        await router.replace({ query: newQuery })
      }
      // Clear history state without calling history.back()
      clearHistoryState()
    } else {
      // For non-syncToRoute modals, use normal cleanup (calls history.back())
      await cleanupHistoryAfterClose('backupModal')
    }
  }

  async function openRestoreWalletModal(): Promise<void> {
    const modal = getRestoreWalletModal()
    pushHistoryState('restoreWalletModal', modal.id, () => modal.close())
    await modal.open()
    clearBackHandler()
    await cleanupHistoryAfterClose('restoreWalletModal')
  }

  async function openViewPhraseModal(): Promise<void> {
    const modal = getViewPhraseModal()
    pushHistoryState('viewPhraseModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('viewPhraseModal')
  }

  // --------------------------------------------------------------------------
  // UI Modals
  // --------------------------------------------------------------------------

  async function openKeyboardShortcutsModal(): Promise<void> {
    const modal = getKeyboardShortcutsModal()
    pushHistoryState('keyboardShortcutsModal', modal.id, () => modal.close())
    await modal.open()
    await cleanupHistoryAfterClose('keyboardShortcutsModal')
  }

  // --------------------------------------------------------------------------
  // Wallet Modals
  // --------------------------------------------------------------------------

  async function openCreateWalletModal(
    props?: CreateWalletModalProps,
    syncToRoute = false,
  ): Promise<void> {
    if (syncToRoute) {
      const query: Record<string, string> = { create: 'true' }
      if (props?.preselectedContact) query.with = props.preselectedContact
      await router.replace({ query: { ...route.query, ...query } })
    }

    const modal = getCreateWalletModal()
    pushHistoryState('createWalletModal', modal.id, () => modal.close())
    await modal.open(props)
    clearBackHandler()

    if (syncToRoute) {
      // Clean query params before history cleanup (see top-level JSDoc for details)
      if (route.query.create) {
        const newQuery = { ...route.query }
        delete newQuery.create
        delete newQuery.with
        await router.replace({ query: newQuery })
      }
      // Clear history state without calling history.back()
      clearHistoryState()
    } else {
      // For non-syncToRoute modals, use normal cleanup
      await cleanupHistoryAfterClose('createWalletModal')
    }
  }

  async function openSpendModal(props: SpendModalProps): Promise<void> {
    const modal = getSpendModal()
    pushHistoryState('spendModal', modal.id, () => modal.close())
    await modal.open(props)
    clearBackHandler()
    await cleanupHistoryAfterClose('spendModal')
  }

  // --------------------------------------------------------------------------
  // State Checks
  // --------------------------------------------------------------------------

  function isSendModalOpen(): boolean {
    return sendModalInstance ? getOverlay().isOpen(sendModalInstance.id) : false
  }

  function isReceiveModalOpen(): boolean {
    return receiveModalInstance
      ? getOverlay().isOpen(receiveModalInstance.id)
      : false
  }

  function isScanModalOpen(): boolean {
    return scanModalInstance ? getOverlay().isOpen(scanModalInstance.id) : false
  }

  function isActionSheetOpen(): boolean {
    return actionSheetInstance
      ? getOverlay().isOpen(actionSheetInstance.id)
      : false
  }

  function isKeyboardShortcutsModalOpen(): boolean {
    return keyboardShortcutsModalInstance
      ? getOverlay().isOpen(keyboardShortcutsModalInstance.id)
      : false
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

    // State checks
    isSendModalOpen,
    isReceiveModalOpen,
    isScanModalOpen,
    isActionSheetOpen,
    isKeyboardShortcutsModalOpen,
  }
}
