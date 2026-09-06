import frenchCorrections from './locales/fr.js'
import interfaceEnglish from './locales/en.js'
import designEnglish from './locales/design-en.js'

export const english = Object.fromEntries(
  Object.entries({ ...interfaceEnglish, ...designEnglish }).map(([key, value]) => [(frenchCorrections[key] || key).trim(), value]),
)

export const normalizeLanguage = (value) => /^en(?:-|$)/i.test(String(value || '')) ? 'en' : 'fr'

export function negotiateLanguage(header) {
  const preferences = String(header || '').split(',').map((part) => {
    const [tag, weight] = part.trim().split(';')
    return { tag, weight: weight ? Number(weight.trim().replace(/^q=/, '')) : 1 }
  }).filter(({ tag, weight }) => /^(fr|en)(-|$)/i.test(tag) && weight > 0 && weight <= 1)
  preferences.sort((a, b) => b.weight - a.weight)
  return normalizeLanguage(preferences[0]?.tag)
}

export function translate(language, message, values = {}) {
  if (message && typeof message === 'object' && 'key' in message) {
    return translate(language, message.key, message.values)
  }
  if (typeof message !== 'string' || !message) return message
  const key = (frenchCorrections[message] || frenchCorrections[message.trim()] || message).trim()
  const translated = normalizeLanguage(language) === 'en' ? english[key] : key
  const template = translated ?? key
  const leading = message.match(/^\s*/)[0]
  const trailing = message.match(/\s*$/)[0]
  return `${leading}${template.trim()}${trailing}`.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match)
}

export const message = (key, values = {}) => ({ key, values })
