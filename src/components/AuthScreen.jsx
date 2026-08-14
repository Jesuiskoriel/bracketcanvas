import { useState } from 'react'
import ProductNotice from './ProductNotice.jsx'

export default function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = mode === 'register'

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (error) setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
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
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand" aria-hidden="true">BC</div>
        <div className="product-heading-row">
          <p className="eyebrow">BracketCanvas</p>
          <span className="beta-badge">Bêta</span>
        </div>
        <h1 id="auth-title">
          {isRegistering ? 'Créer ton espace' : 'Retrouve tes canvas'}
        </h1>
        <p className="auth-intro">
          Tes Top 8, tes templates et tes réglages restent privés et synchronisés avec ton compte.
        </p>

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
            Créer un compte
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isRegistering && (
            <label>
              Nom affiché
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
          <label>
            Mot de passe
            <input
              name="password"
              type="password"
              value={form.password}
              required
              minLength={isRegistering ? 10 : undefined}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder={isRegistering ? '10 caractères minimum' : 'Ton mot de passe'}
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Connexion au serveur…'
              : isRegistering ? 'Créer mon espace' : 'Se connecter'}
          </button>
        </form>
        <ProductNotice compact />
      </section>
    </main>
  )
}
