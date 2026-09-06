import { t, useLanguage, getLocale } from '../i18n.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadAdminUserProjects, loadAdminUsers, setAdminUserDisabled } from '../services/accountApi.js'
import { characterLibrary as baseCharacterLibrary } from '../data/characterLibrary.js'
import { getTemplate } from '../templates/registry.js'
import Top8Canvas from './Top8Canvas.jsx'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : t("Aucune activité")

const getLatestActivity = ({ workspaceUpdatedAt, lastSessionAt }) => {
  const dates = [workspaceUpdatedAt, lastSessionAt].filter(Boolean)
  if (!dates.length) return null
  return dates.sort((first, second) => new Date(second) - new Date(first))[0]
}

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const createCustomCharacterLibrary = (customCharacters = []) =>
  customCharacters
    .filter((character) =>
      isObject(character) &&
      typeof character.id === 'string' &&
      typeof character.name === 'string' &&
      typeof character.source === 'string' &&
      character.source.startsWith('data:'),
    )
    .map((character) => ({
      id: character.id,
      name: character.name,
      renders: [{
        id: 'default',
        name: character.name,
        load: async () => character.source,
      }],
    }))

const getCharacterFromLibrary = (library, characterId) =>
  library.find((character) => character.id === characterId)

const getCustomFontFamily = (font) =>
  font ? `BracketCanvas Custom Font ${font.id}` : ''

const escapeCssString = (value) =>
  String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\a ')

const loadRenderSource = async (characterId, renderId, library) => {
  const render = getCharacterFromLibrary(library, characterId)?.renders.find(
    (candidate) => candidate.id === renderId,
  )
  return render ? render.load() : ''
}

const createPreviewPlayers = async (projectData, template, characterLibrary) => {
  const savedPlayers = Array.isArray(projectData?.players) ? projectData.players : []
  return Promise.all(template.slots.map(async (slot) => {
    const savedPlayer = savedPlayers.find((candidate) => candidate?.id === slot.id) || {}
    const player = {
      id: slot.id,
      placement: slot.placement,
      playerName: '',
      character: '',
      renderId: '',
      render: '',
      secondaryCharacter: '',
      secondaryRenderId: '',
      secondaryRender: '',
      teamLogo: '',
      teamLogoName: '',
      slotBackground: '',
      slotBackgroundName: '',
      rankX: slot.rank.x,
      rankY: slot.rank.y,
      rankSize: slot.rank.size,
      rankColor: slot.rank.color,
      rankLayer: slot.rank.layer,
      x: 0,
      y: 0,
      scale: 1,
      flipped: false,
      opacity: 100,
      secondaryX: 18,
      secondaryY: 0,
      secondaryScale: 1,
      secondaryFlipped: false,
      secondaryOpacity: 100,
      teamLogoX: 100 - template.teamLogo.right - template.teamLogo.width,
      teamLogoY: template.teamLogo.top,
      teamLogoSize: Math.max(template.teamLogo.width, template.teamLogo.height),
      ...savedPlayer,
    }
    const [render, secondaryRender] = await Promise.all([
      loadRenderSource(player.character, player.renderId, characterLibrary).catch(() => ''),
      loadRenderSource(player.secondaryCharacter, player.secondaryRenderId, characterLibrary).catch(() => ''),
    ])
    return { ...player, placement: slot.placement, render, secondaryRender }
  }))
}

const createProjectPreview = async (project) => {
  const projectData = isObject(project?.data) ? project.data : {}
  const collection = isObject(project?.collection) ? project.collection : {}
  const customCharacters = Array.isArray(collection.customCharacters)
    ? collection.customCharacters
    : []
  const customFonts = Array.isArray(collection.customFonts)
    ? collection.customFonts
    : []
  const characterLibrary = [
    ...baseCharacterLibrary,
    ...createCustomCharacterLibrary(customCharacters),
  ]
  const generatedTemplate = isObject(projectData.generatedTemplate)
    ? {
        ...projectData.generatedTemplate,
        generationBrief:
          projectData.generationBrief || projectData.generatedTemplate.generationBrief,
      }
    : projectData.generatedTemplate
  const template = getTemplate(projectData.templateId, generatedTemplate, projectData.paletteState)
  const players = await createPreviewPlayers(projectData, template, characterLibrary)
  const eventDetails = {
    eventName: t('Nom du tournoi'),
    subtitle: '',
    date: '00/00/0000',
    participantCount: '00',
    tournamentLogo: '',
    customBackground: '',
    customFontId: '',
    ...(isObject(projectData.eventDetails) ? projectData.eventDetails : {}),
  }
  const customFont = customFonts.find((font) => font.id === eventDetails.customFontId) || null
  return {
    template,
    players,
    eventDetails,
    customFont,
    customFontCss: customFonts
      .filter((font) => font.id && font.source)
      .map((font) =>
        `@font-face { font-family: "${escapeCssString(getCustomFontFamily(font))}"; src: url("${font.source}"); font-display: swap; }`,
      )
      .join('\n'),
  }
}

