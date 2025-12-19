/**
 * useKeyboardShortcuts - Keyboard shortcut management composable
 *
 * Provides a way to register and manage keyboard shortcuts throughout the app.
 * Supports modifier keys (cmd, ctrl, shift, alt) and key combinations.
 */

type ShortcutCallback = () => void

interface ShortcutOptions {
  /** Prevent default browser behavior */
  preventDefault?: boolean
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Only trigger when no input is focused */
  ignoreInputs?: boolean
}

export function useKeyboardShortcuts() {
  const shortcuts = new Map<
    string,
    { callback: ShortcutCallback; options: ShortcutOptions }
  >()

  /**
   * Normalize a key combination string
   */
  function normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .split('+')
      .map(k => k.trim())
      .sort()
      .join('+')
  }

  /**
   * Build key string from keyboard event
   */
  function buildKeyFromEvent(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.metaKey) parts.push('cmd')
    if (event.ctrlKey) parts.push('ctrl')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')

    // Normalize key name
    let key = event.key.toLowerCase()
    if (key === ' ') key = 'space'
    if (key === 'escape') key = 'esc'

    parts.push(key)

    return parts.sort().join('+')
  }

  /**
   * Check if an input element is focused
   */
  function isInputFocused(): boolean {
    const active = document.activeElement
    if (!active) return false

    const tagName = active.tagName.toLowerCase()
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (active as HTMLElement).isContentEditable
    )
  }

  /**
   * Register a keyboard shortcut
   */
  function register(
    key: string,
    callback: ShortcutCallback,
    options: ShortcutOptions = {},
  ): () => void {
    const normalizedKey = normalizeKey(key)
    const defaultOptions: ShortcutOptions = {
      preventDefault: true,
      stopPropagation: false,
      ignoreInputs: true,
      ...options,
    }

    shortcuts.set(normalizedKey, { callback, options: defaultOptions })

    // Return unregister function
    return () => {
      shortcuts.delete(normalizedKey)
    }
  }

  /**
   * Unregister a keyboard shortcut
   */
  function unregister(key: string): void {
    const normalizedKey = normalizeKey(key)
    shortcuts.delete(normalizedKey)
  }

  /**
   * Handle keydown event
   */
  function handleKeydown(event: KeyboardEvent): void {
    const keyString = buildKeyFromEvent(event)
    const shortcut = shortcuts.get(keyString)

    if (!shortcut) return

    // Check if we should ignore inputs
    if (shortcut.options.ignoreInputs && isInputFocused()) {
      return
    }

    // Prevent default if specified
    if (shortcut.options.preventDefault) {
      event.preventDefault()
    }

    // Stop propagation if specified
    if (shortcut.options.stopPropagation) {
      event.stopPropagation()
    }

    // Execute callback
    shortcut.callback()
  }

  // Setup and cleanup
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    shortcuts.clear()
  })

  return {
    register,
    unregister,
  }
}
