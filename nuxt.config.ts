// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import inject from '@rollup/plugin-inject'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // SPA mode - fully client-side rendered
  ssr: false,

  modules: ['@nuxt/ui-pro', '@nuxt/icon', '@pinia/nuxt', '@vueuse/nuxt'],

  // CSS imports - required for Tailwind CSS and Nuxt UI Pro
  css: ['~/assets/css/main.css'],

  // UI configuration
  ui: {
    colorMode: true,
  },

  // App configuration
  app: {
    head: {
      title: 'Lotus Web Wallet',
      meta: [
        {
          name: 'description',
          content:
            'The key to the Lotusia ecosystem - P2P wallet with service discovery',
        },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  // Runtime config
  // Note: Network-specific URLs are now managed by the network store (stores/network.ts)
  // These are kept as fallbacks for components that don't use the store
  runtimeConfig: {
    public: {
      // Default to mainnet URLs - actual URLs come from network store
      chronikUrl: 'https://chronik.lotusia.org',
      rankApiUrl: 'https://rank.lotusia.org/api/v1',
      explorerUrl: 'https://lotusia.org/explorer',
    },
  },

  // Vite configuration for browser compatibility
  vite: {
    optimizeDeps: {
      // Don't pre-bundle lotus-sdk - we use dynamic imports
      exclude: ['lotus-sdk'],
      // Include Node.js polyfills for pre-bundling
      include: ['buffer', 'events'],
    },
    define: {
      // Node.js polyfills for browser
      'process.env': '{}',
      'process.cwd': '(() => "/")',
      'global': 'globalThis',
    },
    resolve: {
      alias: {
        // Stub out Node.js modules that don't work in browser
        dotenv: fileURLToPath(new URL('./stubs/dotenv.js', import.meta.url)),
        // Node.js polyfills for browser
        buffer: 'buffer/',
        events: 'events/',
      },
    },
    plugins: [
      // Inject Buffer globally for browser compatibility
      inject({
        Buffer: ['buffer', 'Buffer'],
      }),
    ],
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    shim: false,
  },
})
