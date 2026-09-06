import { msg, t, useLanguage } from '../i18n.js'
import { useEffect, useRef, useState } from 'react'
import TemplateCreationWizard from './TemplateCreationWizard.jsx'

const PROJECT_NAME_MAX_LENGTH = 64

function ProjectDialog({ mode, initialName, onCancel, onSubmit, required = false }) {
  useLanguage()
  const [name, setName] = useState(initialName)
  const [step, setStep] = useState('name')
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const isCreateMode = mode === 'create'

  useEffect(() => {
    if (step === 'name') inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (required) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onCancel, required])

  const continueWithName = (event) => {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError(msg("Donne un nom au projet."))
      inputRef.current?.focus()
      return
    }
    if (isCreateMode) setStep('wizard')
    else onSubmit(normalizedName)
  }

  return (
    <div
      className={`project-dialog-backdrop${required ? ' project-dialog-backdrop-required' : ''}`}
      role="presentation"
      onMouseDown={required ? undefined : onCancel}
    >
      <section
        className={`project-dialog${step === 'wizard' ? ' project-dialog-wizard' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {step === 'name' ? (
          <>
            <header>
              <p className="eyebrow">{required ? t("Bienvenue dans BracketCanvas") : isCreateMode ? t("Création") : t("Espace de travail")}</p>
              <h2 id="project-dialog-title">
                {required ? t("Crée ton premier canevas") : isCreateMode ? t("Nouveau projet") : t("Renommer le projet")}
              </h2>
              {required && <p className="project-dialog-intro">{t("Commence par donner un nom à ton projet. Tu créeras ensuite son identité visuelle.")}</p>}
            </header>
            <form onSubmit={continueWithName}>
              <label className="text-control project-name-control" htmlFor="project-name">{t("Nom du projet")}<input
                  ref={inputRef}
                  id="project-name"
                  name="projectName"
                  value={name}
                  maxLength={PROJECT_NAME_MAX_LENGTH}
                  autoComplete="off"
                  onChange={(event) => {
                    setName(event.target.value)
                    if (error) setError('')
                  }}
                  aria-describedby={error ? 'project-name-error' : undefined}
                  aria-invalid={Boolean(error)}
                />
              </label>
              {error && <p id="project-name-error" className="project-dialog-error" role="alert">{t(error)}</p>}
              <div className="project-dialog-actions">
                {!required && <button type="button" onClick={onCancel}>{t("Annuler")}</button>}
                <button type="submit">{isCreateMode ? t("Continuer") : t("Renommer")}</button>
              </div>
            </form>
          </>
        ) : (
          <TemplateCreationWizard
            projectName={name.trim()}
            onBack={() => setStep('name')}
            onCancel={onCancel}
            required={required}
            onSubmit={(brief, previewSeed) =>
              onSubmit(name.trim(), 'generate', brief, previewSeed)
            }
          />
        )}
      </section>
    </div>
  )
}

export default function ProjectSwitcher({
  projects,
  activeProjectId,
  disabled,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  forceCreate = false,
}) {
  useLanguage()
  const [dialogMode, setDialogMode] = useState('')
  const activeProject = projects.find(({ id }) => id === activeProjectId)

  useEffect(() => {
    if (forceCreate) setDialogMode('create')
  }, [forceCreate])

  const closeDialog = () => {
    if (!forceCreate) setDialogMode('')
  }
  const submitDialog = async (name, templateChoice, brief, previewSeed) => {
    if (dialogMode === 'create') {
      await onCreate(name, templateChoice, brief, previewSeed)
    }
    if (dialogMode === 'rename') await onRename(name)
    setDialogMode('')
  }

  return (
    <>
      <section className="project-switcher" aria-labelledby="project-switcher-title">
        <div className="project-switcher-heading">
          <div>
            <p className="eyebrow">{t("Espace de travail")}</p>
            <h2 id="project-switcher-title">{t("Projet actuel")}</h2>
          </div>
          <button
            className="project-create-button"
            type="button"
            disabled={disabled}
            onClick={() => setDialogMode('create')}
          >{t("+ Nouveau")}</button>
        </div>

        <label className="project-select-label" htmlFor="active-project">
          <span className="visually-hidden">{t("Choisir le projet actuel")}</span>
          <select
            id="active-project"
            value={activeProjectId || ''}
            disabled={disabled || !projects.length}
            onChange={(event) => onSelect(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>

        <div className="project-secondary-actions" aria-label={t("Actions du projet actuel")}>
          <button type="button" disabled={disabled || !activeProject} onClick={() => setDialogMode('rename')}>{t("Renommer")}</button>
          <button type="button" disabled={disabled || !activeProject} onClick={onDuplicate}>{t("Dupliquer")}</button>
          <button className="project-delete-button" type="button" disabled={disabled || !activeProject} onClick={onDelete}>{t("Supprimer")}</button>
        </div>
      </section>

      {dialogMode && (
        <ProjectDialog
          mode={dialogMode}
          initialName={dialogMode === 'rename' ? activeProject?.name || '' : ''}
          onCancel={closeDialog}
          onSubmit={submitDialog}
          required={forceCreate && dialogMode === 'create'}
        />
      )}
    </>
  )
}
