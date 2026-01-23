# Lotus Web Wallet

The key to the Lotusia ecosystem - A feature-rich P2P wallet with service discovery and multi-signature support.

## Features

- **Wallet Management**: Send and receive Lotus (XPI) with modern Taproot and legacy P2PKH address support
- **Real-time Updates**: WebSocket-based balance and transaction updates via Chronik
- **Advanced Multi-signature**: MuSig2-based shared wallets with participant management
- **P2P Network**: Discover and connect with other wallets and services via libp2p
- **Service Discovery**: Advertise wallet, signer, relay, and exchange services to the P2P network
- **Contact Management**: Full contact system with search, tags, import/export, and P2P integration
- **Background Operations**: Service worker with push notifications and cross-tab synchronization
- **Human-centric UI**: Modern responsive interface built with Nuxt UI Pro and accessibility features

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com) with SPA mode and Vue 3 Composition API
- **UI**: [Nuxt UI Pro](https://ui.nuxt.com/pro) v3 components with Tailwind CSS
- **State Management**: [Pinia](https://pinia.vuejs.org) with 13 specialized stores
- **Blockchain**:
  - [xpi-ts](https://github.com/LotusiaStewardship/xpi-ts) for core wallet operations
  - [xpi-p2p-ts](https://github.com/LotusiaStewardship/xpi-p2p-ts) for P2P networking
  - [Chronik Client](https://chronik.lotusia.org) for blockchain data and WebSocket updates
- **P2P Networking**: libp2p-based peer discovery and service advertisement
- **Cryptography**: Browser-compatible operations via Web Workers and Node.js polyfills

## Browser Compatibility

This wallet runs entirely in the browser with comprehensive Node.js polyfills configured via Vite:

- **Buffer**: Via `buffer` package with worker-specific polyfill handling
- **Events**: Via `events` package for event emitter functionality
- **Crypto**: Browser-compatible cryptography using `@noble/hashes` and Web Workers
- **Additional Polyfills**: process, util, stream, and other Node.js modules for full compatibility

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
├── app.vue                    # Main app component (initializes all stores)
├── nuxt.config.ts             # Nuxt configuration with Node.js polyfills and PWA setup
├── assets/css/main.css         # Tailwind CSS and Nuxt UI Pro imports
├── layouts/default.vue         # Main dashboard layout with overlay management
├── pages/                      # Route components
│   ├── index.vue              # Home dashboard with quick actions
│   ├── activity/              # Transaction history and notifications
│   ├── explore/               # Blockchain explorer integration
│   ├── people/                # Contact and shared wallet management
│   └── settings/              # Configuration and wallet management
├── stores/                     # Pinia state management (13 stores)
│   ├── wallet.ts              # Core wallet operations and UTXO management
│   ├── p2p.ts                 # P2P networking state and peer management
│   ├── musig2.ts              # Multi-signature coordination
│   ├── contacts.ts            # Contact management with P2P integration
│   ├── activity.ts            # Transaction history and notifications
│   ├── network.ts             # Network configuration and URLs
│   └── [8 more stores]        # Specialized functionality
├── components/                 # Vue components organized by feature
│   ├── actions/               # Send, receive, scan modals
│   ├── activity/              # Transaction display components
│   ├── explorer/              # Blockchain data components
│   ├── people/                # Contact and shared wallet components
│   └── [more categories]      # UI components and forms
├── composables/               # Vue composables for reusable logic
│   ├── useChronikClient.ts    # Chronik blockchain client
│   ├── useTransactionBuilder.ts # Transaction construction
│   ├── useMuSig2.ts           # Multi-signature operations
│   ├── useP2PCoordinator.ts   # P2P networking
│   └── [30+ composables]      # Specialized functionality
├── plugins/                   # Nuxt plugins for service integration
│   ├── 02.chronik.client.ts   # Chronik WebSocket client
│   ├── 04.p2p.client.ts       # P2P networking coordinator
│   ├── 05.musig2.client.ts    # MuSig2 multi-signature
│   └── crypto-worker.client.ts # Web Worker crypto operations
├── service-worker/            # PWA service worker
│   ├── sw.ts                  # Main service worker with message handling
│   └── modules/               # Background services
│       ├── network-monitor.ts # Blockchain monitoring
│       ├── session-monitor.ts # MuSig2 session tracking
│       ├── state-sync.ts      # IndexedDB state synchronization
│       └── push-notifications.ts # Notification management
├── workers/                   # Web Workers
│   └── crypto.worker.ts      # Cryptographic operations
├── utils/                     # Utility functions and types
├── types/                     # TypeScript type definitions
└── stubs/dotenv.js           # Browser stub for Node.js modules
```

## Architecture

### Initialization Flow

The wallet uses a sophisticated plugin-based architecture with lazy loading for browser compatibility:

1. `app.vue` mounts and initializes all stores in sequence (onboarding → notifications → settings → P2P → people → activity)
2. Chronik plugin is configured with network settings from `networkStore`
3. `walletStore.initialize()` creates/restores wallet from localStorage and establishes WebSocket connection
4. P2P networking is initialized on-demand when accessing P2P features
5. Service worker registers for background operations and push notifications

**Important**: Components must check store initialization states before accessing methods that depend on plugins. The layout shows loading indicators while stores initialize.

### State Management Architecture

The application uses 13 specialized Pinia stores with clear separation of concerns:

#### **Core Stores**

- **Wallet Store** (`stores/wallet.ts`): Seed phrase management, address derivation, UTXO tracking, balance calculations, transaction history. Uses `markRaw()` for non-reactive runtime objects.
- **Network Store** (`stores/network.ts`): Network configuration (mainnet/testnet), API endpoints, URL management.
- **Contacts Store** (`stores/contacts.ts`): Contact CRUD operations, search, tags, import/export, P2P integration.

#### **Advanced Feature Stores**

- **P2P Store** (`stores/p2p.ts`): libp2p connection management, peer discovery, presence advertising, service discovery.
- **MuSig2 Store** (`stores/musig2.ts`): Multi-signature coordination, session management, participant tracking.
- **Activity Store** (`stores/activity.ts`): Transaction history, notifications, signing requests, read status tracking.

#### **Supporting Stores**

- **Identity Store**: User profile and presence information
- **Settings Store**: UI preferences and configuration
- **Onboarding Store**: New user guidance and backup status
- **Notification Store**: Push notification management
- **UI Store**: Interface state and overlay management
- **Draft Store**: Temporary form data and input states
- **People Store**: Social features and shared wallet management

### Plugin System

The application uses a layered plugin architecture for service integration:

#### **Blockchain Layer**

- **Chronik Client Plugin** (`plugins/02.chronik.client.ts`): WebSocket blockchain client with real-time updates, subscription management, and connection state tracking.

#### **Networking Layer**

- **P2P Coordinator Plugin** (`plugins/04.p2p.client.ts`): libp2p-based peer networking, service discovery, presence management, and DHT operations.

#### **Cryptography Layer**

- **MuSig2 Plugin** (`plugins/05.musig2.client.ts`): Multi-signature transaction coordination with session management and participant communication.
- **Crypto Worker Plugin** (`plugins/crypto-worker.client.ts`): Web Worker integration for cryptographic operations to maintain UI responsiveness.

### Service Worker Architecture

The PWA service worker provides comprehensive background capabilities:

#### **Core Modules**

- **Network Monitor** (`service-worker/modules/network-monitor.ts`): Blockchain connectivity monitoring, WebSocket reconnection, and data synchronization.
- **Session Monitor** (`service-worker/modules/session-monitor.ts`): MuSig2 session lifecycle management, expiry tracking, and cleanup operations.
- **State Sync** (`service-worker/modules/state-sync.ts`): IndexedDB-based state persistence, cross-tab synchronization, and offline data caching.
- **Push Notifications** (`service-worker/modules/push-notifications.ts`): Transaction alerts, system notifications, and user engagement features.

#### **Message Handling**

The service worker handles various message types:

- Network monitoring control (`START_MONITORING`, `STOP_MONITORING`)
- Session management (`REGISTER_SESSION`, `UNREGISTER_SESSION`)
- State synchronization (`CACHE_STATE`, `GET_CACHED_STATE`)
- Push notification setup and click handling

### P2P & Service Discovery

#### **libp2p Integration**

- Uses `xpi-p2p-ts` for browser-compatible P2P networking
- Connects to Lotusia bootstrap peers for network discovery
- Supports multiple service types: wallet, signer, relay, exchange

#### **Service Advertisement**

- Wallet capabilities are broadcast to the P2P network
- Service templates support MuSig2, threshold signing, and other advanced features
- Presence management with TTL and automatic renewal

#### **Discovery Mechanisms**

- DHT-based service discovery with protocol-specific queries
- Local caching for improved performance and offline capability
- Integration with contact system for saving discovered services

### Multi-signature Architecture

#### **MuSig2 Implementation**

- Full BIP-340 compatible MuSig2 multi-signature support
- Session-based coordination with participant management
- Real-time signing status updates and notifications

#### **Shared Wallet Management**

- Participant tracking with contact integration
- Transaction coordination via P2P network
- Flexible threshold schemes (2-of-3, 3-of-5, etc.)

### Address Types & Cryptography

#### **Taproot Support**

- Default address type is P2TR (Taproot) for improved privacy and lower fees
- Fallback support for legacy P2PKH addresses
- Lotus-specific extensions including SIGHASH_LOTUS and state support

#### **Key Management**

- Hierarchical deterministic (HD) wallet with BIP-44 derivation
- Separate account paths for different purposes (wallet, MuSig2, etc.)
- Secure key storage with runtime-only private key access

## Configuration

Runtime configuration can be set via environment variables:

```env
NUXT_PUBLIC_CHRONIK_URL=https://chronik.lotusia.org
NUXT_PUBLIC_RANK_API_URL=https://rank.lotusia.org/api/v1
NUXT_PUBLIC_EXPLORER_URL=https://lotusia.org/explorer
```

**Note**: Network-specific URLs are primarily managed by the `networkStore` for dynamic network switching. These environment variables serve as fallbacks.

## Security

- **Client-side Security**: Seed phrases stored in browser localStorage (hot wallet model). Protect your OS user profile.
- **Private Key Isolation**: Private keys never leave the browser and are only accessible in runtime memory.
- **Network Security**: All blockchain operations performed client-side via Chronik WebSocket connections.
- **P2P Security**: libp2p networking with encrypted peer communications and service authentication.
- **Multi-signature Protection**: MuSig2 coordination with participant verification and session management.

## Development Guidelines

### Store Access Patterns

- **Components**: Use composables (`useWallet()`, `useP2PCoordinator()`, etc.) for reactive access
- **Store-to-Store**: Import stores directly for inter-store communication
- **Plugins**: Use plugin getter functions for service access (not composables)

### Browser Compatibility Considerations

- **Polyfills**: Comprehensive Node.js polyfills configured in `nuxt.config.ts`
- **Web Workers**: Cryptographic operations offloaded to maintain UI responsiveness
- **Memory Management**: Use `markRaw()` for runtime objects to prevent Vue reactivity overhead

### P2P Development

- **Service Types**: Support for wallet, signer, relay, and exchange services
- **Protocol Handling**: DHT-based discovery with protocol-specific queries
- **Presence Management**: Automatic TTL renewal and graceful disconnection

## Implementation Details

### Plugin Architecture Pattern

The wallet uses a sophisticated plugin system to manage browser compatibility and service dependencies:

1. **Chronik Client Plugin** (`plugins/02.chronik.client.ts`)

   - Lazy initialization with network configuration
   - WebSocket subscription management
   - Connection state tracking and reconnection logic

2. **P2P Coordinator Plugin** (`plugins/04.p2p.client.ts`)

   - libp2p node lifecycle management
   - Service discovery and advertisement
   - Peer connection management

3. **MuSig2 Plugin** (`plugins/05.musig2.client.ts`)
   - Multi-signature session coordination
   - Participant communication via P2P network
   - Transaction building and signing workflows

### Composable Patterns

The application provides 30+ specialized composables for different concerns:

- **Blockchain**: `useChronikClient()`, `useTransactionBuilder()`, `useExplorerApi()`
- **P2P**: `useP2PCoordinator()`, `useMuSig2()`, `useDiscoveryCache()`
- **UI**: `useOverlays()`, `useNotifications()`, `useClipboard()`
- **Utilities**: `useAddress()`, `useAmount()`, `useQRCode()`

### Service Worker Integration

The PWA service worker enables advanced background capabilities:

- **Network Monitoring**: Blockchain connectivity and WebSocket reconnection
- **Session Management**: MuSig2 session lifecycle and expiry tracking
- **State Synchronization**: IndexedDB-based persistence and cross-tab sync
- **Push Notifications**: Transaction alerts and system notifications

### Multi-signature Workflows

MuSig2 multi-signature transactions follow this flow:

1. **Shared Wallet Creation**: Generate MuSig2 public key and distribute to participants
2. **Participant Management**: Add contacts as wallet participants with roles
3. **Transaction Proposal**: Create transaction with partial signatures
4. **Coordination**: Use P2P network for secure communication between participants
5. **Signing**: Collect partial signatures and broadcast final transaction

### Address Format Support

The wallet supports multiple address types with automatic detection:

- **Taproot (P2TR)**: Default modern address type with improved privacy
- **P2PKH**: Legacy address type for compatibility
- **Network Detection**: Automatic mainnet/testnet address validation
- **Format Conversion**: XAddress parsing and display formatting

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Development Setup

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev`
4. **Run tests**: `npm run test` (when available)
5. **Lint code**: `npm run lint`
6. **Type check**: `npm run typecheck`

### Code Style

- **TypeScript**: Strict mode enabled with comprehensive type definitions
- **Vue 3**: Composition API preferred with `<script setup>` syntax
- **ESLint**: Configured with TypeScript and Vue rules
- **Prettier**: Code formatting with consistent style

### Architecture Guidelines

- **Plugin Pattern**: Use plugins for service integration and browser compatibility
- **Composable Pattern**: Create reusable composables for complex logic
- **Store Pattern**: Use Pinia stores with clear separation of concerns
- **Type Safety**: Comprehensive TypeScript types in `/types` directory

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Lotusia Website](https://lotusia.org)
- [Documentation](https://lotusia.org/docs)
- [GitHub Repository](https://github.com/LotusiaStewardship/lotus-web-wallet)
- [Chronik API](https://chronik.lotusia.org)
- [Explorer](https://lotusia.org/explorer)

## Current Status

This is a production-ready P2P cryptocurrency wallet with advanced features:

- ✅ **Core wallet functionality**: Send, receive, balance tracking
- ✅ **P2P networking**: Service discovery and peer communication
- ✅ **Multi-signature support**: MuSig2 shared wallets
- ✅ **Real-time updates**: WebSocket blockchain monitoring
- ✅ **Modern UI**: Responsive design with accessibility features
- ✅ **PWA capabilities**: Service worker with background operations
- ✅ **Cross-platform**: Desktop and mobile browser support

The wallet is actively maintained and regularly updated with new features and improvements.
