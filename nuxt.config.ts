// nuxt.config.ts - Simplified
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// vite-plugin-node-polyfills sets resolve.alias mapping `buffer` →
// `vite-plugin-node-polyfills/shims/buffer` (and similar for global/process).
// This alias propagates to ALL Vite sub-builds (workers, PWA service worker),
// but those builds lack the plugin's full setup so they cannot resolve the
// rewritten shim specifiers.  This small plugin resolves them explicitly.
function polyfillShimResolver() {
  const shimRoot = fileURLToPath(
    new URL('./node_modules/vite-plugin-node-polyfills/shims', import.meta.url),
  )
  return {
    name: 'polyfill-shim-resolver',
    resolveId(source: string) {
      for (const mod of ['buffer', 'global', 'process']) {
        // Use NPM `buffer` package to polyfill buffer globally
        if (mod === 'buffer') {
          if (
            source === 'vite-plugin-node-polyfills/shims/buffer' ||
            source === 'vite-plugin-node-polyfills/shims/buffer/'
          ) {
            return fileURLToPath(
              new URL('./node_modules/buffer/index.js', import.meta.url),
            )
          }
        } else if (
          source === `vite-plugin-node-polyfills/shims/${mod}` ||
          source === `vite-plugin-node-polyfills/shims/${mod}/`
        ) {
          return `${shimRoot}/${mod}/dist/index.js`
        }
      }
    },
  }
}

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
      name: 'Lotusia',
      short_name: 'Lotusia',
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
      maximumFileSizeToCacheInBytes: 4000000, // 4MB
      buildPlugins: {
        vite: [polyfillShimResolver()],
      },
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 300,
      registerPlugin: true,
    },
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
      title: 'Lotusia',
      meta: [
        {
          name: 'description',
          content:
            'The key to the Lotusia ecosystem - P2P wallet with service discovery',
        },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#c6005c' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        { name: 'apple-mobile-web-app-title', content: 'Lotusia' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
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
      // NOTE: We disable `Buffer` global here because xpi-ts was
      // recently migrated to the NPM `buffer/` package, which provides
      // a Buffer wrapper for the natively-supported Uint8Array
      nodePolyfills({
        globals: { Buffer: true, global: true, process: true },
      }),
    ],

    // Worker configuration
    // vite-plugin-node-polyfills sets resolve.alias mapping `buffer` →
    // `vite-plugin-node-polyfills/shims/buffer`.  This alias propagates to
    // the worker build (separate Rollup instance), but the worker lacks
    // the plugin's full setup so it cannot resolve the shim specifier.
    // We add a small resolveId plugin to worker.plugins that intercepts
    // the shim specifier and points it at the real file.
    worker: {
      format: 'es',
      plugins: () => [polyfillShimResolver()],
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
