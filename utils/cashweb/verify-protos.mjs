/**
 * Simple protobuf verification script
 * Run with: node utils/cashweb/verify-protos.mjs
 */

import protobuf from 'protobufjs'

/**
 * List of protobuf definition files to verify
 * @type {string[]}
 */
const PROTO_FILES = [
  'utils/cashweb/proto/relay.proto',
  'utils/cashweb/proto/stealth.proto',
  'utils/cashweb/proto/metadata.proto',
  'utils/cashweb/proto/payload.proto',
  'utils/cashweb/proto/filters.proto',
  'utils/cashweb/proto/p2pkh.proto',
  'utils/cashweb/proto/broadcast.proto',
]

async function verifyProtos() {
  console.log('=== CashWeb Protobuf Verification ===\n')

  try {
    // Load proto files
    console.log('Loading proto files...')
    const root = await protobuf.load(PROTO_FILES)

    console.log('✓ Proto files loaded successfully\n')

    // Test 1: Payload
    console.log('Test 1: relay.Payload')
    const Payload = root.lookupType('relay.Payload')
    const payload = Payload.create({
      timestamp: Date.now(),
      entries: [
        {
          kind: 'text-utf8',
          headers: [{ name: 'content-type', value: 'text/plain' }],
          body: Buffer.from('Hello, CashWeb!'),
        },
      ],
    })
    const payloadBuffer = Payload.encode(payload).finish()
    const payloadDecoded = Payload.decode(payloadBuffer)
    console.log(`  Encoded: ${payloadBuffer.length} bytes`)
    console.log(`  Decoded: ${payloadDecoded.entries.length} entry`)
    console.log(`  ✓ PASSED\n`)

    // Test 2: Message
    console.log('Test 2: relay.Message')
    const Message = root.lookupType('relay.Message')
    const message = Message.create({
      sourcePublicKey: Buffer.alloc(33, 1),
      destinationPublicKey: Buffer.alloc(33, 2),
      receivedTime: Date.now(),
      payloadDigest: Buffer.alloc(32, 3),
      scheme: 1, // EPHEMERALDH
      salt: Buffer.alloc(16, 4),
      payloadHmac: Buffer.alloc(32, 5),
      payloadSize: 100,
      payload: Buffer.alloc(100, 6),
    })
    const messageBuffer = Message.encode(message).finish()
    const messageDecoded = Message.decode(messageBuffer)
    console.log(`  Encoded: ${messageBuffer.length} bytes`)
    console.log(`  Decoded scheme: ${messageDecoded.scheme}`)
    console.log(`  ✓ PASSED\n`)

    // Test 3: StealthPaymentEntry
    console.log('Test 3: stealth.StealthPaymentEntry')
    const StealthPaymentEntry = root.lookupType('stealth.StealthPaymentEntry')
    const stealthPayment = StealthPaymentEntry.create({
      ephemeralPubKey: Buffer.alloc(33, 7),
      outpoints: [
        {
          stealthTx: Buffer.alloc(32, 8),
          vouts: [0, 1],
        },
      ],
    })
    const stealthBuffer = StealthPaymentEntry.encode(stealthPayment).finish()
    const stealthDecoded = StealthPaymentEntry.decode(stealthBuffer)
    console.log(`  Encoded: ${stealthBuffer.length} bytes`)
    console.log(`  Decoded outpoints: ${stealthDecoded.outpoints?.length || 0}`)
    console.log(`  ✓ PASSED\n`)

    // Test 4: AddressMetadata
    console.log('Test 4: keyserver.AddressMetadata')
    const AddressMetadata = root.lookupType('keyserver.AddressMetadata')
    const metadata = AddressMetadata.create({
      timestamp: Date.now(),
      ttl: 86400,
      entries: [
        {
          kind: 'name',
          body: Buffer.from('Alice'),
        },
      ],
    })
    const metadataBuffer = AddressMetadata.encode(metadata).finish()
    const metadataDecoded = AddressMetadata.decode(metadataBuffer)
    console.log(`  Encoded: ${metadataBuffer.length} bytes`)
    console.log(`  Decoded TTL: ${metadataDecoded.ttl}`)
    console.log(`  ✓ PASSED\n`)

    // Test 5: SignedPayload
    console.log('Test 5: wrapper.SignedPayload')
    const SignedPayload = root.lookupType('wrapper.SignedPayload')
    const signedPayload = SignedPayload.create({
      publicKey: Buffer.alloc(33, 9),
      signature: Buffer.alloc(64, 10),
      payload: Buffer.alloc(100, 11),
      scheme: 0,
    })
    const signedBuffer = SignedPayload.encode(signedPayload).finish()
    const signedDecoded = SignedPayload.decode(signedBuffer)
    console.log(`  Encoded: ${signedBuffer.length} bytes`)
    console.log(`  Decoded signature length: ${signedDecoded.signature.length}`)
    console.log(`  ✓ PASSED\n`)

    console.log('=== All Tests Passed! ===')
    return true
  } catch (error) {
    console.error('✗ ERROR:', error.message)
    return false
  }
}

verifyProtos().then(success => {
  process.exit(success ? 0 : 1)
})
