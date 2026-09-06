import { t, msg, useLanguage } from './i18n.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import PlayerEditor from './components/PlayerEditor.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import PaletteEditor from './components/PaletteEditor.jsx'
import AccountMenu from './components/AccountMenu.jsx'
import ProjectSwitcher from './components/ProjectSwitcher.jsx'
import CollaborationPanel from './components/CollaborationPanel.jsx'
import KeyboardShortcuts from './components/KeyboardShortcuts.jsx'
import ProjectTemplatePanel from './components/ProjectTemplatePanel.jsx'
import StartggImporter from './components/StartggImporter.jsx'
import TemplateEditor from './components/TemplateEditor.jsx'
import Top8Canvas from './components/Top8Canvas.jsx'
import { characterLibrary, getCharacter } from './data/characterLibrary.js'
import {
  createProjectCollection,
  createProjectRecord,
  isStorageQuotaError,
  loadProjectCollection,
  saveProjectCollection,
  updateActiveProjectData,
} from './data/projectStorage.js'
import { generateTemplate } from './templates/generated/generator.js'
import {
  applyPaletteStateToTemplate,
  createPersistablePaletteState,
} from './templates/paletteTemplate.js'
import {
  getTemplate,
  ZERO_TEMPLATE_ID,
  zeroTemplate,
} from './templates/registry.js'
import { exportTop8AsPng } from './utils/exportPng.js'
import { exportTop8AsPsd } from './utils/exportPsd.js'
import { calculateAutoPlacement } from './utils/autoPlacement.js'
import { fileToDataUrl } from './utils/imageData.js'
import { constrainRankPosition } from './utils/rankPosition.js'
import {
  loadCloudProjectCollection,
  loadWorkspaces,
  saveCloudProjectCollection,
} from './services/accountApi.js'
import './App.css'

const DEFAULT_RENDER_TRANSFORM = {
  x: 0,
  y: 0,
  scale: 1,
  flipped: false,
  opacity: 100,
}

const DEFAULT_SECONDARY_RENDER_TRANSFORM = {
  secondaryX: 18,
  secondaryY: 0,
  secondaryScale: 1,
  secondaryFlipped: false,
  secondaryOpacity: 100,
}

const createInitialPlayers = (template = zeroTemplate) =>
  template.slots.map((slot) => ({
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
    rankX: slot.rank.x,
    rankY: slot.rank.y,
    rankSize: slot.rank.size,
    rankColor: slot.rank.color,
    rankLayer: slot.rank.layer,
    ...DEFAULT_RENDER_TRANSFORM,
    ...DEFAULT_SECONDARY_RENDER_TRANSFORM,
  }))

const initialPlayers = createInitialPlayers(zeroTemplate)

const remapPlayersToTemplate = (currentPlayers, template) =>
  createInitialPlayers(template).map((defaultPlayer) => {
    const currentPlayer = currentPlayers.find(({ id }) => id === defaultPlayer.id)
    if (!currentPlayer) return defaultPlayer
    const slot = template.slots.find(({ id }) => id === defaultPlayer.id)
    const remappedPlayer = {
      ...defaultPlayer,
      ...currentPlayer,
      placement: defaultPlayer.placement,
      rankX: defaultPlayer.rankX,
      rankY: defaultPlayer.rankY,
      rankSize: defaultPlayer.rankSize,
      rankColor: defaultPlayer.rankColor,
    }
    return { ...remappedPlayer, ...constrainRankPosition(remappedPlayer, slot) }
  })

const createInitialEventDetails = () => ({
  eventName: t('Nom du tournoi'),
  subtitle: '',
  date: '00/00/0000',
  participantCount: '00',
  eventType: 'weekly',
  tournamentLogo: '',
  tournamentLogoName: '',
})

const INITIAL_SELECTED_LAYER = {
  playerId: zeroTemplate.slots[0].id,
  layer: 'primary',
}

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const restorePersistentImage = (source) =>
  typeof source === 'string' && source.startsWith('data:') ? source : ''

const loadRenderSource = async (characterId, renderId) => {
  const render = getCharacter(characterId)?.renders.find(
    (candidate) => candidate.id === renderId,
  )
  return render ? render.load() : ''
}

const restorePlayers = async (
  savedPlayers = [],
  template = zeroTemplate,
  shouldResetTemplateFields = false,
) => {
  const safeSavedPlayers = Array.isArray(savedPlayers) ? savedPlayers : []

  return Promise.all(
    createInitialPlayers(template).map(async (defaultPlayer) => {
      const savedPlayer = safeSavedPlayers.find(
        (candidate) => isObject(candidate) && candidate.id === defaultPlayer.id,
      )
      const player = {
        ...defaultPlayer,
        ...(savedPlayer || {}),
        teamLogo: restorePersistentImage(savedPlayer?.teamLogo),
        ...(shouldResetTemplateFields
          ? {
              rankX: defaultPlayer.rankX,
              rankY: defaultPlayer.rankY,
              rankSize: defaultPlayer.rankSize,
              rankColor: defaultPlayer.rankColor,
              rankLayer: defaultPlayer.rankLayer,
            }
          : {}),
      }
      const slot = template.slots.find(({ id }) => id === player.id)
      const restoredPlayer = slot
        ? { ...player, ...constrainRankPosition(player, slot) }
        : player
      const [render, secondaryRender] = await Promise.all([
        loadRenderSource(restoredPlayer.character, restoredPlayer.renderId).catch(() => ''),
        loadRenderSource(
          restoredPlayer.secondaryCharacter,
          restoredPlayer.secondaryRenderId,
        ).catch(() => ''),
      ])

      return { ...restoredPlayer, render, secondaryRender }
    }),
  )
}

