const CHARACTER_ALIASES = {
  aegis: 'pyra-and-mythra',
  'banjo kazooie': 'banjo-and-kazooie',
  'banjo & kazooie': 'banjo-and-kazooie',
  'dark samus': 'dark-samus',
  'doctor mario': 'dr-mario',
  'dr mario': 'dr-mario',
  'duck hunt duo': 'duck-hunt',
  'game & watch': 'mr-game-and-watch',
  'mr game & watch': 'mr-game-and-watch',
  'mr game and watch': 'mr-game-and-watch',
  mythra: 'pyra-and-mythra',
  'pokemon trainer': 'pokemon-trainer',
  'pyra & mythra': 'pyra-and-mythra',
  'pyra mythra': 'pyra-and-mythra',
  pyra: 'pyra-and-mythra',
  rob: 'rob',
  'mii sword fighter': 'mii-swordfighter',
}

export const normalizeCharacterName = (name = '') =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.’']/g, '')
    .replace(/[^a-z0-9&]+/g, ' ')
    .trim()

export const mapStartggCharacter = (name, availableCharacterIds) => {
  const normalizedName = normalizeCharacterName(name)
  if (!normalizedName) return ''

  const availableIds = new Set(availableCharacterIds)
  const alias = CHARACTER_ALIASES[normalizedName]
  if (alias && availableIds.has(alias)) return alias

  const inferredId = normalizedName.replace(/\s*&\s*/g, '-and-').replace(/\s+/g, '-')
  return availableIds.has(inferredId) ? inferredId : ''
}
