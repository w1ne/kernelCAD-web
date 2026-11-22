// Read-only visual acceptance: source-backed manufacturing cards on the deployed library.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

const URL = 'https://kernelcad.com/asset-library/?category=manufacturing';
const OUTPUT = process.env.OUTPUT_DIR || path.resolve('artifacts/manufacturing-library');
const SAMPLES = [
  ['electronics-enclosure', 'gallery=manufacturing-enclosure'],
  ['nema-stepper', 'catalog=manufacturing/nema-stepper'],
  ['heat-set-insert', 'catalog=manufacturing/heat-set-insert'],
  ['angle-bracket', 'catalog=standard-components/angle-bracket&'],
  ['cable-clamp', 'catalog=standard-components/cable-clamp'],
  ['involute-spur-gear', 'catalog=manufacturing/involute-spur-gear'],
];

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
    args: ['--no-sandbox'],
  });
  const results = [];
  try {
    for (const width of [390, 1366]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error)));
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.locator('a.asset-card-link').first().waitFor({ timeout: 30_000 });
      // Cards are progressively rendered; do not infer acceptance from only the first 24.
      for (let i = 0; i < 4 && await page.locator('a.asset-card-link').count() < 66; i++) {
        await page.getByRole('button', { name: 'Show more models' }).click();
        await page.waitForTimeout(200);
      }
      const cardCount = await page.locator('a.asset-card-link').count();
      if (cardCount !== 66) throw new Error(`${width}px: expected 66 cards, found ${cardCount}`);
      for (const [id, hrefFragment] of SAMPLES) {
        const match = page.locator(`a.asset-card-link[href*="${hrefFragment}"]`).first();
        if (!await match.count()) throw new Error(`${width}px: missing ${id} destination ${hrefFragment}`);
        const href = await match.getAttribute('href');
        if (!href?.includes(hrefFragment)) throw new Error(`${width}px: invalid ${id} link`);
        const card = match.locator('xpath=..');
        await card.scrollIntoViewIfNeeded();
        const img = match.locator('img');
        await img.evaluate(async element => { await element.decode(); });
        const meta = await img.evaluate(element => ({ src: element.currentSrc, w: element.naturalWidth, h: element.naturalHeight }));
        if (meta.w !== 720 || meta.h !== 540) throw new Error(`${width}px: ${id} image ${meta.w}x${meta.h}`);
        await card.screenshot({ path: path.join(OUTPUT, `${width}-${id}.png`), animations: 'disabled', timeout: 15_000 });
        results.push({ width, id, href, image: meta });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (overflow > 1) throw new Error(`${width}px: horizontal overflow ${overflow}px`);
      if (pageErrors.length) throw new Error(`${width}px: JavaScript exceptions: ${pageErrors.join('; ')}`);
      await page.close();
    }
    await fs.writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify({ url: URL, cardCount: 66, screenshots: results }, null, 2));
    console.log(`Captured ${results.length} source-bound card screenshots from 66 production models`);
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