const createPersistableProject = ({
  players,
  eventDetails,
  selectedLayer,
  exportScale,
  template,
}) => ({
  templateId: template.id,
  templateRevision: template.revision,
  ...(template.generated
    ? {
        generatedTemplate: Object.fromEntries(
          Object.entries(template).filter(([key]) => key !== 'defaultTournamentLogo'),
        ),
      }
    : {}),
  generationBrief: template.generationBrief,
  paletteState: createPersistablePaletteState(template),
  players: players.map((player) => {
    const persistablePlayer = { ...player }
    delete persistablePlayer.render
    delete persistablePlayer.secondaryRender
    delete persistablePlayer.autoPlacementDebug
    return persistablePlayer
  }),
  eventDetails,
  selectedLayer,
  exportScale,
})

const restoreProjectState = async (savedProject = {}) => {
  const project = isObject(savedProject) ? savedProject : {}
  const savedGeneratedTemplate = isObject(project.generatedTemplate)
    ? {
        ...project.generatedTemplate,
        generationBrief:
          project.generationBrief || project.generatedTemplate.generationBrief,
      }
    : project.generatedTemplate
  const template = getTemplate(
    project.templateId,
    savedGeneratedTemplate,
    project.paletteState,
  )
  const players = await restorePlayers(
    project.players,
    template,
    project.templateId !== template.id ||
      project.templateRevision !== template.revision,
  )
  const eventDetails = {
    ...createInitialEventDetails(),
    ...(isObject(project.eventDetails) ? project.eventDetails : {}),
    tournamentLogo: restorePersistentImage(
      project.eventDetails?.tournamentLogo,
    ),
  }
  const hasValidSelectedLayer =
    isObject(project.selectedLayer) &&
    ['primary', 'secondary'].includes(project.selectedLayer.layer) &&
    template.slots.some(
      (slot) => slot.id === project.selectedLayer.playerId,
    )

  return {
    players,
    eventDetails,
    selectedLayer: hasValidSelectedLayer
      ? project.selectedLayer
      : INITIAL_SELECTED_LAYER,
    exportScale: [1, 2, 4].includes(project.exportScale)
      ? project.exportScale
      : 4,
    template,
  }
}

const getSaveErrorMessage = (error) =>
  isStorageQuotaError(error)
    ? msg("Sauvegarde impossible : les logos dépassent l’espace disponible.")
    : msg("La sauvegarde a échoué.")

const cloneProjectData = (data) => {
  if (globalThis.structuredClone) return structuredClone(data)
  return JSON.parse(JSON.stringify(data))
}

const getAvailableCopyName = (name, projects) => {
  const baseName = t('{0} - Copie', { 0: name })
  const existingNames = new Set(projects.map((project) => project.name))
  if (!existingNames.has(baseName)) return baseName

  let copyNumber = 2
  while (existingNames.has(`${baseName} ${copyNumber}`)) copyNumber += 1
  return `${baseName} ${copyNumber}`
}

