import assert from 'node:assert/strict'
import test from 'node:test'
import { english, message, negotiateLanguage, translate } from '../shared/i18n.js'
import corrections from '../shared/locales/fr.js'
import { buildPasswordResetEmail } from '../server/mailer.js'

test('French corrections and English coverage stay in sync', () => {
  for (const [original, corrected] of Object.entries(corrections)) {
    assert.equal(translate('fr', original).trim(), corrected.trim())
    assert.ok(Object.hasOwn(english, corrected.trim()), `Missing English: ${corrected}`)
  }
  for (const [key, value] of Object.entries(english)) {
    assert.ok(value.trim(), key)
    assert.deepEqual([...key.matchAll(/\{\w+\}/g)].map(([name]) => name).sort(), [...value.matchAll(/\{\w+\}/g)].map(([name]) => name).sort(), key)
  }
})

test('messages retain interpolation and can change language after creation', () => {
  const status = message('{0} peut maintenant collaborer.', { 0: 'Élodie {1}' })
  assert.equal(translate('en', status), 'Élodie {1} can now collaborate.')
  assert.equal(translate('fr', status), 'Élodie {1} peut maintenant collaborer.')
  assert.equal(translate('en', ' participants'), ' entrants')
  assert.equal(translate('en', 'Nom du tournoi '), 'Tournament name ')
})

test('language negotiation handles region, priority and unsupported languages', () => {
  assert.equal(negotiateLanguage('en-US,en;q=0.9,fr;q=0.8'), 'en')
  assert.equal(negotiateLanguage('en;q=0.5,fr-FR;q=1'), 'fr')
  assert.equal(negotiateLanguage('de-DE,en-GB;q=0.8'), 'en')
  assert.equal(negotiateLanguage('en;q=0,fr;q=0.8'), 'fr')
  assert.equal(negotiateLanguage('de'), 'fr')
})

test('reset emails are fully localized and escape the link in HTML', () => {
  const resetLink = 'https://example.test/reset-password?token=a&lang=en&x="<test>"'
  const en = buildPasswordResetEmail({ resetLink, language: 'en' })
  assert.equal(en.subject, 'Reset your BracketCanvas password')
  assert.match(en.html, /lang="en"/)
  assert.match(en.html, /&amp;lang=en/)
  assert.match(en.html, /&quot;&lt;test&gt;&quot;/)
  assert.match(en.text, /The link expires in one hour/)
  assert.ok(en.text.includes(resetLink))
  const fr = buildPasswordResetEmail({ resetLink, language: 'fr' })
  assert.match(fr.subject, /Réinitialisation/)
  assert.match(fr.html, /Tu as demandé/)
  assert.match(fr.html, /tu n’es pas à l’origine/)
})
