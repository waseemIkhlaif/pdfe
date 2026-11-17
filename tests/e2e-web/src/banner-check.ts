import { expect, type Page } from '@playwright/test';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import type { Lang } from './routes';

/**
 * The simulation-label check (FR-022, SC-011). On the page that is open it asserts that the banner
 *  - exists once, is visible, and is a `role="status"` region marked `data-sim="1"`;
 *  - shows exactly `SIM_LABEL_EN` (page language en) or `SIM_LABEL_AR` (ar), as the reader sees it;
 *  - is really on top: the element at the banner's centre belongs to the banner, so nothing covers it.
 * A failure names `where` (the app and the route), so the report says which page lost its label.
 */
export async function assertBanner(
  page: Page,
  lang: Lang,
  where: string,
  opts: { timeout?: number } = {},
): Promise<void> {
  const to = opts.timeout === undefined ? {} : { timeout: opts.timeout };
  const banner = page.locator('[data-sim="1"]');
  await expect(banner, `${where}: the page must have exactly one simulation banner`).toHaveCount(
    1,
    to,
  );
  await expect(banner, `${where}: the banner must be visible`).toBeVisible(to);
  await expect(banner, `${where}: the banner must be a status region`).toHaveAttribute(
    'role',
    'status',
    to,
  );

  const shown = (await banner.innerText(to)).replace(/\s+/g, ' ').trim();
  const expected = lang === 'ar' ? SIM_LABEL_AR : SIM_LABEL_EN;
  expect(shown, `${where}: the banner text in ${lang}`).toBe(expected);

  const box = await banner.boundingBox();
  expect(box, `${where}: the banner must have a size`).not.toBeNull();
  const onTop = await page.evaluate(
    ({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      const b = document.querySelector('[data-sim="1"]');
      return !!hit && !!b && b.contains(hit);
    },
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );
  expect(onTop, `${where}: something covers the banner`).toBe(true);
}
