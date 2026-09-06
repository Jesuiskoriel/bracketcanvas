import { useMemo, useState } from 'react'
import {
  confirmPasswordReset,
  requestPasswordReset,
} from '../services/accountApi.js'

const getInitialMode = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('token') ? 'reset' : 'login'
}

export default function AuthScreen({ onLogin, onRegister }) {
  const resetToken = useMemo(
    () => new URLSearchParams(window.location.search).get('token') || '',
    [],
  )
  const [mode, setMode] = useState(getInitialMode)
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = mode === 'register'
  const isRequestingReset = mode === 'forgot'
  const isResettingPassword = mode === 'reset'

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (error) setError('')
    if (message) setMessage('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    setMessage('')
    try {
      if (isRequestingReset) {
        const result = await requestPasswordReset(form.email)
        setMessage(result.resetLink
          ? `Lien de reset dev : ${result.resetLink}`
          : result.message)
        return
      }
      if (isResettingPassword) {
        await confirmPasswordReset({ token: resetToken, password: form.password })
        window.history.replaceState({}, '', '/')
        setMode('login')
        setForm((current) => ({ ...current, password: '' }))
        setMessage('Mot de passe mis a jour. Tu peux te connecter.')
        return
      }
      const action = isRegistering ? onRegister : onLogin
      await action(form)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  const title = isResettingPassword
    ? 'Choisis un nouveau mot de passe'
    : isRequestingReset
      ? 'Retrouve ton acces'
      : isRegistering ? 'Creer ton espace' : 'Retrouve tes canvas'

  const submitLabel = isSubmitting
    ? 'Connexion au serveur...'
    : isResettingPassword
      ? 'Changer le mot de passe'
      : isRequestingReset
        ? 'Recevoir le lien'
        : isRegistering ? 'Creer mon espace' : 'Se connecter'

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand" aria-hidden="true">BC</div>
        <p className="eyebrow">BracketCanvas</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-intro">
          Tes Top 8, tes templates et tes reglages restent prives et synchronises avec ton compte.
        </p>

        {!isRequestingReset && !isResettingPassword && (
          <div className="auth-tabs" role="tablist" aria-label="Authentification">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegistering}
              onClick={() => changeMode('login')}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegistering}
              onClick={() => changeMode('register')}
            >
              Creer un compte
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isRegistering && (
            <label>
              Nom affiche
              <input
                name="displayName"
                value={form.displayName}
                maxLength="48"
                autoComplete="name"
                onChange={(event) => updateField('displayName', event.target.value)}
                placeholder="Ton pseudo"
              />
            </label>
          )}
          {!isResettingPassword && (
            <label>
              Adresse email
              <input
                name="email"
                type="email"
                value={form.email}
                required
                autoComplete="email"
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="toi@exemple.fr"
              />
            </label>
          )}
          {!isRequestingReset && (
            <label>
              Mot de passe
              <input
                name="password"
                type="password"
                value={form.password}
                required
                minLength={isRegistering || isResettingPassword ? 10 : undefined}
                autoComplete={isRegistering || isResettingPassword ? 'new-password' : 'current-password'}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder={isRegistering || isResettingPassword
                  ? '10 caracteres minimum'
                  : 'Ton mot de passe'}
              />
            </label>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {submitLabel}
          </button>
          {!isRegistering && !isRequestingReset && !isResettingPassword && (
            <button className="auth-link" type="button" onClick={() => changeMode('forgot')}>
              Mot de passe oublie
            </button>
          )}
          {(isRequestingReset || isResettingPassword) && (
            <button className="auth-link" type="button" onClick={() => changeMode('login')}>
              Retour connexion
            </button>
          )}
        </form>
      </section>
    </main>
  )
}
