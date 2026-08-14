import { useEffect, useState } from 'react'
import App from './App.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import {
  getSession,
  loginAccount,
  logoutAccount,
  registerAccount,
} from './services/accountApi.js'

export default function Root() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    let isActive = true
    getSession()
      .then(({ user: sessionUser }) => {
        if (isActive) setUser(sessionUser)
      })
      .catch(() => {
        if (isActive) setSessionError('Impossible de joindre le serveur BracketCanvas.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  const login = async (credentials) => {
    const { user: authenticatedUser } = await loginAccount(credentials)
    setUser(authenticatedUser)
  }

  const register = async (credentials) => {
    const { user: authenticatedUser } = await registerAccount(credentials)
    setUser(authenticatedUser)
  }

  const logout = async () => {
    await logoutAccount()
    setUser(null)
  }

  if (isLoading) {
    return (
      <main className="session-loading" aria-live="polite">
        <div className="session-loading-mark">BC</div>
        <p>Ouverture de ton espace…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <>
        <AuthScreen onLogin={login} onRegister={register} />
        {sessionError && <p className="session-error" role="alert">{sessionError}</p>}
      </>
    )
  }

  return <App currentUser={user} onLogout={logout} />
}
