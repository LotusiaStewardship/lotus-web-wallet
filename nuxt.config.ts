// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // SPA mode - fully client-side rendered
  ssr: false,

  modules: [
    '@nuxt/ui-pro',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
  ],

  // PWA Configuration
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'Lotus Web Wallet',
      short_name: 'Lotus Wallet',
      description:
        'The key to the Lotusia ecosystem - P2P wallet with service discovery',
      theme_color: '#c6005c',
      background_color: '#000000',
      display: 'standalone',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      maximumFileSizeToCacheInBytes: 3000000, // 3MB
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  // Route redirects for old routes to new navigation structure
  routeRules: {
    '/send': { redirect: '/transact/send' },
    '/receive': { redirect: '/transact/receive' },
    '/history': { redirect: '/transact/history' },
    '/contacts': { redirect: '/people/contacts' },
    // Phase 10 R10.5.1: Redirect P2P to Shared Wallets (unified experience)
    '/p2p': { redirect: '/people/shared-wallets' },
    '/discover': { redirect: '/people/shared-wallets' },
    '/people/p2p': { redirect: '/people/shared-wallets' },
    '/explorer': { redirect: '/explore/explorer' },
    '/explorer/**': { redirect: '/explore/explorer/**' },
    '/social': { redirect: '/explore/social' },
    '/social/**': { redirect: '/explore/social/**' },
  },

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
    worker: {
      // Configure Web Worker bundling
      format: 'es',
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      plugins: () => {
        // Resolve polyfill shim paths to the actual plugin shim files
        // This is needed because the main bundle's polyfills plugin injects
        // references to these shims, but the worker bundler can't find them
        const shimAliasPlugin = {
          name: 'worker-shim-alias',
          enforce: 'pre' as const,
          resolveId(id: string) {
            // Resolve to the actual shim files in the plugin's node_modules
            if (id === 'vite-plugin-node-polyfills/shims/buffer') {
              return fileURLToPath(
                new URL(
                  './node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.js',
                  import.meta.url,
                ),
              )
            }
            if (id === 'vite-plugin-node-polyfills/shims/process') {
              return fileURLToPath(
                new URL(
                  './node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js',
                  import.meta.url,
                ),
              )
            }
            if (id === 'vite-plugin-node-polyfills/shims/global') {
              return fileURLToPath(
                new URL(
                  './node_modules/vite-plugin-node-polyfills/shims/global/dist/index.js',
                  import.meta.url,
                ),
              )
            }
            if (id === 'crypto-browserify') {
              return fileURLToPath(
                new URL(
                  './node_modules/crypto-browserify/index.js',
                  import.meta.url,
                ),
              )
            }
            return null
          },
        }

        return [
          shimAliasPlugin,
          // Apply node polyfills for worker bundle
          nodePolyfills({
            include: [
              'buffer',
              'events',
              'process',
              'util',
              'stream',
              'crypto',
            ],
            globals: {
              Buffer: true,
              global: true,
              process: true,
            },
            overrides: {
              crypto: 'crypto-browserify',
            },
          }),
        ]
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
