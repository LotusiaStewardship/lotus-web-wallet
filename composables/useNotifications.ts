/**
 * Notifications Composable
 *
 * Centralized notification/toast helpers with consistent styling.
 */

// ============================================================================
// Types
// ============================================================================

export interface NotificationAction {
  label: string
  click: () => void
}

// ============================================================================
// Composable
// ============================================================================

export function useNotifications() {
  const toast = useToast()

  /**
   * Show success notification
   * @param title - Notification title
   * @param description - Optional description
   */
  function success(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  }

  /**
   * Show error notification
   * @param title - Notification title
   * @param description - Optional description
   */
  function error(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-alert-circle',
      color: 'error',
    })
  }

  /**
   * Show warning notification
   * @param title - Notification title
   * @param description - Optional description
   */
  function warning(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-alert-triangle',
      color: 'warning',
    })
  }

  /**
   * Show info notification
   * @param title - Notification title
   * @param description - Optional description
   */
  function info(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-info',
      color: 'primary',
    })
  }

  /**
   * Show loading notification (doesn't auto-dismiss)
   * @param title - Notification title
   * @param description - Optional description
   * @returns Toast ID for manual dismissal
   */
  function loading(title: string, description?: string) {
    return toast.add({
      title,
      description,
      icon: 'i-lucide-loader-2',
      color: 'neutral',
    })
  }

  /**
   * Dismiss a notification by ID
   * @param id - Toast ID to dismiss
   */
  function dismiss(id: string | number) {
    toast.remove(String(id))
  }

  /**
   * Clear all notifications
   */
  function clearAll() {
    toast.clear()
  }

  // ========================================================================
  // Transaction-specific notifications
  // ========================================================================

  /**
   * Show transaction sent notification
   * @param txid - Transaction ID
   */
  function txSent(txid: string) {
    toast.add({
      title: 'Transaction Sent',
      description: 'Your transaction has been broadcast to the network',
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  }

  /**
   * Show transaction received notification
   * @param amount - Amount received (formatted)
   */
  function txReceived(amount: string) {
    toast.add({
      title: 'Payment Received',
      description: `You received ${amount}`,
      icon: 'i-lucide-arrow-down-left',
      color: 'success',
    })
  }

  /**
   * Show transaction confirmed notification
   * @param txid - Transaction ID
   */
  function txConfirmed(txid: string) {
    toast.add({
      title: 'Transaction Confirmed',
      description: 'Your transaction has been confirmed',
      icon: 'i-lucide-check-circle-2',
      color: 'success',
    })
  }

  /**
   * Show transaction failed notification
   * @param reason - Failure reason
   */
  function txFailed(reason?: string) {
    toast.add({
      title: 'Transaction Failed',
      description: reason || 'The transaction could not be broadcast',
      icon: 'i-lucide-x-circle',
      color: 'error',
    })
  }

  // ========================================================================
  // Connection notifications
  // ========================================================================

  /**
   * Show connected notification
   * @param network - Network name
   */
  function connected(network?: string) {
    toast.add({
      title: 'Connected',
      description: network ? `Connected to ${network}` : 'Connected to network',
      icon: 'i-lucide-wifi',
      color: 'success',
    })
  }

  /**
   * Show disconnected notification
   */
  function disconnected() {
    toast.add({
      title: 'Disconnected',
      description: 'Lost connection to network',
      icon: 'i-lucide-wifi-off',
      color: 'warning',
    })
  }

  /**
   * Show reconnecting notification
   */
  function reconnecting() {
    return toast.add({
      title: 'Reconnecting',
      description: 'Attempting to reconnect...',
      icon: 'i-lucide-loader-2',
      color: 'neutral',
    })
  }

  // ========================================================================
  // P2P notifications
  // ========================================================================

  /**
   * Show peer connected notification
   * @param peerId - Peer ID (will be truncated)
   */
  function peerConnected(peerId: string) {
    const shortId = peerId.slice(0, 8) + '...'
    toast.add({
      title: 'Peer Connected',
      description: `Connected to ${shortId}`,
      icon: 'i-lucide-user-plus',
      color: 'success',
    })
  }

  /**
   * Show signing request notification
   * @param from - Requester name or ID
   */
  function signingRequest(from: string) {
    toast.add({
      title: 'Signing Request',
      description: `${from} wants to co-sign a transaction`,
      icon: 'i-lucide-pen-tool',
      color: 'primary',
    })
  }

  return {
    // Basic notifications
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    clearAll,

    // Transaction notifications
    txSent,
    txReceived,
    txConfirmed,
    txFailed,

    // Connection notifications
    connected,
    disconnected,
    reconnecting,

    // P2P notifications
    peerConnected,
    signingRequest,
  }
}
