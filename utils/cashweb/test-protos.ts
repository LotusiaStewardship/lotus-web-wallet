/**
 * Protobuf Serialization/Deserialization Test
 * 
 * This file provides a simple test to verify that protobuf types
 * can be properly serialized and deserialized.
 */

import { relay, stealth, keyserver, wrapper } from './protos'

/**
 * Test relay Payload serialization/deserialization
 */
export function testPayloadSerialization() {
  console.log('Testing Payload serialization...')
  
  // Create a sample payload
  const payload = relay.Payload.create({
    timestamp: Date.now(),
    entries: [
      {
        kind: 'text-utf8',
        headers: [
          { name: 'content-type', value: 'text/plain' }
        ],
        body: new TextEncoder().encode('Hello, CashWeb!')
      }
    ]
  })
  
  // Serialize
  const serialized = relay.Payload.encode(payload).finish()
  console.log('Serialized payload:', serialized.length, 'bytes')
  
  // Deserialize
  const deserialized = relay.Payload.decode(serialized)
  console.log('Deserialized payload timestamp:', deserialized.timestamp)
  console.log('Deserialized payload entries:', deserialized.entries?.length)
  
  // Verify
  const success = 
    deserialized.timestamp === payload.timestamp &&
    deserialized.entries?.length === 1 &&
    deserialized.entries[0].kind === 'text-utf8'
  
  console.log('Payload test:', success ? '✓ PASSED' : '✗ FAILED')
  return success
}

/**
 * Test relay Message serialization/deserialization
 */
export function testMessageSerialization() {
  console.log('\nTesting Message serialization...')
  
  // Create a sample message
  const message = relay.Message.create({
    sourcePublicKey: new Uint8Array(33).fill(1),
    destinationPublicKey: new Uint8Array(33).fill(2),
    receivedTime: Date.now(),
    payloadDigest: new Uint8Array(32).fill(3),
    scheme: relay.Message.EncryptionScheme.EphemeralDH,
    salt: new Uint8Array(16).fill(4),
    payloadHmac: new Uint8Array(32).fill(5),
    payloadSize: 100,
    payload: new Uint8Array(100).fill(6)
  })
  
  // Serialize
  const serialized = relay.Message.encode(message).finish()
  console.log('Serialized message:', serialized.length, 'bytes')
  
  // Deserialize
  const deserialized = relay.Message.decode(serialized)
  console.log('Deserialized message scheme:', deserialized.scheme)
  console.log('Deserialized message payload size:', deserialized.payloadSize)
  
  // Verify
  const success = 
    deserialized.receivedTime === message.receivedTime &&
    deserialized.scheme === relay.Message.EncryptionScheme.EphemeralDH &&
    deserialized.payloadSize === 100
  
  console.log('Message test:', success ? '✓ PASSED' : '✗ FAILED')
  return success
}

/**
 * Test stealth StealthPaymentEntry serialization/deserialization
 */
export function testStealthPaymentSerialization() {
  console.log('\nTesting StealthPaymentEntry serialization...')
  
  // Create a sample stealth payment entry
  const entry = stealth.StealthPaymentEntry.create({
    ephemeralPubKey: new Uint8Array(33).fill(7),
    outpoints: [
      {
        stealthTx: new Uint8Array(32).fill(8),
        vouts: [0, 1]
      }
    ]
  })
  
  // Serialize
  const serialized = stealth.StealthPaymentEntry.encode(entry).finish()
  console.log('Serialized stealth payment:', serialized.length, 'bytes')
  
  // Deserialize
  const deserialized = stealth.StealthPaymentEntry.decode(serialized)
  console.log('Deserialized stealth payment outpoints:', deserialized.outpoints?.length)
  
  // Verify
  const success = 
    deserialized.outpoints?.length === 1 &&
    deserialized.outpoints[0].vouts?.length === 2
  
  console.log('Stealth payment test:', success ? '✓ PASSED' : '✗ FAILED')
  return success
}

/**
 * Test keyserver AddressMetadata serialization/deserialization
 */
export function testMetadataSerialization() {
  console.log('\nTesting AddressMetadata serialization...')
  
  // Create a sample metadata
  const metadata = keyserver.AddressMetadata.create({
    timestamp: Date.now(),
    ttl: 86400,
    entries: [
      {
        kind: 'name',
        headers: [],
        body: new TextEncoder().encode('Alice')
      },
      {
        kind: 'avatar',
        headers: [],
        body: new TextEncoder().encode('https://example.com/avatar.png')
      }
    ]
  })
  
  // Serialize
  const serialized = keyserver.AddressMetadata.encode(metadata).finish()
  console.log('Serialized metadata:', serialized.length, 'bytes')
  
  // Deserialize
  const deserialized = keyserver.AddressMetadata.decode(serialized)
  console.log('Deserialized metadata entries:', deserialized.entries?.length)
  console.log('Deserialized metadata TTL:', deserialized.ttl)
  
  // Verify
  const success = 
    deserialized.ttl === 86400 &&
    deserialized.entries?.length === 2
  
  console.log('Metadata test:', success ? '✓ PASSED' : '✗ FAILED')
  return success
}

/**
 * Test wrapper SignedPayload serialization/deserialization
 */
export function testSignedPayloadSerialization() {
  console.log('\nTesting SignedPayload serialization...')
  
  // Create a sample signed payload
  const signedPayload = wrapper.SignedPayload.create({
    publicKey: new Uint8Array(33).fill(9),
    signature: new Uint8Array(64).fill(10),
    payload: new Uint8Array(100).fill(11),
    scheme: 0
  })
  
  // Serialize
  const serialized = wrapper.SignedPayload.encode(signedPayload).finish()
  console.log('Serialized signed payload:', serialized.length, 'bytes')
  
  // Deserialize
  const deserialized = wrapper.SignedPayload.decode(serialized)
  console.log('Deserialized signed payload scheme:', deserialized.scheme)
  
  // Verify
  const success = 
    deserialized.scheme === 0 &&
    deserialized.publicKey?.length === 33 &&
    deserialized.signature?.length === 64
  
  console.log('Signed payload test:', success ? '✓ PASSED' : '✗ FAILED')
  return success
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('=== CashWeb Protobuf Serialization Tests ===\n')
  
  const results = [
    testPayloadSerialization(),
    testMessageSerialization(),
    testStealthPaymentSerialization(),
    testMetadataSerialization(),
    testSignedPayloadSerialization()
  ]
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log(`\n=== Test Results: ${passed}/${total} passed ===`)
  
  return passed === total
}

// Allow running from Node.js for testing
if (typeof process !== 'undefined' && process.argv[1] === new URL(import.meta.url).pathname) {
  runAllTests()
}
