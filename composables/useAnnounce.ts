/**
 * useAnnounce - Screen reader announcement composable
 *
 * Provides a way to announce messages to screen readers using
 * an ARIA live region.
 */

export function useAnnounce() {
  const announcer = ref<HTMLElement | null>(null)

  onMounted(() => {
    // Create or find announcer element
    let el = document.getElementById('sr-announcer')
    if (!el) {
      el = document.createElement('div')
      el.id = 'sr-announcer'
      el.setAttribute('aria-live', 'polite')
      el.setAttribute('aria-atomic', 'true')
      el.className = 'sr-only'
      document.body.appendChild(el)
    }
    announcer.value = el
  })

  /**
   * Announce a message to screen readers
   * @param message - The message to announce
   * @param priority - 'polite' (default) or 'assertive' for urgent messages
   */
  function announce(
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
  ) {
    if (!announcer.value) return

    announcer.value.setAttribute('aria-live', priority)
    announcer.value.textContent = ''

    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      if (announcer.value) {
        announcer.value.textContent = message
      }
    }, 100)
  }

  /**
   * Announce a success message
   */
  function announceSuccess(message: string) {
    announce(message, 'polite')
  }

  /**
   * Announce an error message (assertive)
   */
  function announceError(message: string) {
    announce(message, 'assertive')
  }

  return {
    announce,
    announceSuccess,
    announceError,
  }
}