export default function AdminPanel({ currentUserId, onClose }) {
  useLanguage()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [projectError, setProjectError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUserId, setPendingUserId] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [selectedUserProjects, setSelectedUserProjects] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [previewState, setPreviewState] = useState(null)
  const [isHydratingPreview, setIsHydratingPreview] = useState(false)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    let isActive = true
    loadAdminUsers()
      .then(({ users: loadedUsers }) => {
        if (isActive) setUsers(loadedUsers)
      })
      .catch((loadError) => {
        if (isActive) setError(loadError.message)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users
    return users.filter((user) =>
      `${user.displayName} ${user.email}`.toLowerCase().includes(normalizedQuery),
    )
  }, [query, users])

  const activeCount = users.filter(({ disabledAt }) => !disabledAt).length
  const projectCount = users.reduce((total, user) => total + user.projectCount, 0)
  const selectedProjects = useMemo(
    () => selectedUserProjects?.collection?.projects
      ? Object.values(selectedUserProjects.collection.projects)
      : [],
    [selectedUserProjects?.collection?.projects],
  )
  const selectedProject = useMemo(() => {
    const project = selectedProjects.find((candidate) => candidate.id === selectedProjectId)
    return project
      ? { ...project, collection: selectedUserProjects?.collection }
      : null
  }, [selectedProjectId, selectedProjects, selectedUserProjects?.collection])

  useEffect(() => {
    let isActive = true
    setPreviewState(null)
    setProjectError('')
    if (!selectedProject) return () => {
      isActive = false
    }

    setIsHydratingPreview(true)
    createProjectPreview(selectedProject)
      .then((preview) => {
        if (isActive) setPreviewState(preview)
      })
      .catch((previewError) => {
        if (isActive) setProjectError(previewError.message || t('Impossible d’afficher ce canevas.'))
      })
      .finally(() => {
        if (isActive) setIsHydratingPreview(false)
      })
    return () => {
      isActive = false
    }
  }, [selectedProject])

  const toggleUser = async (user) => {
    const shouldDisable = !user.disabledAt
    const confirmed = window.confirm(
      shouldDisable
        ? t("Suspendre le compte de {0} ? Ses sessions seront immédiatement fermées.", { 0: user.displayName })
        : t("Réactiver le compte de {0} ?", { 0: user.displayName }),
    )
    if (!confirmed) return

    setPendingUserId(user.id)
    setError('')
    try {
      const { disabledAt } = await setAdminUserDisabled(user.id, shouldDisable)
      setUsers((currentUsers) => currentUsers.map((candidate) =>
        candidate.id === user.id ? { ...candidate, disabledAt } : candidate,
      ))
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setPendingUserId('')
    }
  }

  const inspectUserProjects = async (user) => {
    setIsLoadingProjects(true)
    setProjectError('')
    setSelectedUserProjects(null)
    setSelectedProjectId('')
    setPreviewState(null)
    try {
      const result = await loadAdminUserProjects(user.id)
      const projects = result.collection?.projects ? Object.values(result.collection.projects) : []
      setSelectedUserProjects(result)
      setSelectedProjectId(
        result.collection?.activeProjectId && result.collection.projects?.[result.collection.activeProjectId]
          ? result.collection.activeProjectId
          : projects[0]?.id || '',
      )
    } catch (loadError) {
      setProjectError(loadError.message)
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const closeProjectViewer = () => {
    setSelectedUserProjects(null)
    setSelectedProjectId('')
    setPreviewState(null)
    setProjectError('')
  }

  return (
    <div className="admin-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-header">
          <div>
            <p className="eyebrow">BracketCanvas</p>
            <h2 id="admin-title">{t("Administration")}</h2>
            <p>{t("Consulte les comptes, contrôle leur accès et visualise leurs canevas.")}</p>
          </div>
          <button ref={closeButtonRef} className="admin-close" type="button" onClick={onClose} aria-label={t("Fermer l’administration")}>×</button>
        </header>

        <div className="admin-stats" aria-label={t("Résumé des utilisateurs")}>
          <div><strong>{users.length}</strong><span>{t("Comptes")}</span></div>
          <div><strong>{activeCount}</strong><span>{t("Actifs")}</span></div>
          <div><strong>{projectCount}</strong><span>{t("Canevas")}</span></div>
        </div>

        <label className="admin-search" htmlFor="admin-user-search">
          <span>{t("Rechercher un utilisateur")}</span>
          <input
            id="admin-user-search"
            type="search"
            value={query}
            placeholder={t("Nom ou adresse e-mail")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {error && <p className="admin-error" role="alert">{t(error)}</p>}
        {isLoading ? (
          <p className="admin-loading" role="status">{t("Chargement des utilisateurs…")}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-user-table">
              <thead><tr><th>{t("Utilisateur")}</th><th>{t("Inscription")}</th><th>{t("Dernière activité")}</th><th>{t("Canevas")}</th><th>{t("Statut")}</th><th>{t("Actions")}</th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isProtected = user.id === currentUserId || user.role === 'admin'
                  return (
                    <tr key={user.id}>
                      <td data-label={t('Utilisateur')}><strong>{user.displayName}</strong><small>{user.email}</small></td>
                      <td data-label={t('Inscription')}>{formatDate(user.createdAt)}</td>
                      <td data-label={t('Dernière activité')}>{formatDate(getLatestActivity(user))}</td>
                      <td data-label={t('Canevas')}>{user.projectCount}</td>
                      <td data-label={t('Statut')}><span className={`admin-status ${user.disabledAt ? 'is-disabled' : 'is-active'}`}>{user.disabledAt ? t("Suspendu") : user.role === 'admin' ? t("Administrateur") : t("Actif")}</span></td>
                      <td className="admin-user-action" data-label={t('Actions')}>
                        <button
                          className="admin-view-projects-button"
                          type="button"
                          disabled={isLoadingProjects}
                          onClick={() => inspectUserProjects(user)}
                        >
                          {isLoadingProjects ? t("Chargement…") : t("Voir les canevas")}
                        </button>
                        {isProtected ? (
                          <span className="admin-protected">{t("Protégé")}</span>
                        ) : (
                          <button type="button" disabled={pendingUserId === user.id} onClick={() => toggleUser(user)}>
                            {pendingUserId === user.id ? t("Mise à jour…") : user.disabledAt ? t("Réactiver") : t("Suspendre")}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filteredUsers.length && <p className="admin-empty">{t("Aucun utilisateur ne correspond à cette recherche.")}</p>}
          </div>
        )}

        {selectedUserProjects && (
          <section className="admin-project-viewer" aria-labelledby="admin-project-viewer-title">
            <header>
              <div>
                <p className="eyebrow">{selectedUserProjects.user.email}</p>
                <h3 id="admin-project-viewer-title">{t('Canevas de {0}', { 0: selectedUserProjects.user.displayName })}</h3>
              </div>
              <button type="button" onClick={closeProjectViewer}>{t('Fermer l’aperçu')}</button>
            </header>

            {selectedProjects.length ? (
              <>
                <label className="admin-project-select" htmlFor="admin-project-select">
                  <span>{t('Projet à visualiser')}</span>
                  <select
                    id="admin-project-select"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                  >
                    {selectedProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>

                <div className="admin-project-meta">
                  <span>{t('Mis à jour le {0}', { 0: formatDate(selectedProject?.updatedAt || selectedUserProjects.updatedAt) })}</span>
                  <span>{t('{0} projet(s)', { 0: selectedProjects.length })}</span>
                </div>

                <div className="admin-project-canvas-frame" aria-busy={isHydratingPreview}>
                  {previewState ? (
                    <>
                      {previewState.customFontCss && <style>{previewState.customFontCss}</style>}
                      <Top8Canvas
                        template={previewState.template}
                        players={previewState.players}
                        eventDetails={previewState.eventDetails}
                        customFont={previewState.customFont}
                        selectedLayer={{}}
                        onPlayerChange={() => {}}
                        onSelectLayer={() => {}}
                      />
                    </>
                  ) : (
                    <div className="admin-preview-placeholder" role="status">
                      {isHydratingPreview ? t('Préparation de l’aperçu…') : t('Aucun aperçu disponible.')}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="admin-empty">{t('Cet utilisateur n’a encore aucun canevas.')}</p>
            )}
          </section>
        )}
        {projectError && <p className="admin-error" role="alert">{t(projectError)}</p>}
      </section>
    </div>
  )
}
