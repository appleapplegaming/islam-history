import { expect, test } from '@playwright/test';
import { openGame, probe, screenshot, waitForScene } from './game.ts';

test('the map hub starts with Yusuf selected and reports unbuilt chapters', async ({ page }) => {
  const errors = await openGame(page);
  await waitForScene(page, 'map');
  expect((await probe(page))?.state).toMatchObject({ selected: 'yusuf', playable: false });
  await screenshot(page, 'map');

  await page.locator('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Enter');
  await expect
    .poll(async () => (await probe(page))?.state?.['message'])
    .toBe('Yusuf (as): this chapter is not built yet.');
  await screenshot(page, 'map-after-enter');

  expect(errors).toEqual([]);
});
