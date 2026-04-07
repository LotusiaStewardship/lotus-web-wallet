#!/usr/bin/env node
/**
 * Build script to generate protobuf types from .proto files
 * 
 * Run: node scripts/build-protos.mjs
 * 
 * This script:
 * 1. Generates protos.js (JavaScript runtime) from proto files
 * 2. Generates protos.d.ts (TypeScript definitions) from proto files
 * 3. Generates type wrapper files in utils/types/cashweb/
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const protoDir = join(rootDir, 'utils', 'cashweb', 'proto')
const typesDir = join(rootDir, 'utils', 'types', 'cashweb')

const protoFiles = [
  'relay.proto',
  'stealth.proto',
  'metadata.proto',
  'payload.proto',
  'filters.proto',
  'p2pkh.proto',
  'broadcast.proto',
  'paymentrequest.proto'
]

console.log('=== Building CashWeb Protobuf Types ===\n')

// Verify proto files exist
const missingFiles = protoFiles.filter(f => !existsSync(join(protoDir, f)))
if (missingFiles.length > 0) {
  console.error('ERROR: Missing proto files:', missingFiles)
  process.exit(1)
}

// Step 1: Generate protos.js
console.log('Step 1: Generating protos.js...')
const jsOutPath = join(rootDir, 'utils', 'cashweb', 'protos.js')
execSync(
  `npx pbjs -t static-module -w commonjs -o "${jsOutPath}" ${protoFiles.map(f => join(protoDir, f)).join(' ')}`,
  { cwd: rootDir, stdio: 'inherit' }
)
console.log('✓ Generated protos.js\n')

// Step 2: Generate protos.d.ts
console.log('Step 2: Generating protos.d.ts...')
const dtsOutPath = join(rootDir, 'utils', 'cashweb', 'protos.d.ts')
execSync(
  `npx pbts -o "${dtsOutPath}" "${jsOutPath}"`,
  { cwd: rootDir, stdio: 'inherit' }
)
console.log('✓ Generated protos.d.ts\n')

// Step 3: Generate type wrappers
console.log('Step 3: Generating type wrappers...')
generateTypeWrappers()
console.log('✓ Generated type wrappers\n')

console.log('=== Build Complete ===')

// ============================================================================
// Type Wrapper Generator
// ============================================================================

function generateTypeWrappers() {
  // Read the generated d.ts to extract namespace info
  const dtsContent = readFileSync(dtsOutPath, 'utf-8')
  
  // Extract namespaces and their types
  const namespaces = extractNamespaces(dtsContent)
  
  // Generate wrapper files for each namespace
  for (const [nsName, types] of Object.entries(namespaces)) {
    if (['relay', 'stealth', 'keyserver', 'wrapper', 'filters', 'p2pkh', 'broadcast'].includes(nsName)) {
      generateWrapperFile(nsName, types)
    }
  }
  
  // Generate index.ts
  generateIndexFile(Object.keys(namespaces))
}

function extractNamespaces(content) {
  const namespaces = {}
  
  // Match namespace blocks
  const nsRegex = /export namespace (\w+)\s*\{[\s\S]*?(?=\nexport|\n$)/g
  let match
  
  while ((match = nsRegex.exec(content)) !== null) {
    const nsName = match[1]
    const nsContent = match[0]
    
    // Extract interface names
    const interfaceRegex = /interface (I\w+)/g
    const interfaces = []
    let ifaceMatch
    
    while ((ifaceMatch = interfaceRegex.exec(nsContent)) !== null) {
      interfaces.push(ifaceMatch[1])
    }
    
    // Extract class names (excluding namespace name prefix)
    const classRegex = /class (\w+)/g
    const classes = []
    let classMatch
    
    while ((classMatch = classRegex.exec(nsContent)) !== null) {
      if (classMatch[1] !== nsName) {
        classes.push(classMatch[1])
      }
    }
    
    namespaces[nsName] = { interfaces, classes }
  }
  
  return namespaces
}

function generateWrapperFile(nsName, types) {
  const fileName = nsName === 'keyserver' ? 'metadata' : nsName
  const filePath = join(typesDir, `${fileName}.ts`)
  
  let content = `/**
 * CashWeb ${nsName === 'keyserver' ? 'Metadata' : nsName.charAt(0).toUpperCase() + nsName.slice(1)} Types
 * 
 * Type wrappers for ${nsName}.proto protobuf definitions.
 * These provide convenient TypeScript types for ${nsName === 'keyserver' ? 'metadata' : nsName} operations.
 */

