import { top8Template as legacyZeroTemplate } from '../../data/template.js'

export const ZERO_TEMPLATE_ID = 'zero'
export const LEGACY_ZERO_TEMPLATE_IDS = ['zero-comic-top8']

// Le template historique reste immuable. Seul son identifiant public est normalisé.
export const zeroTemplate = Object.freeze({
  ...legacyZeroTemplate,
  id: ZERO_TEMPLATE_ID,
})
