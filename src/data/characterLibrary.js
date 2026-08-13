const renderModules = import.meta.glob('../assets/characters/**/*.png', {
  query: '?url',
  import: 'default',
})

const DISPLAY_NAME_EXCEPTIONS = {
  'mr-game-and-watch': 'Mr. Game & Watch',
  'pac-man': 'Pac-Man',
  'pokemon-trainer': 'Pokémon Trainer',
  rob: 'R.O.B.',
}

const toTitleCase = (value) =>
  value
    .split('-')
    .map((word) => (word === 'and' ? '&' : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(' ')

export const toCharacterName = (id) =>
  DISPLAY_NAME_EXCEPTIONS[id] || toTitleCase(id)

export const toRenderName = (id) => {
  const altMatch = id.match(/^alt-(\d+)$/)
  return altMatch ? `Alt ${altMatch[1]}` : toTitleCase(id)
}

const compareRenders = (renderA, renderB) => {
  const altA = Number(renderA.id.match(/^alt-(\d+)$/)?.[1])
  const altB = Number(renderB.id.match(/^alt-(\d+)$/)?.[1])

  if (altA && altB) return altA - altB
  if (altA) return -1
  if (altB) return 1
  return renderA.name.localeCompare(renderB.name, 'fr')
}

const charactersById = Object.entries(renderModules).reduce(
  (characters, [path, load]) => {
    const match = path.match(/\/characters\/([^/]+)\/([^/]+)\.png$/i)
    if (!match) return characters

    const [, characterId, renderId] = match
    if (!characters.has(characterId)) {
      characters.set(characterId, {
        id: characterId,
        name: toCharacterName(characterId),
        renders: [],
      })
    }

    characters.get(characterId).renders.push({
      id: renderId,
      name: toRenderName(renderId),
      load,
    })

    return characters
  },
  new Map(),
)

export const characterLibrary = [...charactersById.values()]
  .map((character) => ({
    ...character,
    renders: character.renders.sort(compareRenders),
  }))
  .sort((characterA, characterB) =>
    characterA.name.localeCompare(characterB.name, 'fr'),
  )

export const getCharacter = (characterId) =>
  charactersById.get(characterId)
