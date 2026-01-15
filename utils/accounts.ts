/**
 * Build a BIP44 derivation path for Lotus wallet key derivation.
 *
 * Constructs a standard BIP44 path: m/purpose'/coin_type'/account'/change/address_index
 * where purpose=44 and coin_type=10605 for Lotus.
 *
 * @param accountIndex - Account index (0 = PRIMARY, 1 = MUSIG2, etc.)
 * @param isChange - Whether this is a change address (internal chain = 1, external = 0)
 * @param addressIndex - Address index within the chain
 * @returns Full BIP44 derivation path string (e.g., "m/44'/10605'/0'/0/0")
 *
 * @example
 * // "m/44'/10605'/0'/0/0" - first receiving address
 * buildDerivationPath(AccountPurpose.PRIMARY, false, 0)
 * // "m/44'/10605'/1'/1/5" - 6th change address of MuSig2 account
 * buildDerivationPath(AccountPurpose.MUSIG2, true, 5)
 */
export function buildDerivationPath(
  accountIndex: number,
  isChange: boolean = false,
  addressIndex: number = 0,
): string {
  const change = isChange ? 1 : 0
  return `m/${BIP44_PURPOSE}'/${BIP44_COINTYPE}'/${accountIndex}'/${change}/${addressIndex}`
}

/**
 * Get the derivation path for a specific account purpose.
 *
 * Convenience wrapper around {@link buildDerivationPath} that accepts
 * an {@link AccountPurpose} enum value instead of a raw account index.
 *
 * @param purpose - Account purpose enum value (PRIMARY, MUSIG2, SWAP, PRIVACY)
 * @param isChange - Whether this is a change address (internal chain)
 * @param addressIndex - Address index within the chain
 * @returns Full BIP44 derivation path string
 *
 * @example
 * getAccountPath(AccountPurpose.PRIMARY)        // "m/44'/10605'/0'/0/0"
 * getAccountPath(AccountPurpose.MUSIG2, false, 0) // "m/44'/10605'/1'/0/0"
 */
export function getAccountPath(
  purpose: AccountPurpose,
  isChange: boolean = false,
  addressIndex: number = 0,
): string {
  return buildDerivationPath(purpose, isChange, addressIndex)
}
