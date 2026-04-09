# Playwright E2E Test Plan — Tournament Flow

**Status:** PLAN COMPLETE — NOT YET IMPLEMENTED  
**Branch:** `claude/test-tournament-divisions-g6CMz`  
**Goal:** Full UI E2E test of a tournament with multiple divisions, from creation through playoffs.

---

## Quick Execution Checklist (for resuming mid-session)

- [ ] Step 1: Install Playwright + browsers
- [ ] Step 2: Create `playwright.config.ts`
- [ ] Step 3: Create `e2e/global-setup.ts` (seed admin user + test tournament)
- [ ] Step 4: Create `e2e/helpers/auth.ts` (login helper)
- [ ] Step 5: Create `e2e/helpers/supabase.ts` (direct DB helpers)
- [ ] Step 6: Create `e2e/tournament-flow.spec.ts` (main test)
- [ ] Step 7: Create `.env.test` template
- [ ] Step 8: Add `test:e2e` script to `package.json`
- [ ] Step 9: Verify tests run end-to-end
- [ ] Step 10: Commit and push

---

## Architecture Decisions

### What Playwright tests against
- Local dev server: `http://localhost:3000` (run `npm run dev` in a separate terminal)
- A real Supabase project (staging or production) — same one in `.env.local`
- Tests seed their own data and clean it up after

### Authentication approach
- `global-setup.ts` creates a test admin user in Supabase Auth + profiles
- Playwright saves the browser session (cookies + localStorage) via `storageState`
- All tests reuse that saved session — no need to log in per test

### Data seeding approach
- `global-setup.ts` calls the existing `seed_test_tournament()` SQL function
  via Supabase service role key to populate divisions with players
- `global-teardown.ts` calls `delete_test_tournament_users()` to clean up
- The tournament itself is created by navigating the UI (not seeded directly)

### Test structure
- One main spec file: `e2e/tournament-flow.spec.ts`  
- Tests run sequentially (not parallel) because they share tournament state
- Uses `test.step()` to subdivide the flow for clear failure messages

---

## File Structure to Create

```
e2e/
  global-setup.ts          # Creates admin session, seeds players
  global-teardown.ts       # Cleans up test data from Supabase
  tournament-flow.spec.ts  # Main E2E spec (full tournament lifecycle)
  helpers/
    auth.ts                # Login via Supabase client (no UI needed)
    supabase.ts            # Supabase admin client for seeding/cleanup
playwright.config.ts       # Playwright configuration
.env.test                  # Template for E2E env vars (no secrets)
```

---

## Environment Variables Needed

Playwright tests need the same env vars as the app, plus a test admin account.
Copy `.env.local` to `.env.test.local` and add:

```env
# Same as .env.local:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test-only: admin account for Playwright to log in as
E2E_ADMIN_EMAIL=e2e-admin@test.local
E2E_ADMIN_PASSWORD=e2eTestPassword123!
```

The global-setup creates this admin user if it doesn't exist.

---

## `playwright.config.ts` Key Settings

```typescript
{
  testDir: './e2e',
  fullyParallel: false,      // Sequential — tests share tournament state
  workers: 1,
  timeout: 60_000,           // 60s per test (bracket generation can be slow)
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'e2e/.auth/admin.json',  // Saved login session
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,   // Don't restart if already running
  },
}
```

---

## `global-setup.ts` — What It Does

1. Create Supabase admin client using `SUPABASE_SERVICE_ROLE_KEY`
2. Create test admin user in `auth.users` if not exists
3. Ensure profile has `role = 'admin'`
4. Launch a headless browser, navigate to `/login`
5. Log in as the admin user
6. Save browser session to `e2e/.auth/admin.json`
7. Store the admin profile ID in a shared file `e2e/.auth/context.json`
   (tournament ID will be written here during the test)

---

## Test Flow: `tournament-flow.spec.ts`

### Step 1 — Create Tournament
- Navigate to `/tournaments/new`
- Fill: Name = "E2E Test Tournament {timestamp}", Format = "Round Robin", Type = "Doubles"
- Select divisions: `mens_all_ages_4.0` and `womens_all_ages_3.5`
- Set start date (next Saturday), location
- Click "Create Tournament"
- Assert: redirected to `/tournaments/{id}`, status badge shows "Draft"
- Save tournament ID to `e2e/.auth/context.json`

### Step 2 — Open Registration
- Click "Open Registration" button
- Assert: status badge changes to "Registration Open"

### Step 3 — Seed Players via API
- Call `supabase.rpc('seed_test_tournament', { p_tournament_id, p_count: 16 })`
  (this creates 16 fake players split across the 2 divisions)
- Reload page
- Assert: registration table shows players in both divisions

