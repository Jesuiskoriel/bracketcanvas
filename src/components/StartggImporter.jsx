import { msg, t, useLanguage } from '../i18n.js'
import { useEffect, useRef, useState } from 'react'
import { mapStartggCharacter } from '../data/startggCharacterMapping.js'
import { fetchStartggTop8 } from '../services/startgg.js'

const enrichPreview = (preview, availableCharacterIds) => ({
  ...preview,
  players: preview.players.map((player) => ({
    ...player,
    characters: player.characters.map((character) => ({
      ...character,
      localId: mapStartggCharacter(character.name, availableCharacterIds),
    })),
  })),
})

function StartggImporter({ availableCharacterIds, onConfirm }) {
  useLanguage()
  const [eventUrl, setEventUrl] = useState('')
  const [token, setToken] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!preview) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isApplying) setPreview(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isApplying, preview])

  const loadPreview = async (event) => {
    event.preventDefault()
    if (isLoading) return

    setError('')
    setIsLoading(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await fetchStartggTop8({
        url: eventUrl,
        token,
        signal: controller.signal,
      })
      setPreview(enrichPreview(result, availableCharacterIds))
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message || msg("L’import Start.gg a échoué."))
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsLoading(false)
      }
    }
  }

  const confirmImport = async () => {
    if (!preview || isApplying) return
    setIsApplying(true)
    setError('')
    try {
      await onConfirm(preview)
      setPreview(null)
    } catch (importError) {
      setError(importError.message || msg("Le Top 8 n’a pas pu être appliqué."))
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <section className="startgg-importer" aria-labelledby="startgg-title">
      <div className="section-heading">
        <p className="eyebrow">{t("Import")}</p>
        <h2 id="startgg-title">Start.gg</h2>
      </div>

      <form className="startgg-form" onSubmit={loadPreview}>
        <label className="text-control compact-control" htmlFor="startgg-event-url">
          <span>{t("URL de l’événement")}</span>
          <input
            id="startgg-event-url"
            type="url"
            inputMode="url"
            placeholder="https://www.start.gg/tournament/…/event/…"
            value={eventUrl}
            onChange={(event) => setEventUrl(event.target.value)}
          />
        </label>

        <label className="text-control compact-control" htmlFor="startgg-token">
          <span>{t("Jeton API Start.gg")}</span>
          <input
            id="startgg-token"
            type="password"
            autoComplete="off"
            placeholder={t("Jeton personnel")}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>

        <p className="startgg-privacy-note">{t("Le jeton reste uniquement dans cette page et n’est pas sauvegardé.")}{' '}
          <a
            href="https://developer.start.gg/docs/authentication/"
            target="_blank"
            rel="noreferrer"
          >{t("Créer un jeton")}</a>
        </p>
        <button className="startgg-load-button" type="submit" disabled={isLoading}>
          {isLoading ? t("Analyse de l’événement…") : t("Prévisualiser le Top 8")}
        </button>
        {error && !preview && <p className="startgg-error" role="alert">{t(error)}</p>}
      </form>

      {preview && (
        <div className="startgg-dialog-backdrop" role="presentation">
          <section
            className="startgg-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="startgg-preview-title"
          >
            <header className="startgg-dialog-header">
              <div>
                <p className="eyebrow">{t("Vérification avant import")}</p>
                <h2 id="startgg-preview-title">{preview.eventName}</h2>
              </div>
              <div className="startgg-event-facts">
                {preview.date && <span>{preview.date}</span>}
                <span>{preview.participantCount || '—'}{t(" participants")}</span>
              </div>
            </header>

            <ol className="startgg-preview-list">
              {preview.players.map((player) => (
                <li key={`${player.placement}-${player.entrantId}`}>
                  <strong className="startgg-placement">{player.placement}</strong>
                  <div>
                    <span className="startgg-gamertag">{player.gamerTag}</span>
                    {player.characters.length ? (
                      <span className="startgg-characters">
                        {player.characters.map((character) => (
                          <span
                            key={character.name}
                            className={character.localId ? '' : 'is-unmapped'}
                            title={character.localId ? t(character.games === 1 ? '{0} partie' : '{0} parties', { 0: character.games }) : t("Absent de la bibliothèque de personnages")}
                          >
                            {character.name}
                            {!character.localId && t(' (non reconnu)')}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="startgg-characters is-empty">{t("Personnages non renseignés")}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {preview.characterNote && (
              <p className="startgg-character-note">{t(preview.characterNote)}{t(" Le classement peut quand même être importé.")}</p>
            )}
            {error && <p className="startgg-error" role="alert">{t(error)}</p>}

            <footer className="startgg-dialog-actions">
              <button
                type="button"
                disabled={isApplying}
                onClick={() => setPreview(null)}
              >{t("Annuler")}</button>
              <button type="button" disabled={isApplying} onClick={confirmImport}>
                {isApplying ? t("Import en cours…") : t("Importer ce Top 8")}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

export default StartggImporter
