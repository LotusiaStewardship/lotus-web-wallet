import type * as BitcoreTypes from 'xpi-ts/lib/bitcore'

export default defineNuxtPlugin({
  dependsOn: ['bitcore', 'chronik'],
  name: 'explorer',
  setup() {
    // Nuxt plugin instances
    const { $bitcore, $chronik } = useNuxtApp()

    /**
     * Ensure the Chronik client is initialized and return it
     * @returns The initialized Chronik client instance
     * @throws Error if the Chronik client is not initialized
     */
    function ensureChronikClient() {
      const chronikClient = $chronik.getClient()
      if (!chronikClient) {
        throw new Error('Chronik client not initialized')
      }

      return chronikClient
    }

    /**
     * Parse a transaction to determine its type and extract relevant data
     * for UI display
     * @param tx - The raw explorer transaction to parse
     * @param filterAddress - Optional address to calculate relative amounts (e.g., user's wallet address)
     * @returns A ParsedTransaction with classified type and extracted metadata
     *
     * Transaction types are classified in the following priority:
     * 1. coinbase - Block reward transactions
     * 2. rank - RANK protocol transactions (social media sentiment burns)
     * 3. burn - Non-RANK OP_RETURN burns
     * 4. self - Self-sends (consolidation or fee-only transactions)
     * 5. give - Outgoing transfers (user sent more than received)
     * 6. receive - Incoming transfers (user received more than sent)
     * 7. unknown - Unclassified transactions
     */
    function parseExplorerTx(
      tx: ExplorerTx,
      filterAddress?: string,
    ): ParsedTransaction {
      // Use block timestamp if confirmed, otherwise use first-seen time
      const timestamp = tx.block?.timestamp
        ? parseInt(tx.block.timestamp)
        : parseInt(tx.timeFirstSeen)

      // Height of -1 indicates unconfirmed (mempool) transaction
      const blockHeight = tx.block?.height ?? -1

      // Initialize base parsed transaction with default unknown type
      const parsed: ParsedTransaction = {
        txid: tx.txid,
        type: 'unknown',
        timestamp,
        blockHeight,
        raw: tx,
      }

      // Coinbase transactions (block rewards) have no inputs
      if (tx.isCoinbase) {
        parsed.type = 'coinbase'
        // Calculate received amount: filter to user's outputs if address provided
        const received = filterAddress
          ? tx.outputs
              .filter(o => o.address === filterAddress)
              .reduce((sum, o) => sum + BigInt(o.value), 0n)
          : tx.outputs.reduce((sum, o) => sum + BigInt(o.value), 0n)
        parsed.amount = received.toString()
        return parsed
      }

      // RANK transactions contain a special OP_RETURN output with sentiment data
      const rankOutput = tx.outputs.find(o => o.rankOutput)
      if (rankOutput?.rankOutput) {
        parsed.type = 'rank'
        parsed.rankData = {
          platform: rankOutput.rankOutput.platform,
          profileId: rankOutput.rankOutput.profileId,
          postId: rankOutput.rankOutput.postId,
          sentiment: rankOutput.rankOutput.sentiment,
          burnedAmount: rankOutput.value,
        }
        return parsed
      }

      // Generic burn: OP_RETURN with value but not a RANK transaction
      const burnedSats = BigInt(tx.sumBurnedSats)
      if (burnedSats > 0n && !rankOutput) {
        parsed.type = 'burn'
        parsed.burnedAmount = tx.sumBurnedSats
        return parsed
      }

      // Calculate net flow relative to the filter address
      let inputFromUser = 0n
      let outputToUser = 0n
      let counterpartyAddress = ''

      // Sum all inputs belonging to the user
      for (const input of tx.inputs) {
        if (input.address === filterAddress) {
          inputFromUser += BigInt(input.value)
        }
      }

      // Sum outputs to user and capture first non-user address as counterparty
      for (const output of tx.outputs) {
        if (output.address === filterAddress) {
          outputToUser += BigInt(output.value)
        } else if (output.address && !counterpartyAddress) {
          counterpartyAddress = output.address
        }
      }

      // Self-send: user's inputs equal outputs plus fees (consolidation tx)
      if (
        inputFromUser > 0n &&
        outputToUser > 0n &&
        inputFromUser === outputToUser + burnedSats
      ) {
        parsed.type = 'self'
        parsed.amount = burnedSats.toString() // Amount represents fee paid
        return parsed
      }

      // Give: user sent more than received (outgoing transfer)
      if (inputFromUser > outputToUser) {
        parsed.type = 'give'
        parsed.amount = (inputFromUser - outputToUser).toString()
        parsed.counterpartyAddress = counterpartyAddress
      } else if (outputToUser > inputFromUser) {
        // Receive: user received more than sent (incoming transfer)
        parsed.type = 'receive'
        parsed.amount = (outputToUser - inputFromUser).toString()
        // For incoming transfers, counterparty is the sender (first input)
        if (tx.inputs[0]?.address) {
          parsed.counterpartyAddress = tx.inputs[0].address
        }
      }

      return parsed
    }

    /**
     * Get the script payload and type from a Bitcore Address
     * @param address - The address to extract script information from
     * @returns Object containing the script payload as hex string and the script type
     */
    function getScriptFromAddress(address: BitcoreTypes.Address | string) {
      const script = $bitcore.Script.fromAddress(address)
      return {
        scriptPayload: script.getData().toString('hex'),
        scriptType: script.getType(),
      }
    }

    /**
     * Get the address from a script
     * @param script - The script to get the address from (hex string or Bitcore Script)
     * @returns The address or null if the script is an OP_RETURN output
     */
    function getAddressFromScript(script: BitcoreTypes.Script | string) {
      // Convert to Bitcore Script if needed
      if (typeof script === 'string') {
        script = $bitcore.Script.fromHex(script)
      }
      // OP_RETURN outputs are not addresses
      if (script.isDataOut()) {
        return null
      }

      // P2PKH, P2TR, and P2SH outputs are addresses
      return script.toAddress()
    }

    /**
     * Convert a Chronik TxInput to an ExplorerTxInput
     * Handles P2PKH, P2TR, and P2SH inputs by extracting the address
     * @param input - The Chronik TxInput to convert
     * @returns The converted ExplorerTxInput with address if applicable
     */
    function convertInputToExplorerInput(input: TxInput) {
      // Get Bitcore Script from hex
      // We assume the script is valid because UTXOs are always valid
      const script = $bitcore.Script.fromHex(input.outputScript!)
      // Address will be defined because UTXOs are always from valid addresses
      const address = getAddressFromScript(script)!.toXAddress()

      return {
        ...input,
        address,
      } as ExplorerTxInput
    }

    /**
     * Convert a Chronik TxOutput to an ExplorerTxOutput
     * Handles OP_RETURN outputs (including RANK), P2PKH, P2TR, and P2SH outputs
     * @param output - The Chronik TxOutput to convert
     * @param sumBurnedSats - Running total of burned satoshis (mutated for OP_RETURN)
     * @returns The converted ExplorerTxOutput with address or rankOutput if applicable
     */
    function convertOutputToExplorerOutput(
      output: TxOutput,
      sumBurnedSats: bigint,
    ) {
      const script = $bitcore.Script.fromString(output.outputScript)
      // OP_RETURN outputs
      if (script.isDataOut()) {
        // TODO: we can add more LOKAD checks here
        sumBurnedSats += BigInt(output.value)
        // TODO: process the rank output
        // Do we add a new RANK-specific plugin??? 🤔
        /* const rank = new ScriptProcessor(scriptBuf)
        const rankOutput = rank.processScriptRANK()
        if (rankOutput) {
          return {
            ...output,
            rankOutput,
          } as ExplorerTxOutput
        } */
      }
      // P2PKH/P2TR/P2SH outputs
      if (
        script.isPayToPublicKeyHash() ||
        script.isPayToScriptHash() ||
        script.isPayToTaproot()
      ) {
        const address = getAddressFromScript(script)!.toXAddress()
        return {
          ...output,
          sumBurnedSats: sumBurnedSats.toString(),
          address,
        } as ExplorerTxOutput
      }
      // if we get here, the output is not a rank output or an address output
      // just return the output as is
      return output
    }

    /**
     * Convert a Chronik transaction to an Explorer-compatible transaction
     * @param tx - The Chronik transaction to convert
     * @returns The Explorer-compatible transaction with addresses and burned sats calculated
     */
    function convertToExplorerTx(tx: Tx): ExplorerTx {
      // This will be counted in the outputs map function
      const sumBurnedSats = 0n
      return {
        ...tx,
        inputs: tx.inputs.map(
          input =>
            input.outputScript
              ? convertInputToExplorerInput(input)
              : (input as ExplorerTxInput), // address is not defined for coinbase inputs
        ),
        outputs: tx.outputs.map(output =>
          convertOutputToExplorerOutput(output, sumBurnedSats),
        ),
        sumBurnedSats: sumBurnedSats.toString(),
      }
    }

    /**
     * Fetch transaction history for a given address
     * @param address - The address to fetch history for (Bitcore Address or string)
     * @param page - The page number to fetch (0-indexed)
     * @param pageSize - The number of transactions per page
     * @returns The transaction history with pagination info
     */
    async function fetchAddressHistory(
      address: BitcoreTypes.Address | string,
      page: number,
      pageSize: number,
    ) {
      const chronikClient = ensureChronikClient()
      const { scriptPayload, scriptType } = getScriptFromAddress(address)
      const scriptEndpoint = chronikClient.script(scriptType, scriptPayload)
      const history = await scriptEndpoint.history(page, pageSize)
      return history
    }

    /**
     * Fetch the balance for a given address
     * Calculates the total balance by summing all UTXOs belonging to the address
     * @param address - The address to fetch balance for (Bitcore Address or string)
     * @returns The total balance in satoshis as a string
     * @throws Error if the address is invalid or Chronik client is not initialized
     */
    async function fetchAddressBalance(address: BitcoreTypes.Address | string) {
      const script = $bitcore.Script.fromAddress(address)
      const scriptType = script.getType()
      const scriptPayload = script.getData().toString('hex')
      if (!scriptType || !scriptPayload) {
        throw new Error('Invalid address')
      }

      const chronikClient = ensureChronikClient()
      const [{ utxos }] = await chronikClient
        .script(scriptType, scriptPayload)
        .utxos()
      return utxos
        .reduce((acc, utxo) => acc + BigInt(utxo.value), 0n)
        .toString()
    }

    /**
     * Fetch paginated block list
     * @param page - The page number to fetch (0-indexed)
     * @param pageSize - The number of blocks per page
     * @returns Array of Chronik `BlockInfo` objects
     */
    async function fetchBlocks(page: number = 0, pageSize: number = 10) {
      const chronikClient = ensureChronikClient()
      const blocks = await chronikClient.blocks(page, pageSize)
      return blocks
    }

    /**
     * Fetch a single block by its hash or height
     * @param hashOrHeight - The block hash or height to fetch
     * @returns The Chronik `Block` object
     */
    async function fetchBlock(hashOrHeight: string) {
      const chronikClient = ensureChronikClient()
      // blockchain info for confirmations
      const { tipHeight } = await fetchBlockchainInfo()

      // If hashOrHeight is a number, it's a height
      const height = parseInt(hashOrHeight)
      const block = await chronikClient.block(height || hashOrHeight)

      // Convert to ExplorerBlock
      const minedByScriptHex = block.txs[0]?.outputs[1]?.outputScript
      const minedByAddress = getAddressFromScript(minedByScriptHex)
      const txs: ExplorerTx[] = []
      for (const tx of block.txs) {
        const explorerTx = convertToExplorerTx(tx)
        txs.push(explorerTx)
      }

      return {
        ...block,
        minedBy: minedByAddress?.toXAddress(),
        txs,
      }
    }

    /**
     * Fetch blockchain info (tip height and hash)
     * @returns The blockchain info containing tip height and hash
     */
    async function fetchBlockchainInfo() {
      const chronikClient = ensureChronikClient()
      return await chronikClient.blockchainInfo()
    }

    async function fetchRecentBlocks() {
      const { tipHeight } = await fetchBlockchainInfo()
      // 0-based index, so tipheight - 4 is the 5th block back
      const blockRange = await fetchBlocks(tipHeight - 4, tipHeight)
      return {
        blocks: blockRange.reverse(),
        tipHeight,
      }
    }

    /**
     * Fetch a single transaction by its txid
     * @param txid - The transaction ID to fetch
     * @returns The Explorer-compatible transaction object
     */
    async function fetchTransaction(txid: string) {
      const chronikClient = ensureChronikClient()
      const tx = await chronikClient.tx(txid)
      return convertToExplorerTx(tx)
    }

    /**
     * Fetch and parse a batch of transactions by their txids
     * @param params - The parameters for the batch fetch
     * @param params.txids - Array of transaction IDs to fetch
     * @param params.filterAddress - Optional address to filter/classify transactions against
     * @param params.batchSize - Number of transactions to fetch in parallel (default: 5)
     * @returns Array of parsed transactions
     */
    async function fetchTransactionBatch({
      txids,
      filterAddress,
      batchSize = 5,
    }: {
      txids: string[]
      filterAddress?: string
      batchSize?: number
    }): Promise<ParsedTransaction[]> {
      const parsed: ParsedTransaction[] = []

      // Process transactions in batches to avoid overwhelming the API
      for (let i = 0; i < txids.length; i += batchSize) {
        const batch = txids.slice(i, i + batchSize)
        const promises = batch.map(txid => fetchTransaction(txid))
        const results = await Promise.all(promises)

        // Parse each successfully fetched transaction
        for (const tx of results) {
          if (tx) {
            parsed.push(parseExplorerTx(tx, filterAddress))
          }
        }
      }

      return parsed
    }

    return {
      provide: {
        explorer: {
          // General methods
          getScriptFromAddress,
          getAddressFromScript,
          parseExplorerTx,
          // Conversion methods
          convertInputToExplorerInput,
          convertOutputToExplorerOutput,
          convertToExplorerTx,
          // Fetch methods
          fetchBlockchainInfo,
          fetchAddressBalance,
          fetchAddressHistory,
          fetchTransaction,
          fetchTransactionBatch,
          fetchBlock,
          fetchBlocks,
          fetchRecentBlocks,
        },
      },
    }
  },
})
