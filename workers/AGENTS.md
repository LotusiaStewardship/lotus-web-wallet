# Workers Directory AGENTS.md

## Purpose

The `workers/` directory contains Web Workers that offload CPU-intensive operations from the main thread, ensuring UI responsiveness during heavy computations. Currently, this directory houses the crypto worker for cryptographic operations.

## Current Workers

| File               | Responsibility                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crypto.worker.ts` | Offloads mnemonic generation/validation, HD key derivation, transaction signing (ECDSA & Schnorr), message signing/verification, and data hashing |

## Web Worker Patterns

### Initialization

Workers are initialized via Nuxt plugins with the `.client.ts` suffix to ensure browser-only execution:

```typescript
// plugins/crypto-worker.client.ts
workerInstance = new Worker(
  new URL('../workers/crypto.worker.ts', import.meta.url),
  { type: 'module' },
)
```

### Communication Protocol

Workers use a typed message-based API with `postMessage`:

**Request Format:**

```typescript
interface CryptoWorkerRequest {
  type: OperationType
  payload: OperationPayload
  requestId: string // UUID for request/response correlation
}
```

**Response Format:**

```typescript
interface CryptoWorkerResponse {
  type: ResponseType
  payload: ResponsePayload
  requestId: string // Matches the original request
}
```

**Supported Operations:**

- `GENERATE_MNEMONIC` / `MNEMONIC_GENERATED`
- `VALIDATE_MNEMONIC` / `MNEMONIC_VALIDATED`
- `DERIVE_KEYS` / `KEYS_DERIVED`
- `DERIVE_P2TR_COMMITMENT` / `P2TR_COMMITMENT_DERIVED`
- `SIGN_TRANSACTION` / `TRANSACTION_SIGNED`
- `SIGN_MESSAGE` / `MESSAGE_SIGNED`
- `VERIFY_MESSAGE` / `MESSAGE_VERIFIED`
- `HASH_DATA` / `DATA_HASHED`

### Worker Initialization Sequence

1. Plugin creates worker instance
2. Worker loads SDK via static imports
3. Worker posts `WORKER_READY` message with status
4. Plugin maintains request/response bookkeeping with timeouts
5. High-level API functions wrap `postMessage` in Promises

## Best Practices

### DO

- Use `/// <reference lib="webworker" />` directive for proper TypeScript support
- Import dependencies via static imports only (workers cannot access Nuxt plugins)
- Use typed request/response interfaces from `~/utils/types/crypto-worker`
- Include `requestId` in all messages for correlation
- Handle errors gracefully and post error responses back to main thread
- Keep worker code self-contained with no DOM access
- Use `self.postMessage()` for all communication back to main thread
- Define a `WORKER_VERSION` constant and increment when behavior changes

### DON'T

- Access `window`, `document`, or any DOM APIs
- Import from Nuxt-specific modules or plugins
- Use `localStorage`, `sessionStorage`, or cookies
- Make network requests directly from workers (use main thread instead)
- Block the worker with synchronous long-running operations without async handling
- Forget to include `requestId` in responses
- Access Nuxt composables or Vue reactivity inside workers

## Anti-Patterns to Avoid

| Anti-Pattern                      | Why It's Bad                                | Solution                                         |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| DOM access in worker              | Workers run in isolated context             | Move DOM operations to main thread               |
| Direct Nuxt imports               | Workers can't resolve Nuxt aliases          | Use static imports from npm packages             |
| Unhandled promise rejections      | Silent failures in worker                   | Wrap all operations in try/catch, post errors    |
| Missing requestId correlation     | Responses can't be matched to requests      | Always include requestId in request and response |
| Sensitive data in worker messages | Data is serialized and could be intercepted | Minimize sensitive data exposure                 |
| No timeout handling               | Hanging requests block UI                   | Implement request timeouts in plugin layer       |

## Adding New Workers

1. Create worker file: `workers/my-worker.worker.ts`
2. Add `/// <reference lib="webworker" />` directive
3. Define typed request/response interfaces in `~/utils/types/`
4. Implement message handler with `self.onmessage`
5. Create plugin in `plugins/my-worker.client.ts` with lifecycle management
6. Update worker initialization sequence in architecture docs

## Type Definitions

Worker types are centralized in `~/utils/types/crypto-worker.ts`:

- `CryptoWorkerRequest` - Union type of all possible requests
- `CryptoWorkerResponse` - Union type of all possible responses
- `CryptoWorkerStatus` - Worker readiness and capabilities
- Individual payload types for each operation

## Related Documentation

- `docs/architecture/01_CORE_ARCHITECTURE.md` - Crypto worker initialization and plugin system
- `plugins/crypto-worker.client.ts` - Worker lifecycle management and public API
- `~/utils/types/crypto-worker.ts` - TypeScript type definitions
- `~/utils/constants.ts` - BIP44 derivation path constants

## SDK Dependencies

The crypto worker imports directly from `xpi-ts/lib/bitcore`:

```typescript
import {
  Mnemonic,
  HDPrivateKey,
  Networks,
  Address,
  Script,
  Transaction,
  PrivateKey,
  PublicKey,
  tweakPublicKey,
  Message,
  Hash,
  BufferUtil,
} from 'xpi-ts/lib/bitcore'
```

This ensures the worker is self-contained and doesn't depend on Nuxt's module resolution.
