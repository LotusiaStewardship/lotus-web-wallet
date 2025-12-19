/**
 * Clipboard Composable
 *
 * Clipboard operations with toast feedback.
 */

// ============================================================================
// Composable
// ============================================================================

export function useClipboard() {
  const toast = useToast()

  /**
   * Copy text to clipboard with toast feedback
   * @param text - Text to copy
   * @param label - Optional label for toast message
   * @returns Whether copy was successful
   */
  async function copy(text: string, label?: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: 'Copied',
        description: label
          ? `${label} copied to clipboard`
          : 'Copied to clipboard',
        icon: 'i-lucide-check',
        color: 'success',
      })
      return true
    } catch (error) {
      // Fallback for older browsers
      const success = fallbackCopy(text)
      if (success) {
        toast.add({
          title: 'Copied',
          description: label
            ? `${label} copied to clipboard`
            : 'Copied to clipboard',
          icon: 'i-lucide-check',
          color: 'success',
        })
        return true
      }

      toast.add({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        icon: 'i-lucide-x',
        color: 'error',
      })
      return false
    }
  }

  /**
   * Copy text silently (no toast)
   * @param text - Text to copy
   * @returns Whether copy was successful
   */
  async function copySilent(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return fallbackCopy(text)
    }
  }

  /**
   * Read text from clipboard
   * @returns Clipboard text or null if unavailable
   */
  async function paste(): Promise<string | null> {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return null
    }
  }

  /**
   * Copy address with appropriate label
   * @param address - Address to copy
   * @returns Whether copy was successful
   */
  async function copyAddress(address: string): Promise<boolean> {
    return copy(address, 'Address')
  }

  /**
   * Copy transaction ID with appropriate label
   * @param txid - Transaction ID to copy
   * @returns Whether copy was successful
   */
  async function copyTxid(txid: string): Promise<boolean> {
    return copy(txid, 'Transaction ID')
  }

  /**
   * Copy seed phrase with security warning
   * @param seedPhrase - Seed phrase to copy
   * @returns Whether copy was successful
   */
  async function copySeedPhrase(seedPhrase: string): Promise<boolean> {
    const success = await copySilent(seedPhrase)
    if (success) {
      toast.add({
        title: 'Seed Phrase Copied',
        description: 'Make sure to store it securely and clear your clipboard',
        icon: 'i-lucide-alert-triangle',
        color: 'warning',
      })
    } else {
      toast.add({
        title: 'Copy Failed',
        description: 'Could not copy seed phrase',
        icon: 'i-lucide-x',
        color: 'error',
      })
    }
    return success
  }

  /**
   * Check if clipboard API is available
   */
  const isSupported = computed(() => {
    return typeof navigator !== 'undefined' && 'clipboard' in navigator
  })

  /**
   * Fallback copy using execCommand (for older browsers)
   */
  function fallbackCopy(text: string): boolean {
    if (typeof document === 'undefined') return false

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()

    try {
      const success = document.execCommand('copy')
      return success
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }

  return {
    copy,
    copySilent,
    paste,
    copyAddress,
    copyTxid,
    copySeedPhrase,
    isSupported,
  }
}
