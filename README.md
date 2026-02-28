# Lotus Web Wallet

A progressive web application for the Lotusia ecosystem with P2P wallet functionality and social reputation features.

## Features

- **Wallet Management**: HD wallet support for Lotus (XPI) with multiple address types
- **Social Feed**: RANK system for content curation and reputation scoring  
- **P2P Discovery**: Peer-to-peer service discovery and communication
- **Real-time Updates**: WebSocket integration for live transaction monitoring
- **Cross-platform**: Works as PWA with offline capabilities

## Technology Stack

- **Framework**: Nuxt 3 with Vue 3 and TypeScript
- **UI**: Nuxt UI Pro with Tailwind CSS
- **State Management**: Pinia stores for wallet, activity, and settings
- **Blockchain**: Chronik client for Lotus network integration
- **Crypto**: xpi-ts and xpi-p2p-ts for cryptographic operations
- **Service Worker**: Background monitoring and caching

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

- `pages/` - Application routes (home, feed, settings, etc.)
- `components/` - Reusable Vue components organized by feature
- `stores/` - Pinia state management for wallet, activity, and UI
- `composables/` - Vue composables for API calls and business logic
- `plugins/` - Nuxt plugins for third-party integrations
- `service-worker/` - Background processing and caching logic

## Key Pages

- **Home** - Wallet dashboard with balance and quick actions
- **Feed** - Social content curation with RANK voting system
- **Activity** - Transaction history and wallet events
- **Settings** - Wallet configuration and preferences

## Development

The wallet uses a service worker for background monitoring and IndexedDB for offline storage. All cryptographic operations are performed in web workers to maintain UI responsiveness.

## License

MIT License - see LICENSE file for details.
