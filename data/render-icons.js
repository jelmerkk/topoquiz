#!/usr/bin/env node
/**
 * SVG-iconen naar PNG renderen via Playwright headless-chromium.
 * Draai lokaal één keer na wijziging van icon.svg / icon-maskable.svg:
 *
 *   node data/render-icons.js
 *
 * Resultaat: icon-192.png, icon-512.png, icon-maskable-512.png,
 * apple-touch-icon.png in de repo-root. Commit die PNG's erbij zodat
 * CF/production ze serveert (rsync-include staat in e2e.yml).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// svgFile → target-PNG + pixelmaat. Voor iOS is 180x180 de standaard.
const TARGETS = [
  { svg: 'icon.svg',          out: 'icon-192.png',            size: 192 },
  { svg: 'icon.svg',          out: 'icon-512.png',            size: 512 },
  { svg: 'icon.svg',          out: 'apple-touch-icon.png',    size: 180 },
  { svg: 'icon-maskable.svg', out: 'icon-maskable-512.png',   size: 512 },
];

(async () => {
  const browser = await chromium.launch();
  for (const t of TARGETS) {
    const svg = fs.readFileSync(path.join(ROOT, t.svg), 'utf8');
    const html = `<!doctype html><html><head><style>
      html,body { margin:0; padding:0; background:transparent; }
      svg { display:block; width:${t.size}px; height:${t.size}px; }
    </style></head><body>${svg}</body></html>`;
    const page = await browser.newPage({
      viewport: { width: t.size, height: t.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'networkidle' });
    // Wacht even zodat de OS-emoji-font gerenderd is.
    await page.waitForTimeout(150);
    const buf = await page.locator('svg').screenshot({ omitBackground: true });
    fs.writeFileSync(path.join(ROOT, t.out), buf);
    await page.close();
    console.log(`✓ ${t.out} (${t.size}×${t.size})`);
  }
  await browser.close();
})();
