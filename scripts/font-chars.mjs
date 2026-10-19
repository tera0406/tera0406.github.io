// 收集網站實際會顯示的非 ASCII 字元（給字型子集用）。
// 來源：content/<lang>.json（略過 _ 開頭的維護註記）＋ src/ 底下的樣板（略過註解）。
// build-fonts.mjs 用它決定要下載哪些字；check-content.mjs 用它確認字型子集沒有缺字。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const stripNotes = (o) => {
  if (Array.isArray(o)) return o.map(stripNotes);
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, stripNotes(v)]));
  return o;
};
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

function listSrc(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listSrc(p, out);
    else if (/\.(astro|ts|css)$/.test(name)) out.push(p);
  }
  return out;
}

const nonAscii = (text, set) => { for (const ch of text) if (ch.codePointAt(0) > 0x7f) set.add(ch); return set; };

const templateChars = () => { const set = new Set(); for (const f of listSrc(join(root, 'src'))) nonAscii(stripComments(readFileSync(f, 'utf8')), set); return set; };
const load = (lang) => stripNotes(JSON.parse(readFileSync(join(root, 'content', `${lang}.json`), 'utf8')));

/** 回傳某語言頁面需要的非 ASCII 字元（排序後的字串）：內文字型（Noto Sans TC）要涵蓋全部。 */
export function collectChars(lang) {
  return [...nonAscii(JSON.stringify(load(lang)), templateChars())].sort().join('');
}

/** 標題字型（Noto Serif TC）只用在：姓名、區塊標題、專案標題、CV 標題。只做這些字的子集，檔案小很多。
 *  如果日後版面把襯線字型用到別的欄位，請把那個欄位加進這裡，再執行 npm run fonts。 */
export function collectHeadingChars(lang) {
  const c = load(lang);
  const fields = [c.meta.name, c.meta.nameAlt, ...Object.values(c.ui.sections), ...Object.values(c.ui.nav), ...c.research.map((r) => r.title)];
  return [...nonAscii(fields.join(''), templateChars())].sort().join('');
}
