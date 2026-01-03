import { english } from 'xpi-ts/lib/bitcore/mnemonic/words/english'

export function useMnemonic() {
  const isValidEnglishWord = (word: string) => english.includes(word)

  return {
    isValidEnglishWord,
  }
}
