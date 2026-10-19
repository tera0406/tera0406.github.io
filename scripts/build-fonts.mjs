// 產生自託管的字型子集：npm run fonts
// 1. 用 font-chars.mjs 收集中、英文頁實際會顯示的字。
// 2. 向 Google Fonts 要「只含這些字」的 Noto Sans TC／Noto Serif TC（text= 參數），以及拉丁字型的 latin 子集。
// 3. 存到 public/fonts/，並寫出 fonts-zh.css、fonts-en.css（@font-face）和 manifest.json（涵蓋了哪些字）。
// 網站不再連 Google Fonts；內容新增了新的字時 npm run check:content 會提醒重新執行本指令。
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { collectChars, collectHeadingChars, root } from './font-chars.mjs';

const out = join(root, 'public', 'fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CHUNK = 600; // 每個請求最多幾個字（Google 對 text= 的長度有限制）

// 拉丁字型：只拿 latin 子集（Noto 子集會補其他字元）。
const LATIN = [
  ['Source Sans 3', 'ital,wght@0,400;0,600;0,700;1,400', 'source-sans-3'],
  ['Source Serif 4', 'wght@700', 'source-serif-4'],
];
// 中文字型：依語言各做一份子集。襯線字型只用在標題，所以只做標題會用到的字。
const CJK = [
  ['Noto Sans TC', [400, 700], 'noto-sans-tc', collectChars],
  ['Noto Serif TC', [700], 'noto-serif-tc', collectHeadingChars],
];

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
async function fetchBin(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
function parseFaces(css) {
  return [...css.matchAll(/(?:\/\*\s*(\S+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g)].map(([, subset, body]) => {
    const get = (k) => body.match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim();
    return { subset, family: get('font-family').replace(/'/g, ''), style: get('font-style'), weight: get('font-weight'), url: get('src').match(/url\(([^)]+)\)/)[1], range: get('unicode-range') };
  });
}
const toRanges = (chars) => {
  const cps = [...new Set([...chars].map((c) => c.codePointAt(0)))].sort((a, b) => a - b);
  const r = [];
  for (const cp of cps) { const last = r[r.length - 1]; if (last && cp === last[1] + 1) last[1] = cp; else r.push([cp, cp]); }
  return r.map(([a, b]) => (a === b ? `U+${a.toString(16)}` : `U+${a.toString(16)}-${b.toString(16)}`)).join(', ');
};
const face = (f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(./${f.file}) format('woff2');unicode-range:${f.range}}`;

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (/\.(woff2|css|json)$/.test(f)) unlinkSync(join(out, f));

const files = {};
async function save(name, url) {
  const buf = await fetchBin(url);
  writeFileSync(join(out, name), buf);
  files[name] = buf.length;
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('拉丁字型（latin 子集）');
const latinFaces = [];
for (const [family, axes, slug] of LATIN) {
  const css = await fetchText(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:${axes}&display=swap`);
  for (const f of parseFaces(css).filter((x) => x.subset === 'latin')) {
    const wt = f.weight.split(' ').pop(); // 可變字型會給 "8..60 600" 之類；檔名用最後一段
    f.file = `${slug}-${wt}${f.style === 'italic' ? '-italic' : ''}.woff2`;
    await save(f.file, f.url);
    latinFaces.push(f);
  }
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
      for (let i = 0; i * CHUNK < chars.length; i++) {
        const chunk = chars.slice(i * CHUNK, (i + 1) * CHUNK);
        const css = await fetchText(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&display=swap&text=${encodeURIComponent(chunk)}`);
        const parsed = parseFaces(css);
        if (parsed.length !== 1) throw new Error(`${family} ${weight}：Google 沒有回傳子集（${parsed.length} 個 @font-face），請縮小 CHUNK`);
        const f = { family, style: 'normal', weight: String(weight), range: toRanges(chunk), file: `${slug}-${weight}.${lang}.${i}.woff2` };
        await save(f.file, parsed[0].url);
        faces.push(f);
      }
    }
  }
  // 預先載入：只預載小的拉丁字型。實測過預載中文子集（約 150 KB）會跟 CSS 搶頻寬，
  // 行動網路上的首次繪製從 0.9 秒變成 2.9 秒；中文字型改用 font-display: swap 自然載入。
  manifest.preload[lang] = ['source-sans-3-400.woff2', 'source-serif-4-700.woff2'];
  writeFileSync(join(out, `fonts-${lang}.css`), `/* 由 scripts/build-fonts.mjs 產生，請勿手動修改 */\n${faces.map(face).join('\n')}\n`);
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`完成：${Object.keys(files).length} 個字型檔，共 ${(Object.values(files).reduce((a, b) => a + b, 0) / 1024).toFixed(0)} KB`);
