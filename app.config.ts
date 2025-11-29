export default defineAppConfig({
  ui: {
    // Primary color - Lotus pink
    colors: {
      primary: 'pink',
      neutral: 'slate',
    },
    // Button defaults
    button: {
      defaultVariants: {
        color: 'primary',
      },
    },
    // Card styling
    card: {
      slots: {
        root: 'bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800',
      },
    },
    // Dashboard customization
    dashboard: {
      sidebar: {
        slots: {
          root: 'bg-gray-50 dark:bg-gray-950',
        },
      },
    },
  },
  // App metadata
  app: {
    name: 'Lotus Web Wallet',
    description: 'The key to the Lotusia ecosystem',
  },
})
