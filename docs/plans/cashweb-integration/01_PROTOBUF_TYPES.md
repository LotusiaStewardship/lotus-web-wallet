# Phase 1: Protobuf Type Definitions

## Objective

Migrate protobuf definitions from `stamp/src/cashweb/` to `lotus-web-wallet/utils/cashweb/` and generate TypeScript type definitions.

**Estimated Effort**: 1-2 days
**Priority**: P0 (Blocking)

---

## Source Files

| Source                                                 | Target                                     | Purpose                        |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------ |
| `stamp/src/cashweb/relay/proto/relay.proto`            | `utils/cashweb/proto/relay.proto`          | Message, Payload, PayloadEntry |
| `stamp/src/cashweb/relay/proto/stealth.proto`          | `utils/cashweb/proto/stealth.proto`        | StealthPaymentEntry            |
| `stamp/src/cashweb/relay/proto/p2pkh.proto`            | `utils/cashweb/proto/p2pkh.proto`          | P2PKH payment entries          |
| `stamp/src/cashweb/relay/proto/filters.proto`          | `utils/cashweb/proto/filters.proto`        | Message filters                |
| `stamp/src/cashweb/registry/proto/metadata.proto`      | `utils/cashweb/proto/metadata.proto`       | Profile metadata               |
| `stamp/src/cashweb/registry/proto/broadcast.proto`     | `utils/cashweb/proto/broadcast.proto`      | Forum broadcasts               |
| `stamp/src/cashweb/signed_payload/proto/payload.proto` | `utils/cashweb/proto/payload.proto`        | SignedPayload wrapper          |
| `stamp/src/cashweb/bip70/proto/paymentrequest.proto`   | `utils/cashweb/proto/paymentrequest.proto` | BIP70 (optional)               |

---

## Implementation Steps

### Step 1: Create Directory Structure

```bash
mkdir -p utils/cashweb/proto
mkdir -p utils/types/cashweb
```

### Step 2: Copy Proto Files

Copy all `.proto` files from stamp repository to `utils/cashweb/proto/`.

### Step 3: Generate TypeScript Types

Using `protobufjs-cli`:

```bash
npx pbjs -t static-module -w commonjs -o utils/cashweb/protos.js utils/cashweb/proto/*.proto
npx pbts -o utils/cashweb/protos.d.ts utils/cashweb/protos.js
```

### Step 4: Create Type Wrappers

Create TypeScript type wrappers in `utils/types/cashweb/`:

```
utils/types/cashweb/
├── relay.ts        # Message, Payload, PayloadEntry types
├── stealth.ts      # StealthPaymentEntry types
├── metadata.ts     # ProfileMetadata types
├── signed-payload.ts # SignedPayload types
└── index.ts        # Re-exports
```

---

## Key Types to Define

### Relay Types

```typescript
// utils/types/cashweb/relay.ts

export interface Message {
  sourceAddress: string
  destinationAddress: string
  payloadDigest: Buffer
  payloadSignature: Buffer
  stampAmount: bigint
  stampImages: string[]
}

export interface Payload {
  entries: PayloadEntry[]
  timestamp: number
}

export interface PayloadEntry {
  kind: 'text-utf8' | 'stealth-payment' | 'image' | 'reply' | 'p2pkh'
  body: Uint8Array | string
}

export interface MessageSet {
  messages: Message[]
}
```

### Stealth Types

```typescript
// utils/types/cashweb/stealth.ts

export interface StealthPaymentEntry {
  ephemeralPubKey: Buffer
  outpoints: StealthOutpoint[]
}

export interface StealthOutpoint {
  stealthTx: Buffer
  vouts: number[]
}
```

### Signed Payload Types

```typescript
// utils/types/cashweb/signed-payload.ts

export interface SignedPayload {
  payload: Buffer
  signature: Buffer
  publicKey: Buffer
}
```

---

## Integration Points

### Crypto Worker

The crypto worker needs access to protobuf types for encryption/decryption. Import statically:

```typescript
// workers/crypto.worker.ts
import { Payload, PayloadEntry } from '~/utils/cashweb/protos'
```

### Service Worker

The service worker needs protobuf types for message parsing:

```typescript
// service-worker/modules/relay-sync.ts
import { Message, MessageSet } from '~/utils/cashweb/protos'
```

### Main Thread

Plugins and stores need protobuf types:

```typescript
// plugins/relay.client.ts
import { Message, Payload, SignedPayload } from '~/utils/cashweb/protos'
```

---

## Verification

### Unit Tests

Create tests in `tests/utils/cashweb/`:

1. **Serialization Test**: Verify protobuf serialization matches stamp implementation
2. **Deserialization Test**: Verify protobuf deserialization handles all entry types
3. **Round-trip Test**: Verify serialize → deserialize produces identical data

### Integration Test

Compare serialized output from lotus-web-wallet with stamp for same input data.

---

## Dependencies

- `protobufjs`: ^7.0.0 (for runtime serialization)
- `protobufjs-cli`: ^1.1.0 (for code generation)

---

## Risks

| Risk                               | Mitigation                                         |
| ---------------------------------- | -------------------------------------------------- |
| Proto file drift from stamp        | Copy proto files directly, do not modify           |
| Generated types not tree-shakeable | Use static module format, import only needed types |
| Buffer handling differences        | Use `Buffer` polyfill consistently                 |

---

## Completion Criteria

- [ ] All proto files copied to `utils/cashweb/proto/`
- [ ] TypeScript types generated in `utils/cashweb/protos.d.ts`
- [ ] Type wrappers created in `utils/types/cashweb/`
- [ ] Unit tests pass for serialization/deserialization
- [ ] Types importable from crypto worker, service worker, and main thread
