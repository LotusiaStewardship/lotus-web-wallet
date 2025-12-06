// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
  // See docs/plans/BROWSER_COMPATIBILITY_FIX.md for detailed analysis
  vite: {
    plugins: [
      // Comprehensive Node.js polyfills for browser environment
      // This replaces manual Buffer injection and runtime shims
      nodePolyfills({
        include: ['buffer', 'events', 'process', 'util', 'stream', 'crypto'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Use native browser crypto where available
        overrides: {
          crypto: 'crypto-browserify',
        },
      }),
    ],
    optimizeDeps: {
      // Include ALL CommonJS dependencies for proper ESM transformation
      // This ensures they're pre-bundled with correct module format
      include: [
        // Node.js polyfills
        'buffer',
        'events',
        'process',
        // Chronik and its dependencies
        'chronik-client',
        'protobufjs',
        'protobufjs/minimal',
        'long',
        'axios',
        'isomorphic-ws',
        // Crypto dependencies (used by lotus-sdk/bitcore)
        'elliptic',
        'bn.js',
        'brorand',
        'hash.js',
        'hmac-drbg',
        'inherits',
        'minimalistic-assert',
        'minimalistic-crypto-utils',
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    build: {
      // Ensure CommonJS modules are properly transformed
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },
    resolve: {
      alias: {
        // Stub out Node.js-only modules that can't be polyfilled
        dotenv: fileURLToPath(new URL('./stubs/dotenv.js', import.meta.url)),
      },
    },
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    shim: false,
  },
})
