import { setLanguage, t, useLanguage } from '../i18n.js'

export default function LanguageSelect() {
  const language = useLanguage()
  return (
    <label className="language-select">
      <span>{t('Langue')}</span>
      <select aria-label={t('Langue')} value={language} onChange={(event) => setLanguage(event.target.value)}>
        <option value="fr" lang="fr">Français</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  )
}
