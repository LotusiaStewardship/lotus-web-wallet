/**
 * Seed Phrase Composable
 *
 * Utilities for parsing, validating, and working with BIP39 seed phrases.
 */
import { useWalletStore } from '~/stores/wallet'

// ============================================================================
// Types
// ============================================================================

export interface SeedPhraseState {
  /** Raw input string */
  input: Ref<string>
  /** Parsed words array */
  words: ComputedRef<string[]>
  /** Number of words */
  wordCount: ComputedRef<number>
  /** Whether word count is valid (12 or 24) */
  hasValidWordCount: ComputedRef<boolean>
  /** Whether the seed phrase is cryptographically valid */
  isValid: ComputedRef<boolean>
  /** Clear the input */
  clear: () => void
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse a seed phrase string into normalized words
 */
export function parseSeedPhrase(input: string): string[] {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0)
}

/**
 * Check if word count is valid for BIP39 (12 or 24 words)
 */
export function isValidWordCount(count: number): boolean {
  return count === 12 || count === 24
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Create a reactive seed phrase input with validation
 */
export function useSeedPhrase(initialValue = ''): SeedPhraseState {
  const walletStore = useWalletStore()

  const input = ref(initialValue)

  const words = computed(() => parseSeedPhrase(input.value))

  const wordCount = computed(() => words.value.length)

  const hasValidWordCount = computed(() => isValidWordCount(wordCount.value))

  const isValid = computed(() => {
    if (!hasValidWordCount.value) return false
    return walletStore.isValidSeedPhrase(words.value.join(' '))
  })

  function clear() {
    input.value = ''
  }

  return {
    input,
    words,
    wordCount,
    hasValidWordCount,
    isValid,
    clear,
  }
}
