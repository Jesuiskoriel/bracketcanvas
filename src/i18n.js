import { useSyncExternalStore } from 'react'
import { normalizeLanguage, translate } from '../shared/i18n.js'
export { message as msg } from '../shared/i18n.js'

const storageKey = 'bracketcanvas:language'
const listeners = new Set()
let language = 'fr'

if (typeof window !== 'undefined') {
  const linkLanguage = new URLSearchParams(window.location.search).get('lang')
  try {
    language = normalizeLanguage(linkLanguage || window.localStorage.getItem(storageKey) || navigator.language)
  } catch {
    language = normalizeLanguage(linkLanguage || navigator.language)
  }
  document.documentElement.lang = language
}

export const getLanguage = () => language
export const getLocale = () => language === 'en' ? 'en-GB' : 'fr-FR'
export const t = (key, values) => translate(language, key, values)
const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const useLanguage = () => useSyncExternalStore(subscribe, getLanguage, () => 'fr')

export function setLanguage(value) {
  language = normalizeLanguage(value)
  document.documentElement.lang = language
  try { window.localStorage.setItem(storageKey, language) } catch { /* Keep the session preference. */ }
  const url = new URL(window.location.href)
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', language)
    window.history.replaceState(window.history.state, '', url)
  }
  listeners.forEach((listener) => listener())
}
