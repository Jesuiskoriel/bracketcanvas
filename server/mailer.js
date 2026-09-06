import nodemailer from 'nodemailer'
import { normalizeLanguage, translate } from '../shared/i18n.js'

const getBooleanEnv = (name, fallback = false) => {
  const value = String(process.env[name] || '').trim().toLowerCase()
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value)
}

const getSmtpPort = () => {
  const port = Number(process.env.SMTP_PORT)
  return Number.isInteger(port) && port > 0 ? port : 587
}

const createTransport = () => {
  const host = String(process.env.SMTP_HOST || '').trim()
  if (!host) return null

  const user = String(process.env.SMTP_USER || '').trim()
  const pass = String(process.env.SMTP_PASS || '')
  return nodemailer.createTransport({
    host,
    port: getSmtpPort(),
    secure: getBooleanEnv('SMTP_SECURE', false),
    auth: user && pass ? { user, pass } : undefined,
  })
}

const getFromAddress = () =>
  String(process.env.MAIL_FROM || process.env.SMTP_USER || 'BracketCanvas <no-reply@localhost>').trim()

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export const mailerIsConfigured = () => Boolean(String(process.env.SMTP_HOST || '').trim())

export const buildPasswordResetEmail = ({ resetLink, language = 'fr' }) => {
  const locale = normalizeLanguage(language)
  const t = (key, values) => translate(locale, key, values)
  const safeResetLink = escapeHtml(resetLink)
  return {
    subject: t('Réinitialisation de ton mot de passe BracketCanvas'),
    text: [
      t('Tu as demandé la réinitialisation de ton mot de passe BracketCanvas.'),
      '',
      t('Ouvre ce lien pour choisir un nouveau mot de passe : {0}', { 0: resetLink }),
      '',
      t('Le lien expire dans une heure. Si tu n’es pas à l’origine de cette demande, ignore cet e-mail.'),
    ].join('\n'),
    html: `
      <div lang="${locale}" style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
        <h1 style="font-size:20px;margin:0 0 16px">${t('Réinitialisation du mot de passe')}</h1>
        <p>${t('Tu as demandé la réinitialisation de ton mot de passe BracketCanvas.')}</p>
        <p>
          <a href="${safeResetLink}" style="display:inline-block;padding:12px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px">
            ${t('Choisir un nouveau mot de passe')}
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563">${t('Ce lien expire dans une heure.')}</p>
        <p style="font-size:13px;color:#4b5563">${t('Si tu n’es pas à l’origine de cette demande, ignore cet e-mail.')}</p>
      </div>
    `,
  }
}

export const sendPasswordResetEmail = async ({ to, resetLink, language = 'fr' }) => {
  const transport = createTransport()
  if (!transport) return false
  await transport.sendMail({
    from: getFromAddress(),
    to,
    ...buildPasswordResetEmail({ resetLink, language }),
  })
  return true
}
