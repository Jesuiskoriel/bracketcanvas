const WORKSPACES_STORAGE_KEY = 'ssbu-top8-maker:workspaces'
const LEGACY_STORAGE_KEY = 'ssbu-top8-maker:current-project'
const SAVE_VERSION = 1
const FALLBACK_PROJECT_NAME = 'Nouveau projet'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const nowIso = () => new Date().toISOString()

const getScopedStorageKey = (scope) => {
  const normalizedScope = typeof scope === 'string' ? scope.trim() : ''
  return normalizedScope
    ? `${WORKSPACES_STORAGE_KEY}:${normalizedScope}`
    : WORKSPACES_STORAGE_KEY
}

const normalizeName = (name, fallback = FALLBACK_PROJECT_NAME) => {
  const normalized = typeof name === 'string' ? name.trim() : ''
  return normalized || fallback
}

export const createProjectId = () => {
  if (globalThis.crypto?.randomUUID) return `project-${crypto.randomUUID()}`
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const createProjectRecord = ({ name, data, id, date } = {}) => {
  const timestamp = date || nowIso()
  const projectId = id || createProjectId()

  return {
    id: projectId,
    name: normalizeName(name, 'Nouveau projet'),
    createdAt: timestamp,
    updatedAt: timestamp,
    data: isObject(data) ? data : {},
  }
}

export const createProjectCollection = (data, name = FALLBACK_PROJECT_NAME) => {
  const project = createProjectRecord({ name, data })
  return {
    version: SAVE_VERSION,
    activeProjectId: project.id,
    projects: { [project.id]: project },
  }
}

const normalizeProjectRecord = (record, fallbackId) => {
  if (!isObject(record)) return null
  const id = typeof record.id === 'string' && record.id ? record.id : fallbackId
  if (!id) return null
  const createdAt = record.createdAt || record.updatedAt || nowIso()

  return {
    id,
    name: normalizeName(record.name, FALLBACK_PROJECT_NAME),
    createdAt,
    updatedAt: record.updatedAt || createdAt,
    data: isObject(record.data) ? record.data : {},
  }
}

const normalizeCollection = (value) => {
  if (!isObject(value) || !isObject(value.projects)) return null

  const projects = Object.entries(value.projects).reduce((result, [id, project]) => {
    const normalizedProject = normalizeProjectRecord(project, id)
    if (normalizedProject) result[normalizedProject.id] = normalizedProject
    return result
  }, {})
  const projectIds = Object.keys(projects)
  if (!projectIds.length) return null

  return {
    version: Number(value.version) || SAVE_VERSION,
    activeProjectId: projects[value.activeProjectId]
      ? value.activeProjectId
      : projectIds[0],
    projects,
    customCharacters: Array.isArray(value.customCharacters)
      ? value.customCharacters.filter(isObject)
      : [],
    customFonts: Array.isArray(value.customFonts)
      ? value.customFonts.filter(isObject)
      : [],
  }
}

const loadLegacyProject = () => {
  const serializedProject = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!serializedProject) return null
  try {
    const savedData = JSON.parse(serializedProject)
    if (!isObject(savedData)) return null
    return isObject(savedData.project) ? savedData.project : savedData
  } catch {
    return null
  }
}

export const saveProjectCollection = (collection, scope) => {
  const normalizedCollection = normalizeCollection(collection)
  if (!normalizedCollection) throw new Error('La collection de projets est invalide.')
  localStorage.setItem(
    getScopedStorageKey(scope),
    JSON.stringify(normalizedCollection),
  )
  return normalizedCollection
}

export const loadProjectCollection = (scope) => {
  const scopedStorageKey = getScopedStorageKey(scope)
  const serializedCollection = localStorage.getItem(scopedStorageKey)
  if (serializedCollection) {
    try {
      const collection = normalizeCollection(JSON.parse(serializedCollection))
      if (collection) return collection
    } catch {
      // Une sauvegarde illisible ne doit pas empêcher la migration de l'ancien format.
    }
  }

  if (scope) {
    const unscopedCollection = localStorage.getItem(WORKSPACES_STORAGE_KEY)
    if (unscopedCollection) {
      try {
        const migratedCollection = normalizeCollection(JSON.parse(unscopedCollection))
        if (migratedCollection) {
          saveProjectCollection(migratedCollection, scope)
          localStorage.removeItem(WORKSPACES_STORAGE_KEY)
          return migratedCollection
        }
      } catch {
        // Le cache historique illisible est ignoré.
      }
    }
  }

  const legacyProject = loadLegacyProject()
  if (!legacyProject) return null

  const projectName = normalizeName(
    legacyProject.eventDetails?.eventName,
    FALLBACK_PROJECT_NAME,
  )
  const migratedCollection = createProjectCollection(legacyProject, projectName)
  saveProjectCollection(migratedCollection, scope)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  return migratedCollection
}

export const updateActiveProjectData = (collection, data) => {
  const currentProject = collection?.projects?.[collection.activeProjectId]
  if (!currentProject) return collection
  const updatedProject = {
    ...currentProject,
    updatedAt: nowIso(),
    data: isObject(data) ? data : {},
  }

  return {
    ...collection,
    projects: {
      ...collection.projects,
      [currentProject.id]: updatedProject,
    },
  }
}

export const isStorageQuotaError = (error) =>
  error?.name === 'QuotaExceededError' ||
  error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
  error?.code === 22 ||
  error?.code === 1014

export const projectStorageKey = WORKSPACES_STORAGE_KEY
export const legacyProjectStorageKey = LEGACY_STORAGE_KEY
