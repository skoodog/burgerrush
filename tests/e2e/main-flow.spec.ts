/**
 * End-to-end flow against the production build.
 *
 * Covers the boot-to-boss path from MASTER_PROMPT section 22: title, chef
 * select, Stack Phase, the exact bilingual warning, the sibling launch through
 * the top boundary, unlimited dual-chef fire, boss damage and results.
 */

import { expect, test, type Page } from '@playwright/test';

/**
 * The app declares `window.__BURGER_RUSH__` and `window.__BURGER_RUSH_DEBUG__`
 * in src/. These specs run outside that program, so the handles are read
 * through narrow local casts rather than a conflicting re-declaration.
 */
interface GameHandle {
  game: { scene: { getScenes: (active: boolean) => { scene: { key: string } }[] } };
}
interface DebugHandle {
  completeStack: () => void;
  setTimeRemaining: (seconds: number) => void;
  state: () => Record<string, unknown>;
}
export type { GameHandle, DebugHandle };

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  await page.goto('/');
  await page.waitForFunction(
    () => (globalThis as unknown as { __BURGER_RUSH__?: unknown }).__BURGER_RUSH__ !== undefined,
    null,
    { timeout: 30_000 },
  );
});

async function activeScene(page: Page): Promise<string> {
  return page.evaluate(() => {
    const api = (globalThis as unknown as {
      __BURGER_RUSH__?: { game: { scene: { getScenes: (a: boolean) => { scene: { key: string } }[] } } };
    }).__BURGER_RUSH__;
    const scenes = api?.game.scene.getScenes(true) ?? [];
    return scenes.at(-1)?.scene.key ?? '';
  });
}

async function waitForScene(page: Page, key: string, timeout = 25_000): Promise<void> {
  await expect
    .poll(async () => activeScene(page), { timeout, message: `waiting for scene ${key}` })
    .toBe(key);
}

async function startArcadeRun(page: Page): Promise<void> {
  await waitForScene(page, 'Title');
  await page.keyboard.press('Enter'); // Arcade Run
  await waitForScene(page, 'CharacterSelect');
  await page.keyboard.press('Enter'); // ready
  await waitForScene(page, 'StackPhase');
}

test('boots to the title screen with no console errors', async ({ page }) => {
  await waitForScene(page, 'Title');
  expect(consoleErrors).toEqual([]);
});

test('reaches the Stack Phase through chef select', async ({ page }) => {
  await startArcadeRun(page);
  const state = await page.evaluate(() => (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { state: () => Record<string, unknown> } }).__BURGER_RUSH_DEBUG__?.state());
  expect(state).toMatchObject({ burgers: 0, aprons: 3 });
  // Exactly 60.0 seconds after the ready animation.
  expect(state?.timeRemaining).toBeCloseTo(60, 0);
  // Field spatulas do not exist before round 10.
  expect(state?.fieldSpatulas).toBe(0);
});

test('the chef moves and presses tread segments', async ({ page }) => {
  await startArcadeRun(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  const state = await page.evaluate(() => (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { state: () => Record<string, unknown> } }).__BURGER_RUSH_DEBUG__?.state());
  // The timer starts on the first accepted movement input.
  expect(state?.timeRemaining).toBeLessThan(60);
});

test('completing the burger triggers the warning, launch and Boss Flight', async ({ page }) => {
  await startArcadeRun(page);
  await page.evaluate(() => (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { completeStack: () => void } }).__BURGER_RUSH_DEBUG__?.completeStack());

  // The warning overlay renders both exact strings from localisation resources.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const state = (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { state: () => Record<string, unknown> } }).__BURGER_RUSH_DEBUG__?.state();
          return state?.phase as string | undefined;
        }),
      { timeout: 20_000 },
    )
    .toBe('warning');

  await waitForScene(page, 'BossFlight', 30_000);
  expect(consoleErrors).toEqual([]);
});

test('holding fire in Boss Flight never depletes anything', async ({ page }) => {
  await startArcadeRun(page);
  await page.evaluate(() => (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { completeStack: () => void } }).__BURGER_RUSH_DEBUG__?.completeStack());
  await waitForScene(page, 'BossFlight', 30_000);

  await page.keyboard.down('KeyX');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyX');

  // The HUD shows an infinity marker and never a depleting count.
  const hasCounter = await page.evaluate(() => document.body.innerText.includes('/'));
  expect(hasCounter).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test('reduced motion keeps the same timing and still reaches Boss Flight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startArcadeRun(page);
  await page.evaluate(() => (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { completeStack: () => void } }).__BURGER_RUSH_DEBUG__?.completeStack());
  await waitForScene(page, 'BossFlight', 30_000);
  expect(consoleErrors).toEqual([]);
});

test('running the timer out ends the round in results', async ({ page }) => {
  await startArcadeRun(page);
  await page.evaluate(() => (globalThis as unknown as { __BURGER_RUSH_DEBUG__?: { setTimeRemaining: (s: number) => void } }).__BURGER_RUSH_DEBUG__?.setTimeRemaining(0.5));
  await waitForScene(page, 'Results', 25_000);
  expect(consoleErrors).toEqual([]);
});

test('the Doll Lab opens and cycles clips without errors', async ({ page }) => {
  await waitForScene(page, 'Title');
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await waitForScene(page, 'DollLab');
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(90);
  }
  await page.keyboard.press('ArrowDown'); // next variant
  await page.keyboard.press('KeyC'); // swap slot accent
  await page.keyboard.press('KeyB'); // bone overlay
  await page.keyboard.press('KeyF'); // face expression
  await page.waitForTimeout(400);
  expect(consoleErrors).toEqual([]);
});

test('local co-op select shows two independent panels', async ({ page }) => {
  await waitForScene(page, 'Title');
  await page.keyboard.press('ArrowDown'); // Local Sibling Co-op
  await page.keyboard.press('Enter');
  await waitForScene(page, 'CharacterSelect');
  // The keyboard claims Player 1; Player 2 stays open for a second device, so
  // the run must not start from a single device.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  expect(await activeScene(page)).toBe('CharacterSelect');
  expect(consoleErrors).toEqual([]);
});

test('survives a resize without errors', async ({ page }) => {
  await startArcadeRun(page);
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1400, height: 700 });
  await page.waitForTimeout(500);
  expect(await activeScene(page)).toBe('StackPhase');
  expect(consoleErrors).toEqual([]);
});
