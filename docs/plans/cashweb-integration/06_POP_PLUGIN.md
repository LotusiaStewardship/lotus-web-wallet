# Phase 6: Proof of Publication Plugin

## Objective

Implement the Proof of Publication (PoP) protocol for handling HTTP 402 Payment Required responses from CashWeb services.

**Estimated Effort**: 1 day
**Priority**: P2 (Medium)

---

## Source Files

| Source | Purpose |
|--------|---------|
| `stamp/src/cashweb/pop.ts` | PoP utility functions |
| `stamp/src/cashweb/bip70/proto/paymentrequest.proto` | BIP70 payment request format |

---

## Architecture

PoP enables blockchain-based payment for API access:

1. **402 Response** - Server returns PaymentRequest
2. **Payment Construction** - Client builds transaction
3. **Payment Submission** - Client sends Payment + retry request

---

## Plugin Structure

```
plugins/
└── pop.client.ts
    ├── Payment request parsing
    ├── Payment transaction construction
    └── Request retry with payment
```

---

## Implementation Steps

### Step 1: Create Plugin File

Create `plugins/pop.client.ts`:

```typescript
/**
 * Proof of Publication Plugin
 *
 * Handles HTTP 402 Payment Required responses by constructing
 * and sending blockchain payments to CashWeb services.
 *
 * Access Patterns:
 * - Other plugins: useNuxtApp().$pop
 * - Stores: Import getter functions directly
 *
 * Dependencies:
 * - wallet store (for UTXOs and signing)
 * - chronik plugin (for broadcasting)
 */
export default defineNuxtPlugin({
  name: 'pop',
  dependsOn: ['chronik', 'bitcore'],
  setup() {
    // ... implementation
  }
})
```

### Step 2: Implement Core Methods

```typescript
/**
 * Parse a BIP70 payment request from 402 response
 */
function parsePaymentRequest(response: FetchResponse): PaymentRequest {
  const body = response._data
  return PaymentRequest.deserializeBinary(body)
}

/**
 * Construct a payment transaction
 */
async function constructPayment(
  request: PaymentRequest,
  wallet: WalletStore,
): Promise<{ transaction: Transaction; payment: Payment }> {
  const outputs = request.outputsList.map(output => ({
    address: Address.fromBuffer(Buffer.from(output.address)),
    satoshis: Number(output.amount),
  }))

  const totalAmount = outputs.reduce((sum, o) => sum + o.satoshis, 0)
  
  // Use wallet's transaction builder
  const { transaction, usedUtxos } = await wallet.constructTransaction({
    outputs,
    feeRate: 2, // satoshis/byte
  })

  // Construct Payment message
  const payment: Payment = {
    merchantData: request.merchantData,
    transactions: [transaction.toBuffer()],
    refundTo: [{
      address: wallet.getAddress().toBuffer(),
    }],
    memo: 'Payment for API access',
  }

  return { transaction, payment }
}

/**
 * Send payment and retry original request
 */
async function sendPayment(
  request: PaymentRequest,
  originalRequest: { url: string; method: string; body?: any },
): Promise<any> {
  const wallet = useWalletStore()
  const chronik = useNuxtApp().$chronik

  // Construct payment transaction
  const { transaction, payment } = await constructPayment(request, wallet)

  // Broadcast transaction
  await chronik.broadcastTransaction(transaction.toString())

  // Retry original request with payment
  const response = await $fetch.raw(originalRequest.url, {
    method: originalRequest.method,
    body: originalRequest.body,
    headers: {
      'X-Payment': Buffer.from(payment.serializeBinary()).toString('base64'),
    },
  })

  return response._data
}

/**
 * Handle 402 response automatically
 */
async function handle402(
  error: any,
  originalRequest: { url: string; method: string; body?: any },
): Promise<any> {
  if (error.statusCode !== 402) {
    throw error
  }

  const request = parsePaymentRequest(error.response)
  return sendPayment(request, originalRequest)
}
```

### Step 3: Create Wrapper for Paid Requests

```typescript
/**
 * Make a request that may require payment
 */
async function paidFetch<T>(
  url: string,
  options?: FetchOptions,
): Promise<T> {
  try {
    return await $fetch(url, options)
  } catch (error: any) {
    if (error.statusCode === 402) {
      return handle402(error, {
        url,
        method: options?.method || 'GET',
        body: options?.body,
      })
    }
    throw error
  }
}
```

---

## Type Definitions

```typescript
// utils/types/cashweb/pop.ts

export interface PaymentRequest {
  version: number
  pkiType: string
  pkiData: Uint8Array
  merchantData: Uint8Array
  timestamp: number
  paymentExpires: number
  memo: string
  outputsList: PaymentOutput[]
}

export interface PaymentOutput {
  amount: string
  address: Uint8Array
  script: Uint8Array
}

export interface Payment {
  merchantData: Uint8Array
  transactions: Uint8Array[]
  refundTo: { address: Uint8Array }[]
  memo: string
}
```

---

## Integration Points

### Registry Plugin

The registry plugin uses PoP when profile updates require payment:

```typescript
// In registry plugin
const response = await $pop.paidFetch(`${registryUrl}/v1/metadata/${address}`, {
  method: 'PUT',
  body: signedPayload,
})
```

### Relay Plugin

The relay plugin may use PoP for premium features (future).

---

## Verification

### Unit Tests

1. **Payment Request Parsing**: Parse sample BIP70 response
2. **Payment Construction**: Build transaction from request
3. **402 Handling**: Mock 402 response, verify payment flow

### Integration Tests

1. **Paid Profile Update**: Update profile requiring payment

---

## Dependencies

- `xpi-ts`: For transaction construction
- BIP70 protobuf types (from Phase 1)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Insufficient balance | Check balance before payment, show error to user |
| Payment timeout | Handle payment expiration gracefully |
| Double payment | Track pending payments, avoid duplicates |

---

## Completion Criteria

- [ ] Plugin file created at `plugins/pop.client.ts`
- [ ] Payment request parsing implemented
- [ ] Payment transaction construction implemented
- [ ] 402 handling wrapper implemented
- [ ] Type definitions created
- [ ] Unit tests pass
- [ ] Integration with registry plugin verified
