// usage: node scripts/shot.mjs <url-or-file> <out.png> [width] [height] [fullPage]
// Run via scripts/shot.sh so Chromium finds its libs on the Jinx container.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const [src, out, w = '1280', h = '800', full] = process.argv.slice(2);
const url = /^https?:|^file:/.test(src) ? src : 'file://' + resolve(src);
const executablePath = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath, args: ['--disable-gpu', '--js-flags=--max-old-space-size=96'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: full === 'full' });
await browser.close();
console.log('saved', out);
