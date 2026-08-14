import { useEffect, useRef, useState } from 'react'
import TemplateCreationWizard from './TemplateCreationWizard.jsx'

const PROJECT_NAME_MAX_LENGTH = 64

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="16" cy="8" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="16" cy="16" r="1" />
    </svg>
  )
}

function ProjectDialog({ mode, initialName, onCancel, onSubmit, required = false }) {
  const [name, setName] = useState(initialName)
  const [step, setStep] = useState('name')
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const designHeadingRef = useRef(null)
  const isCreateMode = mode === 'create'

  useEffect(() => {
    if (step === 'name') inputRef.current?.focus()
    else if (step === 'design') designHeadingRef.current?.focus()
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
      setError('Donne un nom au projet.')
      inputRef.current?.focus()
      return
    }
    if (isCreateMode) setStep('design')
    else onSubmit(normalizedName)
  }

  const chooseDesign = (templateChoice) => {
    if (templateChoice === 'generate') setStep('wizard')
    else onSubmit(name.trim(), templateChoice)
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
              <p className="eyebrow">{required ? 'Bienvenue dans BracketCanvas' : isCreateMode ? 'Étape 1 sur 2' : 'Workspace'}</p>
              <h2 id="project-dialog-title">
                {required ? 'Crée ton premier canvas' : isCreateMode ? 'Nouveau projet' : 'Renommer le projet'}
              </h2>
              {required && <p className="project-dialog-intro">Commence par donner un nom à ton projet. Tu choisiras son design juste après.</p>}
            </header>
            <form onSubmit={continueWithName}>
              <label className="text-control project-name-control" htmlFor="project-name">
                Nom du projet
                <input
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
              {error && <p id="project-name-error" className="project-dialog-error" role="alert">{error}</p>}
              <div className="project-dialog-actions">
                {!required && <button type="button" onClick={onCancel}>Annuler</button>}
                <button type="submit">{isCreateMode ? 'Continuer' : 'Renommer'}</button>
              </div>
            </form>
          </>
        ) : step === 'design' ? (
          <>
            <header>
              <p className="eyebrow">Étape 2 sur 2</p>
              <h2 id="project-dialog-title" ref={designHeadingRef} tabIndex="-1">
                Choisir le design du projet
              </h2>
              <p className="project-dialog-intro">Le choix reste propre à « {name.trim()} ».</p>
            </header>
            <div className="project-design-options">
              <button type="button" onClick={() => chooseDesign('zero')}>
                <span className="project-design-mark project-design-mark-zero">Z</span>
                <span><strong>Template Zero</strong><small>Utiliser le design actuel, sans aucune modification.</small></span>
              </button>
              <button type="button" onClick={() => chooseDesign('generate')}>
                <span className="project-design-mark"><DiceIcon /></span>
                <span><strong>Générer un nouveau template</strong><small>Créer localement une nouvelle DA et un nouveau layout.</small></span>
              </button>
            </div>
            <div className="project-dialog-actions project-dialog-actions-design">
              <button type="button" onClick={() => setStep('name')}>Retour</button>
              {!required && <button type="button" onClick={onCancel}>Annuler</button>}
            </div>
          </>
        ) : (
          <TemplateCreationWizard
            projectName={name.trim()}
            onBack={() => setStep('design')}
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
            <p className="eyebrow">Workspace</p>
            <h2 id="project-switcher-title">Projet actuel</h2>
          </div>
          <button
            className="project-create-button"
            type="button"
            disabled={disabled}
            onClick={() => setDialogMode('create')}
          >
            + Nouveau
          </button>
        </div>

        <label className="project-select-label" htmlFor="active-project">
          <span className="visually-hidden">Choisir le projet actuel</span>
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

        <div className="project-secondary-actions" aria-label="Actions du projet actuel">
          <button type="button" disabled={disabled || !activeProject} onClick={() => setDialogMode('rename')}>
            Renommer
          </button>
          <button type="button" disabled={disabled || !activeProject} onClick={onDuplicate}>
            Dupliquer
          </button>
          <button className="project-delete-button" type="button" disabled={disabled || !activeProject} onClick={onDelete}>
            Supprimer
          </button>
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
