# Lotus Web Wallet

The key to the Lotusia ecosystem - A feature-rich P2P wallet with service discovery.

## Features

- **Wallet Management**: Send and receive Lotus (XPI) with a modern, intuitive interface
- **Contacts**: Full contact management with search, tags, import/export, and P2P integration
- **P2P Discovery**: Discover and connect with other wallets and services on the network
- **Service Advertisements**: Advertise your services (wallet, signer, relay, exchange) to the P2P network
- **Multi-sig Ready**: P2P service templates and lotus-sdk primitives for MuSig2-based signer services (see `docs/STEALTH_VS_MUSIG2_COMPARISON.md`)
- **Real-time Updates**: WebSocket-based balance and transaction updates via Chronik

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com) with SPA mode
- **UI**: [Nuxt UI Pro](https://ui.nuxt.com/pro) v3 components with Tailwind CSS
- **State Management**: [Pinia](https://pinia.vuejs.org)
- **Blockchain**: [lotus-sdk](https://github.com/LotusiaStewardship/lotus-sdk) (v0.1.42+) for wallet operations
- **Network**: [Chronik](https://chronik.lotusia.org) for blockchain data

## Browser Compatibility

This wallet runs entirely in the browser. The following Node.js polyfills are configured via Vite:

- **Buffer**: Via `buffer` package with `@rollup/plugin-inject`
- **Events**: Via `events` package
- **Crypto**: lotus-sdk uses `@noble/hashes` for browser-compatible cryptography

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
lotus-web-wallet/
├── app.vue              # Main app component (initializes wallet store)
├── nuxt.config.ts       # Nuxt configuration with Node.js polyfills
├── assets/
│   └── css/main.css     # Tailwind CSS and Nuxt UI Pro imports
├── layouts/
│   └── default.vue      # Main dashboard layout (shows loading state)
├── pages/
│   ├── index.vue        # Wallet home/dashboard
│   ├── send.vue         # Send Lotus page (with contact search)
│   ├── receive.vue      # Receive Lotus page (QR code)
│   ├── history.vue      # Transaction history
│   ├── contacts.vue     # Contact management
│   ├── discover.vue     # P2P service discovery
│   └── settings/        # Settings pages
│       ├── index.vue    # Settings overview
│       ├── backup.vue   # Seed phrase backup
│       ├── restore.vue  # Wallet restore
│       ├── network.vue  # Network settings
│       └── advertise.vue # Service advertisement
├── stores/
│   ├── wallet.ts        # Wallet state management (dynamic lotus-sdk imports)
│   ├── contacts.ts      # Contact management with search and P2P integration
│   └── p2p.ts           # P2P network state
├── components/
│   └── contacts/        # Contact-related components
│       ├── ContactCard.vue   # Contact display card
│       ├── ContactForm.vue   # Add/edit contact form
│       └── ContactSearch.vue # Searchable contact input
├── stubs/
│   └── dotenv.js        # Browser stub for dotenv module
└── composables/         # Vue composables
```

## Architecture

### Initialization Flow

The wallet uses a client-side Bitcore SDK provider and dynamic imports for browser compatibility. The initialization flow is:

1. `app.vue` mounts and calls `walletStore.initialize()`
2. The Bitcore SDK is ensured via the `plugins/bitcore.client.ts` plugin, and `initialize()` lazily imports `chronik-client`
3. Wallet is created/restored from localStorage
4. Chronik WebSocket connection is established
5. `walletStore.initialized` is set to `true`

**Important**: Pages must check `walletStore.initialized` before calling store methods that depend on the SDK. The layout shows a loading spinner while `walletStore.loading` is true.

### State Management

- **Wallet Store** (`stores/wallet.ts`): Manages seed phrase, addresses, UTXOs, balance, and transaction history. Uses `markRaw()` for non-reactive runtime objects (Chronik client, private keys).
- **Contacts Store** (`stores/contacts.ts`): Manages contact list with CRUD operations, search, tags, and P2P integration. Persisted to localStorage.
- **P2P Store** (`stores/p2p.ts`): Manages P2P network state, peer discovery, and service advertisements. Initialized on-demand when visiting P2P-related pages.

### Contacts System

The contacts system provides phone-like contact management:

- **Add/Edit/Delete**: Full CRUD operations for contacts
- **Search**: Real-time search by name, address, or tags
- **Tags**: Categorize contacts with custom tags
- **Import/Export**: JSON-based backup and restore
- **P2P Integration**: Save discovered services as contacts with peer ID tracking
- **Send Integration**: Search contacts directly from the Send page

### Validation Methods

The `isValidAddress()` and `isValidSeedPhrase()` methods return `false` if the SDK is not yet loaded. Pages should handle this gracefully (e.g., show "Validating..." state).

## Configuration

Runtime configuration can be set via environment variables:

```env
NUXT_PUBLIC_CHRONIK_URL=https://chronik.lotusia.org
NUXT_PUBLIC_RANK_API_URL=https://rank.lotusia.org/api/v1
NUXT_PUBLIC_EXPLORER_URL=https://lotusia.org/explorer
```

## Security

- Seed phrases are stored in browser localStorage on this device; treat this as a hot wallet and protect your OS user profile.
- Private keys never leave the browser
- All blockchain operations are performed client-side

## Implementation Details

### Bitcore SDK Provider Pattern

- `plugins/bitcore.client.ts` loads the `Bitcore` SDK from `lotus-sdk` once at app startup (client-only plugin) and exposes helpers: `getBitcore()`, `isBitcoreLoaded()`, `ensureBitcore()`.
- `composables/useBitcore.ts` wraps the plugin and provides `useBitcore()`, which returns a reactive `Bitcore` instance plus convenience getters for `XAddress`, `Address`, `Script`, `Transaction`, `Mnemonic`, `Networks`, etc.
- `stores/wallet.ts` does not import `lotus-sdk` directly. It calls `ensureBitcore()` in `initialize()` and uses small module-level getters (for example `getMnemonic()`, `getAddress()`, `getTransaction()`) that always read from the shared SDK instance.
- Other composables, like `useAddressFormat` in `composables/useUtils.ts`, use `useBitcore()` for address parsing, validation, and display formatting.

This pattern avoids race conditions and guarantees that the SDK is initialized before UI code touches it.

### Network & Explorer Integration

- `stores/network.ts` owns the active network (`livenet` / `testnet`) and canonical URLs for Chronik, the explorer, and the Rank API.
- Components and stores should read URLs from the network store (`chronikUrl`, `explorerUrl`, `explorerApiUrl`, `rankApiUrl`) instead of hard-coding endpoints.
- `nuxt.config.ts` exposes matching defaults via `runtimeConfig.public.{chronikUrl, rankApiUrl, explorerUrl}`, which can be overridden with the `NUXT_PUBLIC_*` environment variables shown above.

### P2P & Service Discovery

- `stores/p2p.ts` uses the `P2P` module from `lotus-sdk` to run a browser-compatible P2P node that connects to Lotusia bootstrap peers.
- `pages/discover.vue` lists services announced on the network and lets you connect, send Lotus, or save them to contacts.
- `pages/settings/advertise.vue` publishes wallet, signer, relay, and exchange services with capability tags such as `musig2`, `threshold-signing`, etc. The wallet advertises these capabilities; the actual MuSig2 signing flows live in specialized services built on top of `lotus-sdk`.

### Address Types & Taproot

- The wallet supports both classic P2PKH and modern Taproot (P2TR) addresses. Taproot is the default (`addressType: 'p2tr'` in the wallet store).
- For P2TR, the wallet uses Bitcore's Taproot helpers (such as `tweakPublicKey` and `buildPayToTaproot`) and subscribes to Chronik using the `p2tr-commitment` script type.
- `useAddressFormat` in `composables/useUtils.ts` centralizes address parsing, type detection (`pubkeyhash`, `scripthash`, `taproot`), validation, and network detection on top of Bitcore's `XAddress` implementation.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Lotusia Website](https://lotusia.org)
- [Documentation](https://lotusia.org/docs)
- [GitHub](https://github.com/LotusiaStewardship)