### Step 4 — Close Registration
- Click "Close Registration" button
- Assert: status badge changes to "Registration Closed"
- Assert: Division Review section appears on the page

### Step 5 — Division Review
- Assert: Both divisions listed with player counts
- Assert: "Generate Brackets (2 divisions)" button is visible
- For Round Robin: verify pool round number inputs are visible

### Step 6 — Generate Brackets
- Click "Generate Brackets (2 divisions)"
- Assert: button shows "Generating Brackets..." (loading state)
- Assert: page reloads, status badge shows "In Progress"
- Assert: Division tabs appear (one per division)
- Assert: Match cards are rendered in at least one pool

### Step 7 — Enter All Pool Play Scores
For each division tab:
- Click the division tab
- Find all "pending" match cards (those with score entry buttons)
- For each match:
  - Click the match card (opens score modal)
  - Fill score1 = "11", score2 = "7"  
  - The winner is determined by which team has higher score
  - Click "Save Score"
  - Assert: match card updates to show score (no modal)
- Repeat until all pool matches are complete

### Step 8 — Advance to Playoffs
- Assert: "Pool Play Complete" card appears
- Assert: "Review Advancement" button is visible
- Click "Review Advancement"
- Assert: "Confirm Playoff Seeding" modal appears with seeded player list
- Assert: Up/Down reorder buttons are visible
- Click "Confirm & Generate Playoffs"
- Assert: "Playoffs" section appears below pool play
- Repeat for second division tab

### Step 9 — Complete Playoffs
For each division tab:
- Find playoff match cards
- Enter scores for semifinals (11-7)
- Assert: Final match gets both players populated
- Assert: 3rd place match gets both losers populated
- Enter scores for final and 3rd place game
- Assert: All playoff matches completed

### Step 10 — Tournament Completion
- Assert: Tournament status badge shows "Completed"
  (auto-triggered when all matches across all divisions are complete)

---

## Key Selectors (from UI audit)

```typescript
// Status badge
page.locator('.badge, [class*="badge"]').filter({ hasText: 'Draft' })

// Organizer buttons
page.getByRole('button', { name: 'Open Registration' })
page.getByRole('button', { name: 'Close Registration' })
page.getByRole('button', { name: /Generate Brackets/ })
page.getByRole('button', { name: 'Review Advancement' })
page.getByRole('button', { name: 'Confirm & Generate Playoffs' })
page.getByRole('button', { name: 'Save Score' })

// Match interaction — score entry modal trigger
// Match cards are clickable; clicking opens the score modal
page.locator('[class*="match"]').filter({ hasText: playerName })

// Score inputs (in modal)
page.locator('input[inputmode="numeric"]').first()

// Division tabs
page.getByRole('button', { name: 'Men\'s All Ages 4.0' })

// Registration
page.getByRole('button', { name: 'Register' })
page.getByRole('button', { name: 'Join Waitlist' })
page.getByLabel('Division *')
```

---

## Known Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| Score entry requires clicking each match card individually | Loop through `page.locator('[data-status="pending"]')` elements |
| Match cards have no `data-testid` | Use status classes + player name text as selectors |
| Pool play has many matches (12-team = 30 matches) | Use `p1Wins=true` pattern with 11-7 scores for all; loop is fine |
| Playwright needs app running | `webServer` config auto-starts `npm run dev` |
| Auth session expiry | `global-setup` re-runs per `playwright` invocation |
| Supabase RLS blocks service-role seeding in browser | Seeding done in `global-setup.ts` (Node.js), not in browser |
| Tournament ID not known until test creates it | Save to `e2e/.auth/context.json` after Step 1 |

---

## Commands to Run

```bash
# Install (one-time)
npm install --save-dev @playwright/test
npx playwright install chromium

# Run with app already running in another terminal
npm run test:e2e

# Run with Playwright starting the app automatically  
npx playwright test

# Debug mode (opens browser, pauses on each action)
npx playwright test --debug

# Show last test report
npx playwright show-report
```

---

## Notes on Score Entry Implementation

The score entry modal is opened by clicking a match card. The modal has:
- `input[inputmode="numeric"]` fields for scores
- "Save Score" button
- Auto-selects winner based on which score is higher

For Playwright, the loop will be:
```typescript
const pendingMatches = page.locator('selector-for-pending-match-card');
const count = await pendingMatches.count();
for (let i = 0; i < count; i++) {
  await pendingMatches.nth(i).click();
  // fill scores 11 and 7
  // click Save Score
  // wait for modal to close
}
```

The exact match card selector needs to be determined by inspecting the rendered HTML.
This will be refined during implementation (Step 6 of execution checklist).
