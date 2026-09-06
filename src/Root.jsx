import { msg, t, useLanguage } from './i18n.js'
import { lazy, Suspense, useEffect, useState } from 'react'
import App from './App.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import BetaWelcomeModal from './components/BetaWelcomeModal.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import LanguageSelect from './components/LanguageSelect.jsx'
import {
  getSession,
  loginAccount,
  logoutAccount,
  registerAccount,
} from './services/accountApi.js'

const showTemplateContactSheet =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('templateContactSheet') === '1'

const TemplateDiversityBoard = import.meta.env.DEV
  ? lazy(() => import('./components/TemplateDiversityBoard.jsx'))
  : null

function BracketCanvasRoot() {
  useLanguage()
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
        if (isActive) setSessionError(msg("Impossible de joindre le serveur BracketCanvas."))
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
        <p>{t("Ouverture de ton espace…")}</p>
      </main>
    )
  } else if (!user) {
    content = (
      <>
        <AuthScreen onLogin={login} onRegister={register} />
        {sessionError && <p className="session-error" role="alert">{t(sessionError)}</p>}
      </>
    )
  } else {
    content = <App currentUser={user} onLogout={logout} />
  }

  return (
    <>
      <div className="app-preferences">
        <LanguageSelect />
        <ThemeToggle theme={theme} onChange={setTheme} />
      </div>
      {content}
      {showBetaWelcome && <BetaWelcomeModal onClose={closeBetaWelcome} />}
    </>
  )
}

export default function Root() {
  useLanguage()
  if (showTemplateContactSheet && TemplateDiversityBoard) {
    return (
      <Suspense fallback={<main className="session-loading"><p>{t("Préparation de la planche…")}</p></main>}>
        <TemplateDiversityBoard />
      </Suspense>
    )
  }
  return <BracketCanvasRoot />
}
