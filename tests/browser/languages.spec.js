import { test, expect } from '@playwright/test'
import { english } from '../../shared/i18n.js'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'

const password = 'Local-test-password-123'
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJAQoAHxcCAt9fLwYAAAAASUVORK5CYII=',
  'base64',
)
const tinyUpload = (name) => ({ name, mimeType: 'image/png', buffer: tinyPng })
const setRangeValue = async (locator, value) => {
  await locator.evaluate((element, nextValue) => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    valueSetter?.call(element, nextValue)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}
const createStoredProjectCollection = () => {
  const now = new Date().toISOString()
  const project = {
    id: 'project-admin-target',
    name: 'Target Cup',
    createdAt: now,
    updatedAt: now,
    data: {
      templateId: 'zero',
      templateRevision: 1,
      selectedLayer: { playerId: 'first', layer: 'primary' },
      exportScale: 4,
      eventDetails: {
        eventName: 'Target Cup',
        subtitle: 'Admin preview',
        date: '12/09/2026',
        participantCount: '42',
        eventType: 'weekly',
        tournamentLogo: '',
        tournamentLogoName: '',
        customBackground: '',
        customBackgroundName: '',
        customFontId: '',
      },
      players: [
        { id: 'first', placement: 1, playerName: 'Target Player', character: '', renderId: '', secondaryCharacter: '', secondaryRenderId: '', teamLogo: '', teamLogoName: '', slotBackground: '', slotBackgroundName: '', teamLogoX: 60, teamLogoY: 8, teamLogoSize: 22, x: 0, y: 0, scale: 1, flipped: false, opacity: 100, secondaryX: 18, secondaryY: 0, secondaryScale: 1, secondaryFlipped: false, secondaryOpacity: 100 },
      ],
    },
  }
  return { version: 1, activeProjectId: project.id, projects: { [project.id]: project } }
}

const unknownFrench = async (locator) => {
  const lines = (await locator.innerText()).split('\n').map((line) => line.trim())
  return lines.filter((line) => Object.hasOwn(english, line) && english[line] !== line && line.length > 3)
}

test('authentication, reset errors and language persistence', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bienvenue sur BracketCanvas' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Langue' }).selectOption('en')
  await expect(page.getByRole('heading', { name: 'Welcome to BracketCanvas' })).toBeVisible()
  await page.getByRole('button', { name: 'Explore the app' }).click()
  await page.getByRole('button', { name: 'Forgot password' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill('unknown@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toContainText('If an active account')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')
  await expect(page.getByRole('status')).toContainText('réinitialisation')
  await expect(page.getByRole('textbox', { name: 'Adresse e-mail' })).toHaveValue('unknown@example.test')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await page.goto('/reset-password?token=invalid&lang=en')
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('alert')).toContainText('invalid or has expired')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')
  await expect(page.getByRole('alert')).toContainText('invalide ou expiré')
})

