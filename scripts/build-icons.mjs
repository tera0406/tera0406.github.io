// 從 public/favicon.svg 產生 iOS 主畫面用的 apple-touch-icon.png（180×180）：npm run icons
// 只有改了 favicon.svg 才需要重跑。需要 Playwright 的 Chromium（同 build-cv.mjs，可用 CHROMIUM_PATH 指定）。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// iOS 會自己把圖示切圓角，所以輸出的是滿版方形（拿掉 SVG 的 rx）。
const svg = readFileSync(join(root, 'public', 'favicon.svg'), 'utf8').replace(/ rx="\d+"/, '');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><body style="margin:0">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body>`);
const out = join(root, 'public', 'apple-touch-icon.png');
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 180, height: 180 }, omitBackground: true });
await browser.close();
console.log(`已產生 ${out}`);
