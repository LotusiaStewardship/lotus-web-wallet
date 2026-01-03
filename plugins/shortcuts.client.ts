/**
 * Keyboard Shortcuts Plugin
 *
 * Registers global keyboard shortcuts for navigation and actions.
 */

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const shortcuts = useKeyboardShortcuts()
  const {
    openKeyboardShortcutsModal,
    openActionSheet,
    isKeyboardShortcutsModalOpen,
    isActionSheetOpen,
  } = useOverlays()

  // Navigation shortcuts
  shortcuts.register('h', () => router.push('/'), {
    ignoreInputs: true,
  })

  shortcuts.register('p', () => router.push('/people'), {
    ignoreInputs: true,
  })

  shortcuts.register('a', () => router.push('/activity'), {
    ignoreInputs: true,
  })

  shortcuts.register('s', () => router.push('/settings'), {
    ignoreInputs: true,
  })

  shortcuts.register('e', () => router.push('/explore'), {
    ignoreInputs: true,
  })

  // Show shortcuts modal with ? (shift+/)
  shortcuts.register(
    'shift+/',
    () => {
      openKeyboardShortcutsModal()
    },
    {
      ignoreInputs: true,
    },
  )

  // Focus search with /
  shortcuts.register(
    '/',
    () => {
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[placeholder*="Search"]',
      )
      if (searchInput) {
        searchInput.focus()
      }
    },
    {
      ignoreInputs: true,
    },
  )

  // Open quick actions with Opt+Shift+A
  shortcuts.register(
    'alt+shift+a',
    () => {
      if (!isActionSheetOpen()) {
        openActionSheet()
      }
    },
    {
      ignoreInputs: true,
    },
  )

  // Escape to close modals/go back - handled by useOverlay automatically
  shortcuts.register(
    'esc',
    () => {
      // Blur active element if no modal is open
      if (!isKeyboardShortcutsModalOpen() && !isActionSheetOpen()) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    },
    {
      ignoreInputs: false,
      preventDefault: false,
    },
  )
})
