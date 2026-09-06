import { msg, t, useLanguage } from '../i18n.js'
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
  useLanguage()
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
          ? msg("Lien de reset dev : {0}", { 0: result.resetLink })
          : result.messageKey || result.message)
        return
      }
      if (isResettingPassword) {
        await confirmPasswordReset({ token: resetToken, password: form.password })
        const nextUrl = new URL(window.location.href)
        nextUrl.pathname = '/'
        nextUrl.searchParams.delete('token')
        window.history.replaceState({}, '', nextUrl)
        setMode('login')
        setForm((current) => ({ ...current, password: '' }))
        setMessage(msg("Mot de passe mis à jour. Tu peux te connecter."))
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
    ? t("Choisis un nouveau mot de passe")
    : isRequestingReset
      ? t("Retrouve ton accès")
      : isRegistering ? t("Crée ton espace") : t("Retrouve tes canevas")

  const submitLabel = isSubmitting
    ? t("Connexion au serveur…")
    : isResettingPassword
      ? t("Changer le mot de passe")
      : isRequestingReset
        ? t("Recevoir le lien")
        : isRegistering ? t("Créer mon espace") : t("Se connecter")

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand" aria-hidden="true">BC</div>
        <p className="eyebrow">BracketCanvas</p>
        <h1 id="auth-title">{t(title)}</h1>
        <p className="auth-intro">{t("Tes Top 8, tes modèles et tes réglages restent privés et synchronisés avec ton compte.")}</p>

        {!isRequestingReset && !isResettingPassword && (
          <div className="auth-tabs" role="tablist" aria-label={t("Authentification")}>
            <button
              type="button"
              role="tab"
              aria-selected={!isRegistering}
              onClick={() => changeMode('login')}
            >{t("Connexion")}</button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegistering}
              onClick={() => changeMode('register')}
            >{t("Créer un compte")}</button>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isRegistering && (
            <label>{t("Nom affiché")}<input
                name="displayName"
                value={form.displayName}
                maxLength="48"
                autoComplete="name"
                onChange={(event) => updateField('displayName', event.target.value)}
                placeholder={t("Ton pseudo")}
              />
            </label>
          )}
          {!isResettingPassword && (
            <label>{t("Adresse e-mail")}<input
                name="email"
                type="email"
                value={form.email}
                required
                autoComplete="email"
                onChange={(event) => updateField('email', event.target.value)}
                placeholder={t("toi@exemple.fr")}
              />
            </label>
          )}
          {!isRequestingReset && (
            <label>{t("Mot de passe")}<input
                name="password"
                type="password"
                value={form.password}
                required
                minLength={isRegistering || isResettingPassword ? 10 : undefined}
                autoComplete={isRegistering || isResettingPassword ? 'new-password' : 'current-password'}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder={isRegistering || isResettingPassword
                  ? t("10 caractères minimum")
                  : t("Ton mot de passe")}
              />
            </label>
          )}
          {error && <p className="auth-error" role="alert">{t(error)}</p>}
          {message && <p className="auth-message" role="status">{t(message)}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {submitLabel}
          </button>
          {!isRegistering && !isRequestingReset && !isResettingPassword && (
            <button className="auth-link" type="button" onClick={() => changeMode('forgot')}>{t("Mot de passe oublié")}</button>
          )}
          {(isRequestingReset || isResettingPassword) && (
            <button className="auth-link" type="button" onClick={() => changeMode('login')}>{t("Retour à la connexion")}</button>
          )}
        </form>
      </section>
    </main>
  )
}
