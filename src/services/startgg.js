const STARTGG_ENDPOINT = 'https://api.start.gg/gql/alpha'
const SETS_PER_PAGE = 20
const MAX_CHARACTER_PAGES = 45

const EVENT_QUERY = `
  query Top8Import($slug: String!) {
    event(slug: $slug) {
      id
      name
      startAt
      numEntrants
      standings(query: { page: 1, perPage: 8 }) {
        nodes {
          placement
          entrant {
            id
            name
            participants {
              gamerTag
            }
          }
        }
      }
    }
  }
`

const SETS_QUERY = `
  query Top8CharacterUsage($eventId: ID!, $page: Int!, $perPage: Int!) {
    event(id: $eventId) {
      sets(page: $page, perPage: $perPage, sortType: STANDARD) {
        pageInfo {
          totalPages
        }
        nodes {
          slots {
            entrant { id }
          }
          games {
            selections {
              character { id name }
            }
          }
        }
      }
    }
  }
`

export class StartggImportError extends Error {}

export const parseStartggEventSlug = (value) => {
  const trimmedValue = value.trim()

  try {
    const url = new URL(trimmedValue)
    if (!['start.gg', 'www.start.gg'].includes(url.hostname.toLowerCase())) {
      throw new Error('host')
    }
    const match = url.pathname.match(/\/(tournament\/[^/]+\/event\/[^/?#]+)/i)
    if (match) return decodeURIComponent(match[1])
  } catch {
    // Le message commun ci-dessous couvre URL invalide et mauvais domaine.
  }

  throw new StartggImportError(
    "Colle l’URL complète d’un event Start.gg (…/tournament/…/event/…).",
  )
}

const requestStartgg = async ({ token, query, variables, signal }) => {
  let response
  try {
    response = await fetch(STARTGG_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new StartggImportError(
      'Connexion à Start.gg impossible. Vérifie ta connexion puis réessaie.',
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new StartggImportError('Jeton Start.gg invalide ou non autorisé.')
  }
  if (response.status === 429) {
    throw new StartggImportError(
      'Limite de requêtes Start.gg atteinte. Attends un instant puis réessaie.',
    )
  }
  if (!response.ok) {
    throw new StartggImportError(`Start.gg a répondu avec l’erreur ${response.status}.`)
  }

  const payload = await response.json()
  if (payload.errors?.length) {
    throw new StartggImportError(payload.errors[0].message || 'Réponse Start.gg invalide.')
  }
  return payload.data
}

const formatEventDate = (timestamp) => {
  if (!Number.isFinite(timestamp)) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp * 1000))
}

const getGamerTag = (entrant) =>
  entrant?.participants?.find((participant) => participant?.gamerTag)?.gamerTag ||
  entrant?.name ||
  'Joueur sans nom'

const countCharacterSelections = (sets, topEntrantIds, countsByEntrant) => {
  sets.forEach((set) => {
    const slotEntrantIds = (set?.slots || [])
      .map((slot) => String(slot?.entrant?.id || ''))
      .filter(Boolean)

    if (slotEntrantIds.length < 2) return

    ;(set?.games || []).forEach((game) => {
      const selections = game?.selections || []
      // Start.gg ne renvoie pas l'entrant dans GameSelection. On n'utilise
      // l'ordre que lorsqu'il correspond exactement aux slots du set.
      if (selections.length !== slotEntrantIds.length) return

      selections.forEach((selection, index) => {
        const entrantId = slotEntrantIds[index]
        const characterName = selection?.character?.name?.trim()
        if (!topEntrantIds.has(entrantId) || !characterName) return

        const entrantCounts = countsByEntrant.get(entrantId)
        entrantCounts.set(characterName, (entrantCounts.get(characterName) || 0) + 1)
      })
    })
  })
}

const fetchCharacterUsage = async ({ eventId, entrantIds, token, signal }) => {
  const topEntrantIds = new Set(entrantIds.map(String))
  const countsByEntrant = new Map(
    [...topEntrantIds].map((entrantId) => [entrantId, new Map()]),
  )

  const firstPage = await requestStartgg({
    token,
    query: SETS_QUERY,
    variables: { eventId, page: 1, perPage: SETS_PER_PAGE },
    signal,
  })
  const connection = firstPage?.event?.sets
  const totalPages = connection?.pageInfo?.totalPages || 1

  if (totalPages > MAX_CHARACTER_PAGES) {
    return { countsByEntrant, note: 'Trop de sets pour une détection fiable.' }
  }

  countCharacterSelections(connection?.nodes || [], topEntrantIds, countsByEntrant)
  for (let page = 2; page <= totalPages; page += 1) {
    const data = await requestStartgg({
      token,
      query: SETS_QUERY,
      variables: { eventId, page, perPage: SETS_PER_PAGE },
      signal,
    })
    countCharacterSelections(
      data?.event?.sets?.nodes || [],
      topEntrantIds,
      countsByEntrant,
    )
  }

  return { countsByEntrant, note: '' }
}

const getMostPlayedCharacters = (counts = new Map()) =>
  [...counts.entries()]
    .sort(([nameA, countA], [nameB, countB]) =>
      countB - countA || nameA.localeCompare(nameB, 'fr'),
    )
    .slice(0, 2)
    .map(([name, games]) => ({ name, games }))

export const fetchStartggTop8 = async ({ url, token, signal }) => {
  if (!token.trim()) throw new StartggImportError('Renseigne ton jeton API Start.gg.')

  const slug = parseStartggEventSlug(url)
  const data = await requestStartgg({
    token,
    query: EVENT_QUERY,
    variables: { slug },
    signal,
  })
  const event = data?.event
  if (!event) throw new StartggImportError('Cet event Start.gg est introuvable.')

  const standings = (event.standings?.nodes || [])
    .filter((standing) => standing?.entrant && Number.isFinite(standing.placement))
    .sort((standingA, standingB) => standingA.placement - standingB.placement)
    .slice(0, 8)
  if (!standings.length) {
    throw new StartggImportError(
      'Aucun classement final n’est encore disponible pour cet event.',
    )
  }

  let characterUsage = { countsByEntrant: new Map(), note: '' }
  try {
    characterUsage = await fetchCharacterUsage({
      eventId: event.id,
      entrantIds: standings.map(({ entrant }) => entrant.id),
      token,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    characterUsage.note = 'Les personnages n’ont pas pu être récupérés.'
  }

  return {
    eventName: event.name || 'Event Start.gg',
    date: formatEventDate(event.startAt),
    participantCount: Number.isFinite(event.numEntrants) ? String(event.numEntrants) : '',
    characterNote: characterUsage.note,
    players: standings.map(({ placement, entrant }) => ({
      entrantId: String(entrant.id),
      placement,
      gamerTag: getGamerTag(entrant),
      characters: getMostPlayedCharacters(
        characterUsage.countsByEntrant.get(String(entrant.id)),
      ),
    })),
  }
}
