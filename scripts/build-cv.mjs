// 產生一頁式 CV（PDF）：讀取已建置好的 dist/{en,zh}/cv/，用 Chromium 輸出 A4 PDF 到 public/cv/。
// 用法：npm run cv（會先建置網站、產生 PDF，再重新建置一次，讓 PDF 一起進到 dist/）。
// 需要 Playwright 的 Chromium：本機第一次用請先執行 `npx playwright install chromium`；
// 若環境已有 Chromium，可用環境變數 CHROMIUM_PATH 指定執行檔路徑。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

// 簡單的靜態伺服器，只服務 dist/
const server = createServer(async (req, res) => {
  try {
    let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = false;
for (const lang of ['en', 'zh']) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/${lang}/cv/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = join(root, 'public', 'cv', `Chao-Yuan_Chiang_CV_${lang}.pdf`);
  const pdf = await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  // 計算 PDF 頁數，超過一頁就讓指令失敗
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`${lang}: ${out}（${pages} 頁）`);
  if (pages !== 1) failed = true;
  await page.close();
}
await browser.close();
server.close();
if (failed) { console.error('CV 超過一頁，請精簡內容（例如縮短 research[].summary）。'); process.exit(1); }
