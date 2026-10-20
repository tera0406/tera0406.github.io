// 產生自託管的字型子集：npm run fonts
// 1. 用 font-chars.mjs 收集中、英文頁實際會顯示的字。
// 2. 中文字型（Noto Sans TC／Noto Serif TC）：從 Google Fonts 下載完整的 TTF（快取在 node_modules/.cache/fonts/），
//    用 subset-font（HarfBuzz）只留下用到的字，輸出 woff2。每個字重一個檔，不切片：
//    切成多個檔會讓同一行文字在字型檔之間來回切換，排版明顯變慢（實測 Lighthouse 的 TBT 從 110 ms 變 500 ms）。
// 3. 拉丁字型（Source Sans 3／Source Serif 4）：直接用 Google Fonts 的 latin 子集 woff2。
// 4. 寫出 public/fonts/fonts-zh.css、fonts-en.css（@font-face）和 manifest.json（涵蓋了哪些字）。
// 網站不再連 Google Fonts；內容新增了新的字時 npm run check:content 會提醒重新執行本指令。
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';
import { collectChars, collectHeadingChars, root } from './font-chars.mjs';

const out = join(root, 'public', 'fonts');
const cache = join(root, 'node_modules', '.cache', 'fonts');
const UA_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const UA_OLD = 'Mozilla/4.0'; // 舊瀏覽器的 UA：Google 會回完整的 TTF，而不是切片的 woff2

// 拉丁字型：只拿 latin 子集（中文字型會補其他字元）。
const LATIN = [
  ['Source Sans 3', 'ital,wght@0,400;0,600;0,700;1,400', 'source-sans-3'],
  ['Source Serif 4', 'wght@700', 'source-serif-4'],
];
// 中文字型：依語言各做一份子集。襯線字型只用在標題，所以只做標題會用到的字。
const CJK = [
  ['Noto Sans TC', [400, 700], 'noto-sans-tc', collectChars],
  ['Noto Serif TC', [700], 'noto-serif-tc', collectHeadingChars],
];

async function fetchText(url, ua) {
  const r = await fetch(url, { headers: { 'user-agent': ua } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
async function fetchBin(url, ua) {
  const r = await fetch(url, { headers: { 'user-agent': ua } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
const cssUrl = (family, axes) => `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axes}&display=swap`;
function parseFaces(css) {
  return [...css.matchAll(/(?:\/\*\s*(\S+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g)].map(([, subset, body]) => {
    const get = (k) => body.match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim();
    return { subset, family: get('font-family').replace(/'/g, ''), style: get('font-style'), weight: get('font-weight'), url: get('src').match(/url\(([^)]+)\)/)[1], range: get('unicode-range') };
  });
}
const face = (f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(./${f.file}) format('woff2')${f.range ? `;unicode-range:${f.range}` : ''}}`;

mkdirSync(out, { recursive: true });
mkdirSync(cache, { recursive: true });
for (const f of readdirSync(out)) if (/\.(woff2|css|json)$/.test(f)) unlinkSync(join(out, f));

const files = {};
function save(name, buf) {
  writeFileSync(join(out, name), buf);
  files[name] = buf.length;
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('拉丁字型（Google Fonts 的 latin 子集）');
const latinFaces = [];
for (const [family, axes, slug] of LATIN) {
  const css = await fetchText(cssUrl(family, axes), UA_CHROME);
  for (const f of parseFaces(css).filter((x) => x.subset === 'latin')) {
    f.file = `${slug}-${f.weight}${f.style === 'italic' ? '-italic' : ''}.woff2`;
    save(f.file, await fetchBin(f.url, UA_CHROME));
    latinFaces.push(f);
  }
}

// 完整的中文字型 TTF（約 10 MB 一個），下載一次之後快取。
async function fullFont(family, weight, slug) {
  const path = join(cache, `${slug}-${weight}.ttf`);
  if (!existsSync(path)) {
    const css = await fetchText(cssUrl(family, `wght@${weight}`), UA_OLD);
    const [f] = parseFaces(css);
    if (!f || !/\.ttf$/.test(f.url)) throw new Error(`${family} ${weight}：拿不到完整的 TTF（${f?.url}）`);
    console.log(`  下載 ${family} ${weight} 完整字型…`);
    writeFileSync(path, await fetchBin(f.url, UA_OLD));
  }
  return readFileSync(path);
}

const manifest = { generated: new Date().toISOString().slice(0, 10), chars: {}, headingChars: {}, preload: {}, files };
for (const lang of ['zh', 'en']) {
  manifest.chars[lang] = collectChars(lang);
  manifest.headingChars[lang] = collectHeadingChars(lang);
  console.log(`${lang}：內文 ${manifest.chars[lang].length} 個、標題 ${manifest.headingChars[lang].length} 個非 ASCII 字元`);
  const faces = [...latinFaces];
  for (const [family, weights, slug, collect] of CJK) {
    const chars = collect(lang);
    for (const weight of weights) {
      const f = { family, style: 'normal', weight: String(weight), range: '', file: `${slug}-${weight}.${lang}.woff2` };
      save(f.file, await subsetFont(await fullFont(family, weight, slug), chars, { targetFormat: 'woff2' }));
      faces.push(f);
    }
  }
  // 預先載入：只預載小的拉丁字型。實測過預載中文子集會跟 CSS 搶頻寬，行動網路上的首次繪製從 0.9 秒變成 2.9 秒。
  manifest.preload[lang] = ['source-sans-3-400.woff2', 'source-serif-4-700.woff2'];
  writeFileSync(join(out, `fonts-${lang}.css`), `/* 由 scripts/build-fonts.mjs 產生，請勿手動修改 */\n${faces.map(face).join('\n')}\n`);
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`完成：${Object.keys(files).length} 個字型檔，共 ${(Object.values(files).reduce((a, b) => a + b, 0) / 1024).toFixed(0)} KB`);
