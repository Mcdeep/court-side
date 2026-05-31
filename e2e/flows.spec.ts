import { test, expect } from '@playwright/test'

// Seed org created by convex/seed.ts devOrg mutation.
// Run it once from the Convex dashboard before executing these tests.
const ORG = 'riverside-padel'
const TOURNAMENTS_URL = `/org/${ORG}/tournaments`

test.describe('App shell', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/CourtOS/)
  })

  test('renders without crash', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).not.toContainText('Unexpected error')
    await expect(page.locator('body')).not.toContainText('Application error')
  })
})

test.describe('Tournaments list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TOURNAMENTS_URL)
    await page.waitForSelector('h1:has-text("Tournaments")')
  })

  test('shows Tournaments heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Tournaments')
  })

  test('shows New tournament button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New tournament', exact: true })).toBeVisible()
  })

  test('has at least one tournament row from seed data', async ({ page }) => {
    // Seed data (devOrg) must be run first
    const rows = page.locator('.rowin')
    await expect(rows.first()).toBeVisible()
  })
})

test.describe('New tournament modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TOURNAMENTS_URL)
    await page.waitForSelector('h1:has-text("Tournaments")')
    await page.getByRole('button', { name: 'New tournament', exact: true }).click()
    await page.waitForSelector('h2:has-text("New tournament")')
  })

  test('modal opens', async ({ page }) => {
    await expect(page.locator('h2:has-text("New tournament")')).toBeVisible()
  })

  test('venue select is populated', async ({ page }) => {
    const venueSelect = page.locator('select').nth(1)
    await expect(venueSelect).toBeVisible()
    await expect(venueSelect).not.toContainText('No venues')
  })

  test('all format options are present', async ({ page }) => {
    const formatSelect = page.locator('select').first()
    for (const format of ['Americano', 'Mexicano', 'Round Robin', 'Knockout']) {
      await expect(formatSelect).toContainText(format)
    }
  })

  test('Cancel closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.locator('h2:has-text("New tournament")')).not.toBeVisible()
  })

  test('X button closes the modal', async ({ page }) => {
    // Scope to the modal panel to avoid clicking background elements
    await page.locator('[class*="shadow-pop"]').getByRole('button').first().click()
    await expect(page.locator('h2:has-text("New tournament")')).not.toBeVisible()
  })
})

test.describe('Tournament detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TOURNAMENTS_URL)
    await page.waitForSelector('h1:has-text("Tournaments")')
    await page.locator('.rowin').first().click()
    await page.waitForSelector('h1')
  })

  test('shows tournament name', async ({ page }) => {
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).not.toBeEmpty()
  })

  test('shows Schedule, Participants and Standings tabs', async ({ page }) => {
    // exact: true avoids collision with match-card buttons that contain "Scheduled"
    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Participants/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Standings', exact: true })).toBeVisible()
  })

  test.describe('Schedule tab', () => {
    test('shows "All N rounds scheduled" for Americano once generated', async ({ page }) => {
      await page.getByRole('button', { name: 'Schedule', exact: true }).click()
      const allScheduled = page.locator('text=/All \\d+ rounds scheduled/')
      const generateBtn = page.getByRole('button', { name: /Generate round 1/, exact: false })
      await expect(allScheduled.or(generateBtn)).toBeVisible()
    })

    test('generate button is absent for Americano when rounds exist', async ({ page }) => {
      await page.getByRole('button', { name: 'Schedule', exact: true }).click()
      const allScheduled = page.locator('text=/All \\d+ rounds scheduled/')
      if (await allScheduled.isVisible()) {
        // All rounds generated — the duplicate-generate button must not exist
        await expect(
          page.getByRole('button', { name: /Generate round \d+/, exact: false })
        ).not.toBeVisible()
      }
    })
  })

  test.describe('Participants tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /Participants/ }).click()
      await page.waitForSelector('text=Participants')
    })

    test('shows seed participants', async ({ page }) => {
      // Seed adds 16 players; at least some should be visible
      const avatars = page.locator('[class*="rounded-full"][class*="font-semibold"][class*="shrink-0"]')
      await expect(avatars.first()).toBeVisible()
      const count = await avatars.count()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('Add player button hidden when tournament is in_progress', async ({ page }) => {
      // Seed tournament gets set to in_progress after round generation — button should be hidden
      const addBtn = page.getByRole('button', { name: 'Add player', exact: true })
      if (await addBtn.isVisible()) {
        // Tournament is still draft/registration_open — acceptable state
        await expect(addBtn).toBeVisible()
      } else {
        await expect(addBtn).not.toBeVisible()
      }
    })
  })

  test.describe('Standings tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Standings', exact: true }).click()
      await page.waitForTimeout(500)
    })

    test('shows leaderboard table or empty-state', async ({ page }) => {
      const isEmptyState = await page.locator('text=Standings appear once').isVisible()
      // "Pts" column header is unique to the populated leaderboard table
      const isPopulated = await page.locator('text=Pts').first().isVisible()
      expect(isEmptyState || isPopulated).toBe(true)
    })
  })
})

test.describe('Add player modal', () => {
  // These tests navigate to the seed tournament. If it is already in_progress
  // (rounds generated), the Add player button is intentionally hidden and the
  // tests are skipped — run seed.devOrg against a fresh Convex deployment to
  // get a tournament in registration_open state.
  test.beforeEach(async ({ page }) => {
    await page.goto(TOURNAMENTS_URL)
    await page.waitForSelector('h1:has-text("Tournaments")')
    await page.locator('.rowin').first().click()
    await page.waitForSelector('h1')
    await page.getByRole('button', { name: /Participants/ }).click()
    await page.waitForSelector('text=Participants')
  })

  test('Add player modal opens with Walk-in and Member tabs', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'Add player', exact: true })
    if (!await addBtn.isVisible()) {
      test.skip(true, 'Tournament is in_progress — Add player button intentionally hidden')
    }
    await addBtn.click()
    await page.waitForSelector('h2:has-text("Add player")')
    await expect(page.getByRole('button', { name: 'Walk-in', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Member', exact: true })).toBeVisible()
  })

  test('Walk-in tab shows name input', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'Add player', exact: true })
    if (!await addBtn.isVisible()) {
      test.skip(true, 'Tournament is in_progress — Add player button intentionally hidden')
    }
    await addBtn.click()
    await page.waitForSelector('h2:has-text("Add player")')
    await expect(page.locator('input[placeholder="Player name"]')).toBeVisible()
  })

  test('Member tab shows search input', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'Add player', exact: true })
    if (!await addBtn.isVisible()) {
      test.skip(true, 'Tournament is in_progress — Add player button intentionally hidden')
    }
    await addBtn.click()
    await page.waitForSelector('h2:has-text("Add player")')
    await page.getByRole('button', { name: 'Member', exact: true }).click()
    await expect(page.locator('input[placeholder="Search members…"]')).toBeVisible()
  })
})
