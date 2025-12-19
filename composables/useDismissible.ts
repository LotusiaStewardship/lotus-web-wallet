/**
 * useDismissible Composable
 *
 * Phase 6: Anti-annoyance pattern for dismissible UI elements.
 * Provides persistent dismissal state for banners, tooltips, and feature introductions.
 *
 * Per 07_HUMAN_CENTERED_UX.md - all educational UI must be dismissible.
 */

const STORAGE_PREFIX = 'ux:dismissed:'

/**
 * Composable for managing dismissible UI elements
 *
 * @param key - Unique identifier for the dismissible element
 * @returns Object with isDismissed state and dismiss/reset functions
 */
export function useDismissible(key: string) {
  const storageKey = `${STORAGE_PREFIX}${key}`

  // Initialize from localStorage (SSR-safe)
  const isDismissed = ref(false)

  // Check localStorage on client
  onMounted(() => {
    isDismissed.value = localStorage.getItem(storageKey) === 'true'
  })

  /**
   * Dismiss the element
   * @param dontShowAgain - If true, persists dismissal to localStorage
   */
  function dismiss(dontShowAgain: boolean = true) {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true')
    }
    isDismissed.value = true
  }

  /**
   * Reset the dismissal state (show the element again)
   */
  function reset() {
    localStorage.removeItem(storageKey)
    isDismissed.value = false
  }

  return {
    isDismissed: readonly(isDismissed),
    dismiss,
    reset,
  }
}

/**
 * Prompt metadata for settings page display
 */
export interface DismissedPromptInfo {
  key: string
  label: string
  description?: string
}

/**
 * Registry of known dismissible prompts with their metadata
 */
export const DISMISSIBLE_PROMPTS: Record<
  string,
  Omit<DismissedPromptInfo, 'key'>
> = {
  'intro:sharedWallets': {
    label: 'Shared Wallets Introduction',
    description: 'Welcome message explaining shared wallet features',
  },
  'intro:p2pNetwork': {
    label: 'P2P Network Introduction',
    description: 'Explanation of peer-to-peer connectivity',
  },
  'intro:availableSigners': {
    label: 'Available Signers Introduction',
    description: 'Guide to finding co-signers for shared wallets',
  },
  'banner:backupReminder': {
    label: 'Backup Reminder',
    description: 'Reminder to backup your wallet seed phrase',
  },
  'tooltip:musig2Badge': {
    label: 'MuSig2 Badge Tooltip',
    description: 'Explanation of the MuSig2 capability badge',
  },
}

/**
 * Get all dismissed prompt keys from localStorage
 * @returns Array of dismissed prompt keys
 */
export function getAllDismissedPrompts(): string[] {
  if (typeof localStorage === 'undefined') return []

  const dismissed: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      dismissed.push(key.replace(STORAGE_PREFIX, ''))
    }
  }
  return dismissed
}

/**
 * Get dismissed prompts with their metadata for settings display
 * @returns Array of dismissed prompt info objects
 */
export function getDismissedPromptsWithInfo(): DismissedPromptInfo[] {
  const dismissedKeys = getAllDismissedPrompts()
  return dismissedKeys.map(key => ({
    key,
    label: DISMISSIBLE_PROMPTS[key]?.label || key,
    description: DISMISSIBLE_PROMPTS[key]?.description,
  }))
}

/**
 * Reset a specific dismissed prompt
 * @param key - The prompt key to reset
 */
export function resetDismissedPrompt(key: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
}

/**
 * Reset all dismissed prompts
 */
export function resetAllDismissedPrompts(): void {
  if (typeof localStorage === 'undefined') return

  const keys = getAllDismissedPrompts()
  keys.forEach(key => localStorage.removeItem(`${STORAGE_PREFIX}${key}`))
}
