import { useEffect, useState } from 'react'
import App from './App.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import BetaWelcomeModal from './components/BetaWelcomeModal.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import {
  getSession,
  loginAccount,
  logoutAccount,
  registerAccount,
} from './services/accountApi.js'

export default function Root() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('bracketcanvas:theme') === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [showBetaWelcome, setShowBetaWelcome] = useState(() => {
    try {
      return localStorage.getItem('bracketcanvas:beta-welcome:v1') !== 'seen'
    } catch {
      return true
    }
  })
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem('bracketcanvas:theme', theme)
    } catch {
      // Le thème reste actif pour la session si le stockage est indisponible.
    }
  }, [theme])

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

  const closeBetaWelcome = () => {
    try {
      localStorage.setItem('bracketcanvas:beta-welcome:v1', 'seen')
    } catch {
      // La fenêtre reste fermée pour la session si le stockage est indisponible.
    }
    setShowBetaWelcome(false)
  }

  let content
  if (isLoading) {
    content = (
      <main className="session-loading" aria-live="polite">
        <div className="session-loading-mark">BC</div>
        <p>Ouverture de ton espace…</p>
      </main>
    )
  } else if (!user) {
    content = (
      <>
        <AuthScreen onLogin={login} onRegister={register} />
        {sessionError && <p className="session-error" role="alert">{sessionError}</p>}
      </>
    )
  } else {
    content = <App currentUser={user} onLogout={logout} />
  }

  return (
    <>
      <ThemeToggle theme={theme} onChange={setTheme} />
      {content}
      {showBetaWelcome && <BetaWelcomeModal onClose={closeBetaWelcome} />}
    </>
  )
}