for (const width of [1440, 390]) {
  test(`full editor and seven wizard steps at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      localStorage.setItem('bracketcanvas:beta-welcome:v1', 'seen')
      localStorage.setItem('bracketcanvas:language', 'en')
    })
    const email = width === 1440 ? 'i18n-admin@example.test' : 'i18n-mobile@example.test'
    const registration = await page.request.post('/api/auth/register', { data: { email, password, displayName: 'Élodie' } })
    expect(registration.ok()).toBeTruthy()
    if (width === 1440) {
      const database = new DatabaseSync(process.env.BRACKETCANVAS_TEST_DB)
      database.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', email)
      database.prepare(`
        INSERT INTO users (id, email, display_name, password_hash, created_at, role)
        VALUES (?, ?, ?, ?, ?, 'user')
      `).run(
        'user-admin-target',
        'admin-target@example.test',
        'Target User',
        'scrypt:00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        new Date().toISOString(),
      )
      database.prepare(`
        INSERT INTO workspaces (user_id, version, data, updated_at, revision)
        VALUES (?, 1, ?, ?, 1)
      `).run(
        'user-admin-target',
        JSON.stringify(createStoredProjectCollection()),
        new Date().toISOString(),
      )
      database.close()
    }
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Top 8 editor' })).toBeVisible()
    if (!(await page.locator('.project-dialog').count())) await page.getByRole('button', { name: '+ New', exact: true }).click()
    await page.getByRole('textbox', { name: 'Project name' }).fill('Tournoi été')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    for (const heading of ['Identity', 'Style', 'Composition', 'Panels', 'Titles', 'Colors', 'Summary']) {
      await expect(page.locator('#project-dialog-title')).toHaveText(heading)
      expect(await unknownFrench(page.locator('.wizard-controls'))).toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`wizard-${heading}-${width}.png`), fullPage: true })
      if (heading !== 'Summary') await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Generate my template' }).click()
    await expect(page.locator('.project-dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Top 8 editor' })).toBeVisible()
    await page.getByLabel('Player tag', { exact: true }).first().fill('Joueur Élodie')
    await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')
    await expect(page.getByRole('heading', { name: 'Éditeur Top 8' })).toBeVisible()
    await expect(page.getByLabel('Pseudo', { exact: true }).first()).toHaveValue('Joueur Élodie')
    await expect(page.getByLabel('Nom de l’événement', { exact: true })).toHaveValue('Tournoi été')
    await page.getByRole('combobox', { name: 'Langue' }).selectOption('en')
    await expect(page.getByLabel('Player tag', { exact: true }).first()).toHaveValue('Joueur Élodie')
    await page.locator('#custom-background').setInputFiles(tinyUpload('global-background.png'))
    await page.locator('#first-team-logo').setInputFiles(tinyUpload('team-logo.png'))
    await page.locator('#first-slot-background').setInputFiles(tinyUpload('slot-background.png'))
    await setRangeValue(page.locator('#first-team-logo-x'), '14')
    await setRangeValue(page.locator('#first-team-logo-y'), '22')
    await setRangeValue(page.locator('#first-team-logo-size'), '28')
    await expect(page.locator('.custom-background-layer')).toHaveAttribute('src', /^data:image\/png/)
    await expect(page.locator('.slot-texture-custom').first()).toHaveAttribute('src', /^data:image\/png/)
    await expect(page.locator('.team-logo').first()).toHaveAttribute('src', /^data:image\/png/)
    await expect.poll(() => page.locator('.team-logo').first().evaluate((element) => element.style.left)).toBe('14%')
    await expect.poll(() => page.locator('.team-logo').first().evaluate((element) => element.style.top)).toBe('22%')
    await expect.poll(() => page.locator('.team-logo').first().evaluate((element) => element.style.width)).toBe('28%')
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Custom skin name')
      await dialog.accept('Custom Mii')
    })
    await page.locator('#custom-skin-upload').setInputFiles(tinyUpload('custom-mii.png'))
    await expect(page.locator('#first-character')).toContainText('Custom Mii')
    const customSkinId = await page.locator('#first-character').evaluate((select) =>
      [...select.options].find((option) => option.textContent === 'Custom Mii')?.value,
    )
    expect(customSkinId).toMatch(/^custom-skin-/)
    await page.locator('#first-character').selectOption(customSkinId)
    await expect(page.locator('#first-render')).toContainText('Custom Mii')
    await expect(page.locator('.player-render-primary').first()).toHaveAttribute('src', /^data:image\/png/)
    await page.locator('#first-secondary-character').selectOption(customSkinId)
    await expect(page.locator('.player-render-secondary').first()).toHaveAttribute('src', /^data:image\/png/)
    await expect(page.getByRole('button', { name: 'Artwork 2 active on canvas' })).toBeVisible()
    await page.locator('.player-render-primary').first().dblclick({ force: true })
    await expect(page.locator('.player-render-primary.is-active').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Artwork 1 active on canvas' })).toBeVisible()
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Custom font name')
      await dialog.accept('Custom Font')
    })
    await page.locator('#custom-font-upload').setInputFiles(path.join(process.cwd(), 'HyliaSerifBeta-Regular.otf'))
    await expect(page.locator('#custom-font-select')).toContainText('Custom Font')
    await expect(page.locator('.top8-canvas')).toHaveAttribute('style', /--canvas-font-family/)
    await page.getByRole('button', { name: 'Palette', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Global palette' })).toBeVisible()
    expect(await unknownFrench(page.locator('.palette-editor'))).toEqual([])
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.getByRole('button', { name: 'Collaborate', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Share workspace' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Shortcuts', exact: false }).click()
    await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible()
    expect(await unknownFrench(page.locator('.shortcuts-dialog'))).toEqual([])
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    if (width === 1440) {
      await page.getByRole('button', { name: 'Administration', exact: true }).click()
      await expect(page.getByRole('columnheader', { name: 'Last active' })).toBeVisible()
      await page.getByRole('button', { name: 'View canvases' }).first().click()
      await expect(page.getByRole('heading', { name: /canvases$/ })).toBeVisible()
      await page.getByLabel('Project to inspect').selectOption('project-admin-target')
      await expect(page.locator('.admin-project-canvas-frame .top8-canvas')).toBeVisible()
      await expect(page.locator('.admin-project-canvas-frame')).toContainText('Target Player')
      await page.getByRole('button', { name: 'Close administration' }).click()
    } else {
      const forbidden = await page.request.get('/api/admin/users/user-admin-target/projects')
      expect(forbidden.status()).toBe(403)
    }
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    expect(errors).toEqual([])
  })
}

test('reset API negotiates language and preserves it in a working one-use link', async ({ request }) => {
  const email = 'i18n-reset@example.test'
  await request.post('/api/auth/register', { data: { email, password, displayName: 'Reset test' } })
  const reset = await request.post('/api/auth/password-reset/request', { headers: { 'Accept-Language': 'en-GB' }, data: { email } })
  expect(reset.headers()['content-language']).toBe('en')
  const payload = await reset.json()
  expect(payload.message).toContain('password reset link')
  const link = new URL(payload.resetLink)
  expect(link.searchParams.get('lang')).toBe('en')
  const data = { token: link.searchParams.get('token'), password: 'Changed-password-123' }
  const confirmed = await request.post('/api/auth/password-reset/confirm', { data })
  expect(confirmed.ok()).toBeTruthy()
  const repeated = await request.post('/api/auth/password-reset/confirm', { headers: { 'Accept-Language': 'fr' }, data })
  expect((await repeated.json()).error).toContain('invalide ou expiré')
})
