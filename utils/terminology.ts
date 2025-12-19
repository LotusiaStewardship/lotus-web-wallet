/**
 * User-Friendly Terminology
 *
 * Phase 6: Translates technical blockchain terms to user-friendly language.
 * Per 07_HUMAN_CENTERED_UX.md - use plain language, avoid jargon.
 */

/**
 * Mapping of technical terms to user-friendly equivalents
 */
export const userFriendlyTerms: Record<string, string> = {
  // Blockchain concepts
  'utxo': 'coin',
  'utxos': 'coins',
  'satoshi': 'lotus',
  'satoshis': 'lotus',
  'mempool': 'pending transactions',
  'blockheight': 'network status',
  'block height': 'network status',
  'confirmations': 'confirmations',

  // P2P/Network
  'dht': 'network',
  'peerid': 'wallet ID',
  'peer id': 'wallet ID',
  'libp2p': 'peer network',
  'bootstrap': 'connect',
  'relay': 'connection helper',

  // Cryptography
  'publickey': 'public address',
  'public key': 'public address',
  'privatekey': 'secret key',
  'private key': 'secret key',
  'mnemonic': 'recovery phrase',
  'seed phrase': 'recovery phrase',
  'signature': 'authorization',
  'hash': 'identifier',

  // MuSig2/Multi-sig
  'musig2': 'shared wallet',
  'multi-sig': 'shared wallet',
  'multisig': 'shared wallet',
  'signer': 'co-signer',
  'cosigner': 'co-signer',
  'co-signer': 'co-signer',
  'participant': 'member',
  'aggregation': 'combination',
  'key aggregation': 'key combination',
  'nonce': 'signing step',
  'partial signature': 'approval',

  // Transactions
  'txid': 'transaction ID',
  'transaction id': 'transaction ID',
  'input': 'source',
  'output': 'destination',
  'fee': 'network fee',
  'change address': 'return address',
  'broadcast': 'send',

  // Wallet
  'derivation': 'generation',
  'derivation path': 'account path',
  'bip44': 'standard',
  'hd wallet': 'wallet',
  'xpub': 'public wallet key',
}

/**
 * Format a technical term to user-friendly language
 *
 * @param term - The technical term to translate
 * @param showTechnical - If true, returns the original term unchanged
 * @returns User-friendly version of the term
 */
export function formatTechnicalTerm(
  term: string,
  showTechnical: boolean = false,
): string {
  if (showTechnical) return term
  const lowerTerm = term.toLowerCase()
  return userFriendlyTerms[lowerTerm] || term
}

/**
 * Format a message by replacing all technical terms with user-friendly versions
 *
 * @param message - The message containing technical terms
 * @param showTechnical - If true, returns the original message unchanged
 * @returns Message with user-friendly terms
 */
export function formatTechnicalMessage(
  message: string,
  showTechnical: boolean = false,
): string {
  if (showTechnical) return message

  let result = message
  for (const [technical, friendly] of Object.entries(userFriendlyTerms)) {
    // Case-insensitive replacement, preserving original case style
    const regex = new RegExp(`\\b${technical}\\b`, 'gi')
    result = result.replace(regex, match => {
      // Preserve capitalization
      if (match[0] === match[0].toUpperCase()) {
        return friendly.charAt(0).toUpperCase() + friendly.slice(1)
      }
      return friendly
    })
  }
  return result
}

/**
 * Get a tooltip explanation for a technical term
 *
 * @param term - The technical term
 * @returns Object with friendly name and explanation
 */
export function getTermExplanation(term: string): {
  friendly: string
  explanation: string
} | null {
  const explanations: Record<
    string,
    { friendly: string; explanation: string }
  > = {
    utxo: {
      friendly: 'Coin',
      explanation: 'An unspent amount of Lotus in your wallet',
    },
    musig2: {
      friendly: 'Shared Wallet',
      explanation: 'A wallet that requires multiple people to approve spending',
    },
    dht: {
      friendly: 'Network',
      explanation: 'The distributed network that helps wallets find each other',
    },
    mnemonic: {
      friendly: 'Recovery Phrase',
      explanation: 'The 12 or 24 words that can restore your wallet',
    },
    confirmations: {
      friendly: 'Confirmations',
      explanation: 'How many times the network has verified your transaction',
    },
    nonce: {
      friendly: 'Signing Step',
      explanation: 'A one-time value used during the signing process',
    },
  }

  const lowerTerm = term.toLowerCase()
  return explanations[lowerTerm] || null
}
