import { expect, type Page } from '@playwright/test';

export interface ProbeInfo {
  sceneId: string;
  refs?: string[];
  state?: Record<string, unknown>;
}

/** Opens the game and fails on any console error or uncaught exception during the test. */
export async function openGame(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  return errors;
}

/** Latest debug info the running scene published (see src/systems/debug.ts). */
export async function probe(page: Page): Promise<ProbeInfo | undefined> {
  return page.evaluate(() => Reflect.get(globalThis, '__storyDebug') as ProbeInfo | undefined);
}

/** Waits until the probe reports the given scene. */
export async function waitForScene(page: Page, sceneId: string): Promise<void> {
  await expect.poll(async () => (await probe(page))?.sceneId, { timeout: 15_000 }).toBe(sceneId);
}

export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screens/${name}.png` });
}
