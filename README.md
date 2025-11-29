# Lotus Web Wallet

The key to the Lotusia ecosystem - A feature-rich P2P wallet with service discovery.

## Features

- **Wallet Management**: Send and receive Lotus (XPI) with a modern, intuitive interface
- **P2P Discovery**: Discover and connect with other wallets and services on the network
- **Service Advertisements**: Advertise your services (wallet, signer, relay, exchange) to the P2P network
- **MuSig2 Support**: Multi-signature transaction support via the lotus-sdk
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
├── app.vue              # Main app component
├── nuxt.config.ts       # Nuxt configuration with Node.js polyfills
├── assets/
│   └── css/main.css     # Tailwind CSS and Nuxt UI Pro imports
├── layouts/
│   └── default.vue      # Main dashboard layout
├── pages/
│   ├── index.vue        # Wallet home/dashboard
│   ├── send.vue         # Send Lotus page
│   ├── receive.vue      # Receive Lotus page
│   ├── discover.vue     # P2P service discovery
│   └── settings/        # Settings pages
├── stores/
│   ├── wallet.ts        # Wallet state management (dynamic lotus-sdk imports)
│   └── p2p.ts           # P2P network state
├── stubs/
│   └── dotenv.js        # Browser stub for dotenv module
└── components/          # Reusable components
```

## Configuration

Runtime configuration can be set via environment variables:

```env
NUXT_PUBLIC_CHRONIK_URL=https://chronik.lotusia.org
NUXT_PUBLIC_RANK_API_URL=https://rank-beta.lotusia.org/api/v1
NUXT_PUBLIC_EXPLORER_URL=https://explorer.lotusia.org
```

## Security

- Seed phrases are stored in browser localStorage (encrypted in production)
- Private keys never leave the browser
- All blockchain operations are performed client-side

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Lotusia Website](https://lotusia.org)
- [Documentation](https://lotusia.org/docs)
- [GitHub](https://github.com/LotusiaStewardship)
