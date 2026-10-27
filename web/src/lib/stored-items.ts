import { NOTICE_STORAGE_KEY, PLACE_KEY, REGISTER_KEY, STORED_KEYS } from './storage-keys'

/** What is kept on the device, key by key, in the words the privacy section of the data page shows. */
export const STORED_ITEMS: { key: string; what: string }[] = [
  { key: PLACE_KEY, what: 'a cidade ou o estado que você escolheu na página inicial, para o atalho "Sua cidade"' },
  { key: REGISTER_KEY, what: 'a linguagem escolhida no cartão da cidade (padrão ou simples)' },
  { key: NOTICE_STORAGE_KEY, what: 'o aviso de medição já visto (o botão "Prosseguir")' },
]

// The text and the control cannot drift apart: every key has its sentence, and no sentence is for a key that is not cleared.
if (STORED_ITEMS.length !== STORED_KEYS.length || STORED_ITEMS.some((i) => !STORED_KEYS.includes(i.key))) throw new Error('stored-items: out of step with storage-keys')
