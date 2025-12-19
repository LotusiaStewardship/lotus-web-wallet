/**
 * useFocusManagement - Focus trap and restoration composable
 *
 * Provides utilities for managing focus within modals and other
 * interactive components for better accessibility.
 */

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusManagement() {
  const previouslyFocused = ref<HTMLElement | null>(null)

  /**
   * Get all focusable elements within a container
   */
  function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    )
  }

  /**
   * Trap focus within a container
   * Returns a cleanup function to remove the trap
   */
  function trapFocus(container: HTMLElement): () => void {
    // Store currently focused element for later restoration
    previouslyFocused.value = document.activeElement as HTMLElement

    const focusableElements = getFocusableElements(container)
    if (focusableElements.length === 0) return () => {}

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstElement?.focus()

    function handleKeydown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return

      const currentFocusableElements = getFocusableElements(container)
      if (currentFocusableElements.length === 0) return

      const first = currentFocusableElements[0]
      const last = currentFocusableElements[currentFocusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab: going backwards
        if (document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeydown)

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeydown)
    }
  }

  /**
   * Restore focus to previously focused element
   */
  function restoreFocus(): void {
    if (
      previouslyFocused.value &&
      typeof previouslyFocused.value.focus === 'function'
    ) {
      previouslyFocused.value.focus()
      previouslyFocused.value = null
    }
  }

  /**
   * Focus first focusable element in container
   */
  function focusFirst(container: HTMLElement): void {
    const focusableElements = getFocusableElements(container)
    focusableElements[0]?.focus()
  }

  /**
   * Focus last focusable element in container
   */
  function focusLast(container: HTMLElement): void {
    const focusableElements = getFocusableElements(container)
    focusableElements[focusableElements.length - 1]?.focus()
  }

  /**
   * Check if element is focusable
   */
  function isFocusable(element: HTMLElement): boolean {
    return element.matches(FOCUSABLE_SELECTORS)
  }

  return {
    trapFocus,
    restoreFocus,
    focusFirst,
    focusLast,
    isFocusable,
    getFocusableElements,
  }
}