import type { ${nsName} } from '~/utils/cashweb/protos'

// Re-export protobuf interfaces for external use
export type {
  ${nsName}
}
`

  // Add interface exports
  if (types.interfaces.length > 0) {
    content += '\n// Interface types\n'
    for (const iface of types.interfaces) {
      content += `export type ${iface} = ${nsName}.${iface}\n`
    }
  }
  
  // Add helper types based on namespace
  content += generateHelperTypes(nsName)
  
  writeFileSync(filePath, content)
  console.log(`  ✓ Generated ${fileName}.ts`)
}

function generateHelperTypes(nsName) {
  let helpers = '\n// Helper types\n'
  
  switch (nsName) {
    case 'relay':
      helpers += `export type EncryptionScheme = relay.Message.EncryptionScheme

export type PayloadEntryKind = 
  | 'text-utf8'
  | 'stealth-payment'
  | 'image'
  | 'vcard'
  | 'public-profile'
  | 'json'

export interface ParsedMessage {
  sourcePublicKey: Uint8Array
  destinationPublicKey: Uint8Array
  payload: Uint8Array
  payloadDigest: Uint8Array
  timestamp: number
  scheme: EncryptionScheme
}

export interface MessageFilter {
  sourcePublicKey?: Uint8Array
  destinationPublicKey?: Uint8Array
  since?: number
  until?: number
  limit?: number
}
`
      break
      
    case 'stealth':
      helpers += `export interface StealthAddressInfo {
  ephemeralPubKey: Uint8Array
  stealthTx: Uint8Array
  vouts: number[]
}

export interface ParsedStealthPayment extends StealthPaymentEntry {
  txid?: string
  totalAmount?: bigint
}
`
      break
      
    case 'keyserver':
      helpers += `export interface ProfileMetadata {
  name?: string
  avatar?: string
  bio?: string
  pubkey?: string
  peers?: string[]
}

export interface ParsedMetadataEntry {
  kind: string
  value: string
  headers?: Record<string, string>
}
`
      break
      
    case 'wrapper':
      helpers += `export interface VerifiedSignedPayload {
  payload: SignedPayload
  isValid: boolean
  publicKey: Uint8Array
}

export interface PayloadSigningOptions {
  privateKey: Uint8Array
  scheme?: 'schnorr' | 'ecdsa'
  payload: Uint8Array
}
`
      break
      
    case 'filters':
      helpers += `export interface FilterOptions {
  minAcceptancePrice?: bigint
  minNotificationPrice?: bigint
  isPublic?: boolean
}
`
      break
      
    case 'p2pkh':
      helpers += `export interface P2PKHPaymentDetails {
  transaction: Uint8Array
  amount?: bigint
}
`
      break
      
    case 'broadcast':
      helpers += `export interface ParsedForumPost {
  title?: string
  url?: string
  message?: string
  timestamp: number
  topic?: string
}
`
      break
  }
  
  return helpers
}

function generateIndexFile(namespaces) {
  const filePath = join(typesDir, 'index.ts')
  
  const namespaceToFile = {
    relay: 'relay',
    stealth: 'stealth',
    keyserver: 'metadata',
    wrapper: 'signed-payload',
    filters: 'filters',
    p2pkh: 'p2pkh',
    broadcast: 'broadcast'
  }
  
  let content = `/**
 * CashWeb Types Index
 * 
 * Central export file for all CashWeb protocol types.
 * This provides a single import point for all CashWeb type definitions.
 * 
 * AUTO-GENERATED - Do not edit manually
 */

`
  
  for (const [ns, file] of Object.entries(namespaceToFile)) {
    content += `// Re-export all ${ns} types\nexport * from './${file}'\n\n`
  }
  
  content += `// Re-export protobuf root for advanced usage\nexport { relay, stealth, keyserver, wrapper, filters, p2pkh, broadcast, bip70 } from '~/utils/cashweb/protos'\n`
  
  writeFileSync(filePath, content)
  console.log('  ✓ Generated index.ts')
}
