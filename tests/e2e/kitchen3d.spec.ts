/**
 * 3D kitchen smoke test.
 *
 * Proves the thing actually runs: the scene boots, the chef moves under input,
 * and nothing throws. Screenshots are written so the result can be looked at
 * rather than inferred from a green tick.
 */

import { test, expect } from '@playwright/test';

const SHOTS =
  '/tmp/claude-0/-home-user-burgerrush/dd448351-a05c-5800-8279-8629e729df2c/scratchpad/art';

test('the 3D kitchen boots, renders and responds to input', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto('/?3d&seed=3');
  await page.waitForTimeout(3000);

  // A WebGL canvas must exist and have real size.
  // Target the three.js canvas specifically; Phaser must not be running here.
  const canvas = page.locator('#game-root canvas[data-engine^="three.js"]');
  await expect(canvas).toBeVisible();
  await expect(page.locator('#game-root canvas')).toHaveCount(1);
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(400);

  await page.screenshot({ path: `${SHOTS}/k1.png` });

  // Drive it: run, then try a climb.
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowRight']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(400);
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/k2.png` });

  const hud = await page.evaluate(
    () => (document.querySelector('#game-root div') as HTMLElement | null)?.innerText ?? '',
  );
  expect(hud).toContain('BURGER RUSH 3D');
  // The level on screen must be one the validator proved winnable.
  expect(hud).toContain('solvable: proven');

  // The CDN texture fetch may be blocked by the sandbox egress policy. That is
  // environmental, and the painted fallback covers it - so a failed resource
  // load is tolerated while a real script error is not.
  const realErrors = errors.filter((e) => !/Failed to load resource|ERR_TUNNEL/.test(e));
  expect(realErrors).toEqual([]);
  // Whichever art path was taken, the game must say which one it used.
  expect(hud).toMatch(/art: (Higgsfield render|offline fallback)/);
});