function App({ currentUser, onLogout }) {
  useLanguage()
  const canvasRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const projectCollectionRef = useRef(null)
  const cloudSaveQueueRef = useRef(Promise.resolve())
  const cloudSaveGenerationRef = useRef(0)
  const cloudRevisionRef = useRef(0)
  const skipNextAutoSaveRef = useRef(false)
  const [players, setPlayers] = useState(initialPlayers)
  const [selectedLayer, setSelectedLayer] = useState(INITIAL_SELECTED_LAYER)
  const [exportScale, setExportScale] = useState(4)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState('')
  const [exportError, setExportError] = useState('')
  const [isRestoring, setIsRestoring] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(() => msg("Chargement de la sauvegarde…"))
  const [eventDetails, setEventDetails] = useState(() => createInitialEventDetails())
  const [autoPlacementTarget, setAutoPlacementTarget] = useState('')
  const [projectCollection, setProjectCollection] = useState(null)
  const [requiresProjectCreation, setRequiresProjectCreation] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState(zeroTemplate)
  const [isPaletteEditorOpen, setIsPaletteEditorOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(currentUser.id)
  const [workspaces, setWorkspaces] = useState([])
  const [hasCloudConflict, setHasCloudConflict] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const playersRef = useRef(players)
  playersRef.current = players

  const applyRestoredState = useCallback((restoredState) => {
    setPlayers(restoredState.players)
    setEventDetails(restoredState.eventDetails)
    setSelectedLayer(restoredState.selectedLayer)
    setExportScale(restoredState.exportScale)
    setActiveTemplate(restoredState.template)
  }, [])

  const setCollection = useCallback((collection) => {
    projectCollectionRef.current = collection
    setProjectCollection(collection)
  }, [])

  const refreshWorkspaces = useCallback(async () => {
    try {
      const result = await loadWorkspaces()
      setWorkspaces(result.workspaces)
      return result.workspaces
    } catch (error) {
      console.error(error)
      return []
    }
  }, [])

  const syncCollectionToCloud = useCallback((collection) => {
    const generation = cloudSaveGenerationRef.current + 1
    cloudSaveGenerationRef.current = generation
    setSaveStatus(msg("Sauvegarde cloud…"))

    cloudSaveQueueRef.current = cloudSaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveCloudProjectCollection(collection, {
        workspaceId: activeWorkspaceId,
        baseRevision: cloudRevisionRef.current,
      }))
      .then((result) => {
        cloudRevisionRef.current = result.revision
        setHasCloudConflict(false)
        if (cloudSaveGenerationRef.current === generation) {
          setSaveStatus(msg("Sauvegardé sur le cloud"))
        }
      })
      .catch((error) => {
        console.error(error)
        if (error.status === 409) setHasCloudConflict(true)
        if (cloudSaveGenerationRef.current === generation) {
          setSaveStatus(error.status === 409
            ? msg("Conflit détecté — charge la version distante avant de continuer")
            : msg("Cloud indisponible — modifications conservées sur cet appareil"))
        }
      })

    return cloudSaveQueueRef.current
  }, [activeWorkspaceId])

  const storeCollection = useCallback((collection, syncCloud = true) => {
    const normalizedCollection = saveProjectCollection(collection, activeWorkspaceId)
    setCollection(normalizedCollection)
    if (syncCloud) syncCollectionToCloud(normalizedCollection)
    return normalizedCollection
  }, [activeWorkspaceId, setCollection, syncCollectionToCloud])

  useEffect(() => {
    refreshWorkspaces()
  }, [refreshWorkspaces])

  useEffect(() => {
    let isActive = true

    const restoreProject = async () => {
      try {
        let collection = null
        let cloudIsAvailable = true
        let isNewWorkspace = false

        try {
          const cloudWorkspace = await loadCloudProjectCollection(activeWorkspaceId)
          collection = cloudWorkspace.collection
          cloudRevisionRef.current = cloudWorkspace.revision || 0
        } catch (error) {
          console.error(error)
          cloudIsAvailable = false
        }

        if (!collection) collection = loadProjectCollection(activeWorkspaceId)
        if (!collection) {
          isNewWorkspace = true
          collection = createProjectCollection(
            createPersistableProject({
              players: createInitialPlayers(),
              eventDetails: createInitialEventDetails(),
              selectedLayer: INITIAL_SELECTED_LAYER,
              exportScale: 4,
              template: zeroTemplate,
            }),
            createInitialEventDetails().eventName,
          )
        }
        collection = storeCollection(collection, false)
        const activeProject = collection.projects[collection.activeProjectId]
        const restoredState = await restoreProjectState(activeProject?.data)
        if (!isActive) return

        applyRestoredState(restoredState)
        setRequiresProjectCreation(isNewWorkspace)
        setSaveStatus(
          isNewWorkspace
            ? msg("Crée ton premier projet")
            : cloudIsAvailable
            ? msg("Sauvegardé sur le cloud")
            : msg("Cloud indisponible — modifications conservées sur cet appareil"),
        )
      } catch (error) {
        console.error(error)
        if (isActive) setSaveStatus(msg("Impossible de restaurer la sauvegarde."))
      } finally {
        if (isActive) setIsRestoring(false)
      }
    }

    restoreProject()
    return () => {
      isActive = false
    }
  }, [activeWorkspaceId, applyRestoredState, storeCollection])

  const persistCurrentProject = useCallback(() => {
    if (!projectCollectionRef.current) return null
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setIsSaving(true)
    setSaveStatus(msg("Sauvegarde…"))

    try {
      const nextCollection = updateActiveProjectData(
        projectCollectionRef.current,
        createPersistableProject({
          players,
          eventDetails,
          selectedLayer,
          exportScale,
          template: activeTemplate,
        }),
      )
      return storeCollection(nextCollection)
    } catch (error) {
      console.error(error)
      setSaveStatus(getSaveErrorMessage(error))
      return null
    } finally {
      setIsSaving(false)
    }
  }, [activeTemplate, eventDetails, exportScale, players, selectedLayer, storeCollection])

  const reloadWorkspaceFromCloud = useCallback(async () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setIsRestoring(true)
    setSaveStatus(msg("Synchronisation de l’espace de travail…"))
    try {
      const remote = await loadCloudProjectCollection(activeWorkspaceId)
      if (!remote.collection) return
      cloudRevisionRef.current = remote.revision || 0
      const currentProjectId = projectCollectionRef.current?.activeProjectId
      const synchronizedCollection = remote.collection.projects?.[currentProjectId]
        ? { ...remote.collection, activeProjectId: currentProjectId }
        : remote.collection
      const normalized = saveProjectCollection(synchronizedCollection, activeWorkspaceId)
      setCollection(normalized)
      const activeProject = normalized.projects[normalized.activeProjectId]
      skipNextAutoSaveRef.current = true
      applyRestoredState(await restoreProjectState(activeProject?.data))
      setHasCloudConflict(false)
      setSaveStatus(msg("Synchronisé avec les collaborateurs"))
    } catch (error) {
      console.error(error)
      setSaveStatus(msg("Impossible de charger la version distante."))
    } finally {
      setIsRestoring(false)
    }
  }, [activeWorkspaceId, applyRestoredState, setCollection])

  const selectWorkspace = useCallback(async (workspaceId) => {
    if (!workspaceId || workspaceId === activeWorkspaceId || isRestoring) return
    if (!requiresProjectCreation) persistCurrentProject()
    setIsRestoring(true)
    setSaveStatus(msg("Changement d’espace de travail…"))
    await cloudSaveQueueRef.current.catch(() => undefined)
    cloudRevisionRef.current = 0
    cloudSaveGenerationRef.current += 1
    setHasCloudConflict(false)
    setActiveWorkspaceId(workspaceId)
  }, [activeWorkspaceId, isRestoring, persistCurrentProject, requiresProjectCreation])

  useEffect(() => {
    if (
      isRestoring ||
      requiresProjectCreation ||
      !projectCollectionRef.current
    ) return undefined

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false
      return undefined
    }
    setSaveStatus(msg("Sauvegarde…"))
    saveTimeoutRef.current = window.setTimeout(persistCurrentProject, 600)
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [isRestoring, persistCurrentProject, requiresProjectCreation])

  useEffect(() => {
    if (isRestoring || requiresProjectCreation) return undefined
    const interval = window.setInterval(async () => {
      if (saveTimeoutRef.current || hasCloudConflict) return
      const available = await refreshWorkspaces()
      const remoteWorkspace = available.find(({ id }) => id === activeWorkspaceId)
      if ((remoteWorkspace?.revision || 0) > cloudRevisionRef.current) {
        await reloadWorkspaceFromCloud()
      }
    }, 5000)
    return () => window.clearInterval(interval)
  }, [activeWorkspaceId, hasCloudConflict, isRestoring, refreshWorkspaces, reloadWorkspaceFromCloud, requiresProjectCreation])

  const updatePlayer = useCallback((id, changes) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        if (player.id !== id) return player

        const nextPlayer = { ...player, ...changes }
        const slot = activeTemplate.slots.find((candidate) => candidate.id === id)
        return slot
          ? { ...nextPlayer, ...constrainRankPosition(nextPlayer, slot) }
          : nextPlayer
      }),
    )
  }, [activeTemplate])

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target
      const isTyping = target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      )

      if (event.key === 'Escape' && isShortcutsOpen) {
        setIsShortcutsOpen(false)
        return
      }
      if (isTyping) return
      if (event.key === '?') {
        event.preventDefault()
        setIsShortcutsOpen(true)
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        persistCurrentProject()
        return
      }
      if (isShortcutsOpen || event.metaKey || event.ctrlKey || event.altKey) return

      const player = players.find(({ id }) => id === selectedLayer.playerId)
      if (!player) return
      const secondary = selectedLayer.layer === 'secondary'
      const hasRender = secondary ? player.secondaryRender : player.render

      if (event.key === '1' && player.render) {
        event.preventDefault()
        setSelectedLayer({ playerId: player.id, layer: 'primary' })
        return
      }
      if (event.key === '2' && player.secondaryRender) {
        event.preventDefault()
        setSelectedLayer({ playerId: player.id, layer: 'secondary' })
        return
      }
      if (!hasRender) return

      const keys = secondary
        ? { x: 'secondaryX', y: 'secondaryY', scale: 'secondaryScale', flipped: 'secondaryFlipped', opacity: 'secondaryOpacity' }
        : { x: 'x', y: 'y', scale: 'scale', flipped: 'flipped', opacity: 'opacity' }
      const movement = event.shiftKey ? 5 : 1
      const changes = {}

      if (event.key === 'ArrowLeft') changes[keys.x] = player[keys.x] - movement
      else if (event.key === 'ArrowRight') changes[keys.x] = player[keys.x] + movement
      else if (event.key === 'ArrowUp') changes[keys.y] = player[keys.y] - movement
      else if (event.key === 'ArrowDown') changes[keys.y] = player[keys.y] + movement
      else if (['+', '='].includes(event.key)) {
        changes[keys.scale] = Math.min(2.5, Math.round((player[keys.scale] + 0.05) * 100) / 100)
      } else if (event.key === '-') {
        changes[keys.scale] = Math.max(0.25, Math.round((player[keys.scale] - 0.05) * 100) / 100)
      } else if (event.key.toLowerCase() === 'f') {
        changes[keys.flipped] = !player[keys.flipped]
      } else if (event.key === '[') {
        changes[keys.opacity] = Math.max(0, player[keys.opacity] - 5)
      } else if (event.key === ']') {
        changes[keys.opacity] = Math.min(100, player[keys.opacity] + 5)
      } else return

      event.preventDefault()
      updatePlayer(player.id, changes)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [isShortcutsOpen, persistCurrentProject, players, selectedLayer, updatePlayer])

  const updateEventDetails = (changes) => {
    setEventDetails((current) => ({ ...current, ...changes }))
  }

  const calculatePlayerPlacement = (player) => {
    const slot = activeTemplate.slots.find(({ id }) => id === player.id)
    return calculateAutoPlacement({
      slot,
      template: activeTemplate,
      primaryRender: player.render,
      secondaryRender: player.secondaryRender,
      primaryCharacter: player.character,
      secondaryCharacter: player.secondaryCharacter,
      protectedZones: [
        {
          type: 'circle',
          kind: 'rank',
          x: player.rankX - slot.x,
          y: player.rankY - slot.y,
          radius: player.rankSize * 0.58,
          weight: 1,
        },
      ],
    })
  }

  const autoPlacePlayer = async (playerId) => {
    if (autoPlacementTarget) return
    const player = playersRef.current.find(({ id }) => id === playerId)
    if (!player?.render) return

    setAutoPlacementTarget(playerId)
    try {
      updatePlayer(playerId, await calculatePlayerPlacement(player))
    } finally {
      setAutoPlacementTarget('')
    }
  }

  const autoPlaceAllPlayers = async () => {
    if (autoPlacementTarget) return
    setAutoPlacementTarget('all')
    try {
      const placements = await Promise.all(
        players.map(async (player) => ({
          playerId: player.id,
          changes: player.render ? await calculatePlayerPlacement(player) : null,
        })),
      )
      setPlayers((currentPlayers) =>
        currentPlayers.map((player) => {
          const placement = placements.find(({ playerId }) => playerId === player.id)
          return placement?.changes ? { ...player, ...placement.changes } : player
        }),
      )
    } finally {
      setAutoPlacementTarget('')
    }
  }

  const selectCharacter = async (playerId, characterId, secondary = false) => {
    const character = getCharacter(characterId)
    const firstRender = character?.renders[0]
    const renderId = firstRender?.id || ''
    const characterKey = secondary ? 'secondaryCharacter' : 'character'
    const renderIdKey = secondary ? 'secondaryRenderId' : 'renderId'
    const renderKey = secondary ? 'secondaryRender' : 'render'
    const layer = secondary ? 'secondary' : 'primary'

    if (characterId) setSelectedLayer({ playerId, layer })

    updatePlayer(playerId, {
      [characterKey]: characterId,
      [renderIdKey]: renderId,
      [renderKey]: '',
      ...(secondary
        ? DEFAULT_SECONDARY_RENDER_TRANSFORM
        : DEFAULT_RENDER_TRANSFORM),
    })

    if (!firstRender) {
      if (secondary && !characterId) {
        const currentPlayer = playersRef.current.find(
          (player) => player.id === playerId,
        )
        if (currentPlayer?.render) {
          const playerWithoutSecondary = {
            ...currentPlayer,
            secondaryCharacter: '',
            secondaryRenderId: '',
            secondaryRender: '',
          }
          const autoPlacement = await calculatePlayerPlacement(
            playerWithoutSecondary,
          )
          setPlayers((currentPlayers) =>
            currentPlayers.map((player) =>
              player.id === playerId && !player.secondaryCharacter
                ? { ...player, ...autoPlacement }
                : player,
            ),
          )
        }
      }
      return
    }

    const render = await firstRender.load()
    const currentPlayer = playersRef.current.find((player) => player.id === playerId)
    const playerWithRender = {
      ...currentPlayer,
      [characterKey]: characterId,
      [renderIdKey]: renderId,
      [renderKey]: render,
      ...(secondary
        ? DEFAULT_SECONDARY_RENDER_TRANSFORM
        : DEFAULT_RENDER_TRANSFORM),
    }
    const autoPlacement = await calculatePlayerPlacement(playerWithRender)
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId &&
        player[characterKey] === characterId &&
        player[renderIdKey] === renderId
          ? { ...player, [renderKey]: render, ...autoPlacement }
          : player,
      ),
    )
  }

  const selectRender = async (
    playerId,
    characterId,
    renderId,
    secondary = false,
  ) => {
    const selectedRender = getCharacter(characterId)?.renders.find(
      (render) => render.id === renderId,
    )

    const characterKey = secondary ? 'secondaryCharacter' : 'character'
    const renderIdKey = secondary ? 'secondaryRenderId' : 'renderId'
    const renderKey = secondary ? 'secondaryRender' : 'render'
    const layer = secondary ? 'secondary' : 'primary'

    if (renderId) setSelectedLayer({ playerId, layer })

    updatePlayer(playerId, { [renderIdKey]: renderId, [renderKey]: '' })
    if (!selectedRender) return

    const render = await selectedRender.load()
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId &&
        player[characterKey] === characterId &&
        player[renderIdKey] === renderId
          ? { ...player, [renderKey]: render }
          : player,
      ),
    )
  }

  const selectTeamLogo = async (playerId, file) => {
    try {
      const teamLogo = file ? await fileToDataUrl(file) : ''
      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === playerId
            ? {
                ...player,
                teamLogo,
                teamLogoName: file?.name || '',
              }
            : player,
        ),
      )
    } catch (error) {
      console.error(error)
      setSaveStatus(msg("Le logo d’équipe n’a pas pu être importé."))
    }
  }

  const selectTournamentLogo = async (file) => {
    try {
      const tournamentLogo = file ? await fileToDataUrl(file) : ''
      updateEventDetails({
        tournamentLogo,
        tournamentLogoName: file?.name || '',
      })
    } catch (error) {
      console.error(error)
      setSaveStatus(msg("Le logo du tournoi n'a pas pu être importé."))
    }
  }

  const importStartggTop8 = async (importedProject) => {
    const importedPlayers = await Promise.all(
      players.map(async (currentPlayer, index) => {
        const importedPlayer = importedProject.players[index]
        if (!importedPlayer) {
          return {
            ...currentPlayer,
            playerName: '',
            character: '',
            renderId: '',
            render: '',
            secondaryCharacter: '',
            secondaryRenderId: '',
            secondaryRender: '',
          }
        }

        const mappedCharacterIds = [
          ...new Set(
            importedPlayer.characters
              .map((character) => character.localId)
              .filter(Boolean),
          ),
        ].slice(0, 2)
        const [primaryId = '', secondaryId = ''] = mappedCharacterIds
        const primaryRender = getCharacter(primaryId)?.renders[0]
        const secondaryRender = getCharacter(secondaryId)?.renders[0]
        const [render, secondaryRenderSource] = await Promise.all([
          primaryRender?.load().catch(() => '') || '',
          secondaryRender?.load().catch(() => '') || '',
        ])

        const playerWithRenders = {
          ...currentPlayer,
          placement: importedPlayer.placement,
          playerName: importedPlayer.gamerTag,
          character: primaryId,
          renderId: primaryRender?.id || '',
          render,
          secondaryCharacter: secondaryId,
          secondaryRenderId: secondaryRender?.id || '',
          secondaryRender: secondaryRenderSource,
        }
        return {
          ...playerWithRenders,
          ...(render ? await calculatePlayerPlacement(playerWithRenders) : {}),
        }
      }),
    )

    setPlayers(importedPlayers)
    setEventDetails((current) => ({
      ...current,
      eventName: importedProject.eventName || current.eventName,
      date: importedProject.date || current.date,
      participantCount:
        importedProject.participantCount || current.participantCount,
    }))

    const firstPlayerWithRender = importedPlayers.find((player) => player.character)
    if (firstPlayerWithRender) {
      setSelectedLayer({ playerId: firstPlayerWithRender.id, layer: 'primary' })
    }
  }

  const loadProject = async (collection, projectId) => {
    const project = collection.projects[projectId]
    if (!project) return

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setIsRestoring(true)
    setSaveStatus(msg("Chargement du projet…"))

    try {
      const nextCollection = { ...collection, activeProjectId: projectId }
      storeCollection(nextCollection)
      applyRestoredState(await restoreProjectState(project.data))
    } catch (error) {
      console.error(error)
      setSaveStatus(
        isStorageQuotaError(error)
          ? getSaveErrorMessage(error)
          : msg("Impossible de charger ce projet."),
      )
    } finally {
      setIsRestoring(false)
    }
  }

  const selectProject = async (projectId) => {
    if (
      isRestoring ||
      projectId === projectCollectionRef.current?.activeProjectId
    ) return
    const savedCollection = persistCurrentProject()
    if (savedCollection) await loadProject(savedCollection, projectId)
  }

  const createProject = async (
    name,
    templateChoice = ZERO_TEMPLATE_ID,
    generationBrief,
    previewSeed,
  ) => {
    if (isRestoring) return
    const savedCollection = requiresProjectCreation
      ? projectCollectionRef.current
      : persistCurrentProject()
    if (!savedCollection) return

    const template = templateChoice === 'generate'
      ? generateTemplate({ brief: generationBrief, seed: previewSeed })
      : zeroTemplate
    const tournament = generationBrief?.tournament
    const initialEventDetails = template.generated
      ? {
          ...createInitialEventDetails(),
          eventName: tournament?.name || createInitialEventDetails().eventName,
          subtitle: tournament?.subtitle || '',
          date: tournament?.date || createInitialEventDetails().date,
          participantCount: tournament?.entrants || createInitialEventDetails().participantCount,
          eventType: tournament?.eventType || createInitialEventDetails().eventType,
        }
      : createInitialEventDetails()
    const newProjectData = createPersistableProject({
      players: createInitialPlayers(template),
      eventDetails: initialEventDetails,
      selectedLayer: INITIAL_SELECTED_LAYER,
      exportScale: 4,
      template,
    })
    const newProject = createProjectRecord({ name, data: newProjectData })
    const nextCollection = requiresProjectCreation
      ? {
          version: savedCollection.version,
          activeProjectId: newProject.id,
          projects: { [newProject.id]: newProject },
        }
      : {
          ...savedCollection,
          activeProjectId: newProject.id,
          projects: {
            ...savedCollection.projects,
            [newProject.id]: newProject,
          },
        }
    setRequiresProjectCreation(false)
    await loadProject(nextCollection, newProject.id)
  }

  const regenerateProjectTemplate = () => {
    if (!activeTemplate.generated || isRestoring) return
    const shouldRegenerate = window.confirm(
      t("Régénérer le modèle de ce projet ? La composition actuelle sera remplacée."),
    )
    if (!shouldRegenerate) return

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setIsSaving(true)
    setSaveStatus(msg("Génération du modèle…"))

    try {
      const generatedTemplate = generateTemplate({
        brief: activeTemplate.generationBrief,
        previousSignature: `${activeTemplate.familyId}:${activeTemplate.layoutId}`,
        previousTemplate: activeTemplate,
      })
      const template = applyPaletteStateToTemplate(generatedTemplate, {
        originalPalette: activeTemplate.originalPalette,
        currentPalette: activeTemplate.palette,
        locks: activeTemplate.paletteLocks,
      })
      const remappedPlayers = remapPlayersToTemplate(players, template)
      const nextCollection = updateActiveProjectData(
        projectCollectionRef.current,
        createPersistableProject({
          players: remappedPlayers,
          eventDetails,
          selectedLayer,
          exportScale,
          template,
        }),
      )
      storeCollection(nextCollection)
      setPlayers(remappedPlayers)
      setActiveTemplate(template)
    } catch (error) {
      console.error(error)
      setSaveStatus(getSaveErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const updateTemplatePalette = useCallback((palette, locks) => {
    const nextTemplate = applyPaletteStateToTemplate(
      activeTemplate,
      {
        originalPalette: activeTemplate.originalPalette,
        currentPalette: palette,
        locks,
      },
    )
    setActiveTemplate(nextTemplate)
    setPlayers((currentPlayers) => currentPlayers.map((player) => {
      const slot = nextTemplate.slots.find(({ id }) => id === player.id)
      return {
        ...player,
        rankColor: nextTemplate.generated
          ? slot?.rank?.color || palette.text
          : player.placement === 1 ? palette.winner : palette.text,
      }
    }))
  }, [activeTemplate])
  const closePaletteEditor = useCallback(() => setIsPaletteEditorOpen(false), [])

  const renameProject = (name) => {
    const collection = projectCollectionRef.current
    const activeProject = collection?.projects?.[collection.activeProjectId]
    if (!activeProject || name === activeProject.name) return

    const nextCollection = {
      ...collection,
      projects: {
        ...collection.projects,
        [activeProject.id]: { ...activeProject, name },
      },
    }
    try {
      storeCollection(nextCollection)
    } catch (error) {
      console.error(error)
      setSaveStatus(getSaveErrorMessage(error))
    }
  }

  const duplicateProject = async () => {
    if (isRestoring) return
    const savedCollection = persistCurrentProject()
    if (!savedCollection) return
    const sourceProject = savedCollection.projects[savedCollection.activeProjectId]
    const projects = Object.values(savedCollection.projects)
    const duplicate = createProjectRecord({
      name: getAvailableCopyName(sourceProject.name, projects),
      data: cloneProjectData(sourceProject.data),
    })
    const nextCollection = {
      ...savedCollection,
      activeProjectId: duplicate.id,
      projects: { ...savedCollection.projects, [duplicate.id]: duplicate },
    }
    await loadProject(nextCollection, duplicate.id)
  }

  const deleteProject = async () => {
    const collection = projectCollectionRef.current
    const activeProject = collection?.projects?.[collection.activeProjectId]
    if (!activeProject || isRestoring) return
    if (!window.confirm(t("Supprimer définitivement le projet \"{0}\" ?", { 0: activeProject.name }))) return

    const remainingProjects = { ...collection.projects }
    delete remainingProjects[activeProject.id]
    let nextProject = Object.values(remainingProjects)[0]

    if (!nextProject) {
      const emptyData = createPersistableProject({
        players: createInitialPlayers(),
        eventDetails: createInitialEventDetails(),
        selectedLayer: INITIAL_SELECTED_LAYER,
        exportScale: 4,
        template: zeroTemplate,
      })
      nextProject = createProjectRecord({ name: t("Nouveau projet"), data: emptyData })
      remainingProjects[nextProject.id] = nextProject
    }

    await loadProject(
      {
        ...collection,
        activeProjectId: nextProject.id,
        projects: remainingProjects,
      },
      nextProject.id,
    )
  }

  const exportPng = async () => {
    if (isExporting) return

    setIsExporting(true)
    setExportType('png')
    setExportError('')

    try {
      await exportTop8AsPng({
        canvasNode: canvasRef.current,
        eventName: eventDetails.eventName,
        scale: exportScale,
        width: activeTemplate.width,
        height: activeTemplate.height,
      })
    } catch (error) {
      console.error(error)
      setExportError(msg("L'export a échoué. Vérifie les images puis réessaie."))
    } finally {
      setIsExporting(false)
      setExportType('')
    }
  }

  const logout = async () => {
    if (saveTimeoutRef.current) persistCurrentProject()
    setIsSaving(true)
    try {
      await cloudSaveQueueRef.current.catch(() => undefined)
      await onLogout()
    } catch (error) {
      console.error(error)
      setSaveStatus(msg("Déconnexion impossible. Réessaie."))
    } finally {
      setIsSaving(false)
    }
  }

  const exportPsd = async () => {
    if (isExporting) return

    setIsExporting(true)
    setExportType('psd')
    setExportError('')

    try {
      await exportTop8AsPsd({
        canvasNode: canvasRef.current,
        eventName: eventDetails.eventName,
        scale: exportScale,
        width: activeTemplate.width,
        height: activeTemplate.height,
        template: activeTemplate,
        players,
      })
    } catch (error) {
      console.error(error)
      setExportError(error.message || msg("L'export PSD a échoué. Réessaie en x2."))
    } finally {
      setIsExporting(false)
      setExportType('')
    }
  }

  return (
    <main className="app-shell">
      <aside className="editor-panel" aria-labelledby="app-title">
        <header className="app-header">
          <div className="app-brand">
            <div>
              <p className="eyebrow">BracketCanvas</p>
              <h1 id="app-title">{t("Éditeur Top 8")}</h1>
            </div>
          </div>
          <p className="app-intro">{t("Compose le classement, ajuste les visuels des personnages et exporte le résultat final.")}</p>
        </header>

        <AccountMenu
          user={currentUser}
          disabled={isSaving || isRestoring}
          onLogout={logout}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />

        <CollaborationPanel
          currentUser={currentUser}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          disabled={isSaving || isRestoring}
          hasConflict={hasCloudConflict}
          onSelectWorkspace={selectWorkspace}
          onReloadRemote={reloadWorkspaceFromCloud}
          onRefreshWorkspaces={refreshWorkspaces}
        />

        <ProjectSwitcher
          projects={Object.values(projectCollection?.projects || {})}
          activeProjectId={projectCollection?.activeProjectId || ''}
          disabled={isRestoring || isSaving}
          onSelect={selectProject}
          onCreate={createProject}
          onRename={renameProject}
          onDuplicate={duplicateProject}
          onDelete={deleteProject}
          forceCreate={requiresProjectCreation}
        />

        <ProjectTemplatePanel
          template={activeTemplate}
          disabled={isRestoring || isSaving}
          onRegenerate={regenerateProjectTemplate}
          onEditPalette={() => setIsPaletteEditorOpen(true)}
        />

        <TemplateEditor
          details={eventDetails}
          onChange={updateEventDetails}
          onLogoChange={selectTournamentLogo}
        />

        <StartggImporter
          availableCharacterIds={characterLibrary.map(({ id }) => id)}
          onConfirm={importStartggTop8}
        />

        <section className="save-panel" aria-labelledby="save-title">
          <div>
            <p className="eyebrow">{t("Projet")}</p>
            <h2 id="save-title">{t("Sauvegarde cloud")}</h2>
          </div>
          <div className="save-actions">
            <button
              type="button"
              disabled={isSaving || isRestoring}
              onClick={persistCurrentProject}
            >
              {isSaving ? t("Sauvegarde…") : t("Sauvegarder")}
            </button>
          </div>
          <p role="status" aria-live="polite">{t(saveStatus)}</p>
        </section>

        <div className="players-heading players-heading-with-action">
          <div>
            <p className="eyebrow">{t("Classement")}</p>
            <h2>{t("Joueurs")}</h2>
          </div>
          <button
            className="auto-place-all-button"
            type="button"
            disabled={Boolean(autoPlacementTarget) || !players.some(({ render }) => render)}
            onClick={autoPlaceAllPlayers}
          >
            {autoPlacementTarget === 'all' ? t("Placement en cours…") : t("Placer automatiquement tous les personnages")}
          </button>
        </div>

        <div className="editor-list">
          {players.map((player, index) => (
            <PlayerEditor
              key={player.id}
              player={player}
              slotNumber={index + 1}
              characters={characterLibrary}
              canvasWidth={activeTemplate.width}
              canvasHeight={activeTemplate.height}
              selectedLayer={selectedLayer}
              onChange={(changes) => updatePlayer(player.id, changes)}
              onSelectLayer={(layer) =>
                setSelectedLayer({ playerId: player.id, layer })
              }
              onCharacterChange={(characterId) =>
                selectCharacter(player.id, characterId)
              }
              onRenderChange={(renderId) =>
                selectRender(player.id, player.character, renderId)
              }
              onSecondaryCharacterChange={(characterId) =>
                selectCharacter(player.id, characterId, true)
              }
              onSecondaryRenderChange={(renderId) =>
                selectRender(
                  player.id,
                  player.secondaryCharacter,
                  renderId,
                  true,
                )
              }
              onLogoChange={(file) => selectTeamLogo(player.id, file)}
              isAutoPlacing={
                autoPlacementTarget === 'all' || autoPlacementTarget === player.id
              }
              onAutoPlace={() => autoPlacePlayer(player.id)}
            />
          ))}
        </div>

      </aside>

      <section className="preview-panel" aria-labelledby="preview-title">
        <div className="preview-heading">
          <div>
            <p className="eyebrow">{t("Aperçu")}</p>
            <h2 id="preview-title">{t(activeTemplate.name)}</h2>
          </div>
          <div className="preview-actions">
            <span className="canvas-size">686 × 386 px</span>
            <KeyboardShortcuts
              isOpen={isShortcutsOpen}
              onOpen={() => setIsShortcutsOpen(true)}
              onClose={() => setIsShortcutsOpen(false)}
            />
            <div className="export-controls">
              <label htmlFor="export-scale">
                <span>{t("Qualité")}</span>
                <select
                  id="export-scale"
                  value={exportScale}
                  disabled={isExporting}
                  onChange={(event) => setExportScale(Number(event.target.value))}
                >
                  <option value={1}>x1</option>
                  <option value={2}>x2</option>
                  <option value={4}>x4</option>
                </select>
              </label>
              <button type="button" disabled={isExporting} onClick={exportPng}>
                {exportType === 'png' ? t("Export en cours…") : t("Exporter PNG")}
              </button>
              <button
                className="export-psd-button"
                type="button"
                disabled={isExporting}
                onClick={exportPsd}
              >
                {exportType === 'psd' ? t("Création du PSD…") : t("Exporter PSD")}
              </button>
            </div>
          </div>
        </div>

        <div className="canvas-frame">
          <Top8Canvas
            ref={canvasRef}
            template={activeTemplate}
            players={players}
            eventDetails={eventDetails}
            selectedLayer={selectedLayer}
            onPlayerChange={updatePlayer}
            onSelectLayer={(playerId, layer) =>
              setSelectedLayer({ playerId, layer })
            }
          />
        </div>
        <p className="preview-note">{t("Glisse les visuels des personnages et les numéros directement sur le canevas. Pince pour redimensionner.")}</p>
        <p className="export-status" role="status" aria-live="polite">
          {t(exportError)}
        </p>
      </section>
      {isPaletteEditorOpen && (
        <PaletteEditor
          template={activeTemplate}
          onClose={closePaletteEditor}
          onChange={updateTemplatePalette}
        />
      )}
      {isAdminOpen && currentUser.role === 'admin' && (
        <AdminPanel currentUserId={currentUser.id} onClose={() => setIsAdminOpen(false)} />
      )}
    </main>
  )
}

export default App
