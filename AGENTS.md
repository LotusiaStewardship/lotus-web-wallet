# AGENTS.md

A first-level blueprint for IDE coding agents working on the lotus-web-wallet codebase.

## Setup Commands

```bash
# Install dependencies
npm install

# Start development server (SPA mode, port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run typecheck
```

---

## Project Overview

Lotus Web Wallet is a P2P cryptocurrency wallet for the Lotus blockchain, built with Nuxt 3 and Nuxt UI Pro. It features:

- HD wallet with P2PKH and P2TR (Taproot) address support
- RANK protocol integration for social curation
- PWA with offline support via service worker
- Chronik indexer integration for blockchain data

---

## Directory Structure

| Folder              | Purpose                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **assets/**         | CSS (`css/main.css`), fonts, static assets                                                            |
| **components/**     | Vue components by domain: `feed/`, `wallets/`, `settings/`, `navigation/`, `ui/`, `activity/`, etc.   |
| **composables/**    | Vue composables (auto-imported): `useWallet.ts`, `useRankApi.ts`, `useTransactionBuilder.ts`, etc.    |
| **stores/**         | Pinia stores: `wallet.ts`, `network.ts`, `contacts.ts`, `activity.ts`, `ui.ts`, `onboarding.ts`, etc. |
| **pages/**          | File-based routes: `index.vue`, `feed/`, `settings/`, `activity/`, `people/`                          |
| **plugins/**        | Nuxt plugins: `chronik.client.ts`, `crypto-worker.client.ts`, `explorer.client.ts`, etc.              |
| **service-worker/** | PWA service worker (`sw.ts`) + modules: `network-monitor.ts`, `push-notifications.ts`, etc.           |
| **workers/**        | Web workers: `crypto.worker.ts` for heavy cryptographic operations                                    |
| **types/**          | TypeScript definitions: `contact.ts`, `transaction.ts`, `p2p.ts`, `ui.ts`, `index.ts`                 |
| **utils/**          | Pure functions: `constants.ts`, `formatting.ts`, `validation.ts`, `storage.ts`, etc.                  |

### Key Files

| File             | Role                                                    |
| ---------------- | ------------------------------------------------------- |
| `nuxt.config.ts` | Nuxt config: modules, PWA, runtime URLs, Vite polyfills |
| `app.vue`        | Root component with `<NuxtLayout>`                      |
| `app.config.ts`  | App constants: explorer URLs, theme settings            |
| `package.json`   | Dependencies, scripts                                   |

---

## Code Style

- **TypeScript strict mode** enabled (`typescript.strict: true` in nuxt.config.ts)
- **Vue 3 Composition API** with `<script setup>` syntax
- **Composables**: Named exports (`export function useWallet() {...}`), auto-imported by Nuxt
- **Components**: PascalCase filenames, auto-imported by Nuxt
- **Stores**: Pinia with `defineStore()`, accessed via composables (e.g., `useWalletStore()`)
- **Imports**: Use `~` alias for project root (e.g., `~/utils/constants`)
- **UI**: Nuxt UI Pro components (`<UButton>`, `<UBadge>`, `<UIcon>`, etc.)
- **TailwindCSS**: Configured via Nuxt UI, use utility classes

---

## Architecture Notes

- **SPA mode**: `ssr: false` in nuxt.config.ts — fully client-side rendered
- **PWA**: `@vite-pwa/nuxt` with `injectManifest` strategy; service worker at `service-worker/sw.ts`
- **Crypto worker**: Heavy operations offloaded to `workers/crypto.worker.ts`
- **Chronik**: WebSocket-based blockchain indexer client via `chronik-client` npm package
- **xpi-ts**: Core crypto library (Lotus fork of bitcore-lib) for transactions, addresses, signing

---

## Pinia Stores

| Store           | Domain                                           |
| --------------- | ------------------------------------------------ |
| `wallet`        | HD wallet, UTXOs, balance, address management    |
| `network`       | Livenet/testnet URLs and configuration           |
| `contacts`      | User address book                                |
| `identity`      | Unified identities across P2P & social feeds     |
| `activity`      | Combined activity feed (transactions, votes)     |
| `ui`            | Global UI state: modals, loading, theme, sidebar |
| `onboarding`    | First-time user onboarding flow                  |
| `notifications` | Toast notification queue                         |
| `people`        | People/profile management                        |
| `settings`      | User preferences                                 |
| `feed`          | RANK feed state                                  |

---

## Key Composables

| File                       | Responsibility                                      |
| -------------------------- | --------------------------------------------------- |
| `useWallet.ts`             | High-level wallet helpers (balance, UTXOs)          |
| `useChronikClient.ts`      | Reactive Chronik blockchain client wrapper          |
| `useTransactionBuilder.ts` | Transaction construction (inputs, outputs, signing) |
| `useRankApi.ts`            | RANK protocol REST API wrapper (~27KB)              |
| `useRankVote.ts`           | RANK voting flow (build tx, sign, broadcast)        |
| `useRankAuth.ts`           | BlockDataSig authentication for RANK API            |
| `useRnkcComment.ts`        | RNKC comment transaction flow                       |
| `useAddress.ts`            | Address parsing and validation                      |
| `useAmount.ts`             | Satoshi ↔ XPI formatting and conversion             |
| `useNotifications.ts`      | Toast notification helpers                          |
| `useQRCode.ts`             | QR code generation and payment URI parsing          |
| `useTime.ts`               | Relative/absolute time formatting                   |
| `useOverlays.ts`           | Modal/slideover management (~22KB)                  |
| `useServiceWorker.ts`      | Service worker communication bridge                 |

---

## Runtime Configuration

Public runtime config values (accessed via `useRuntimeConfig().public`):

```ts
{
  chronikUrl: 'https://chronik.lotusia.org',    // Blockchain indexer
  rankApiUrl: 'https://rank.lotusia.org/api/v1', // RANK protocol API
  explorerUrl: 'https://lotusia.org/explorer',   // Block explorer
}
```

Note: Network-specific URLs are managed by `stores/network.ts`; these serve as fallbacks.

---

## Service Worker & Workers

**Service Worker** (`service-worker/sw.ts`):

- PWA with `injectManifest` strategy
- Modules: `network-monitor.ts`, `push-notifications.ts`, `session-monitor.ts`, `state-sync.ts`
- Handles offline caching, background sync, push notifications

**Crypto Worker** (`workers/crypto.worker.ts`):

- Heavy cryptographic operations (key derivation, signing)
- Communicates via `postMessage` interface
- Initialized via `plugins/crypto-worker.client.ts`

---

## Testing

No test suite currently exists in this repository. When adding tests:

- Place test files alongside source files with `.test.ts` or `.spec.ts` suffix
- Use Vitest (compatible with Nuxt 3)
- Run: `npx vitest run` (after installing vitest)

---

## PR Instructions

- Run `npm run lint` and `npm run typecheck` before committing
- Ensure build succeeds: `npm run build`
- Test PWA functionality in preview mode: `npm run preview`

---

## External Documentation

- **Lotus Docs**: https://lotusia.org/docs
- **Lotus FAQ**: https://lotusia.org/faq
- **xpi-ts Reference**: https://github.com/LotusiaStewardship/xpi-ts
- **Chronik Client**: https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/web/chronik-client
