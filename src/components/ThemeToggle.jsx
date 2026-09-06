import { t, useLanguage } from '../i18n.js'
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 15.2A8.2 8.2 0 0 1 8.8 4a8.2 8.2 0 1 0 11.2 11.2Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export default function ThemeToggle({ theme, onChange }) {
  useLanguage()
  const isLight = theme === 'light'

  return (
    <label className="theme-toggle">
      <span className="theme-toggle-label">{isLight ? t("Mode clair") : t("Mode sombre")}</span>
      <span className="theme-toggle-control">
        <input
          type="checkbox"
          checked={isLight}
          aria-label={isLight ? t("Activer le mode sombre") : t("Activer le mode clair")}
          onChange={(event) => onChange(event.target.checked ? 'light' : 'dark')}
        />
        <span className="theme-toggle-track" aria-hidden="true">
          <span className="theme-toggle-icon theme-toggle-icon-moon"><MoonIcon /></span>
          <span className="theme-toggle-icon theme-toggle-icon-sun"><SunIcon /></span>
          <span className="theme-toggle-thumb" />
        </span>
      </span>
    </label>
  )
}
