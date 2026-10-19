// 內容檢查：部署前自動執行（npm run check:content）。
// 檢查中英文內容檔結構一致、圖片存在、YouTube ID 格式、沒有 TODO 或不該公開的資料。
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (lang) => JSON.parse(readFileSync(join(root, 'content', `${lang}.json`), 'utf8'));
const errors = [];
const zh = load('zh');
const en = load('en');

// 1. 兩個語言的結構（key 與陣列長度）要一致；文字可以不同。
function shape(o, path = '') {
  if (Array.isArray(o)) return [`${path}[${o.length}]`, ...o.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (o && typeof o === 'object') return Object.keys(o).filter((k) => !k.startsWith('_')).sort().flatMap((k) => [`${path}.${k}`, ...shape(o[k], `${path}.${k}`)]);
  return [];
}
// 允許只存在於某一語言的欄位（例如中文論文的英文題目 titleEn）。以 _ 開頭的欄位是維護註記，不比對。
const optional = /\.titleEn$|\.abstractEn$/;
const a = new Set(shape(zh).filter((p) => !optional.test(p)));
const b = new Set(shape(en).filter((p) => !optional.test(p)));
for (const p of a) if (!b.has(p)) errors.push(`en.json 缺少：${p}`);
for (const p of b) if (!a.has(p)) errors.push(`zh.json 缺少：${p}`);

// 2. 圖片檔要存在於 src/assets/img/，而且每張圖都要有 alt。
function walk(o, fn, path = '') {
  if (Array.isArray(o)) o.forEach((v, i) => walk(v, fn, `${path}[${i}]`));
  else if (o && typeof o === 'object') { fn(o, path); for (const k of Object.keys(o)) walk(o[k], fn, `${path}.${k}`); }
}
for (const [lang, c] of [['zh', zh], ['en', en]]) {
  walk(c, (o, path) => {
    for (const key of ['file', 'thumb']) {
      if (typeof o[key] === 'string' && /\.(jpe?g|png|webp)$/i.test(o[key])) {
        if (!existsSync(join(root, 'src/assets/img', o[key]))) errors.push(`${lang}${path}.${key}：找不到圖片 ${o[key]}`);
        if (key === 'file' && !o.alt) errors.push(`${lang}${path}：圖片 ${o.file} 沒有 alt 替代文字`);
        if (key === 'thumb' && !o.thumbAlt) errors.push(`${lang}${path}：代表圖 ${o.thumb} 沒有 thumbAlt 替代文字`);
      }
    }
    if (typeof o.youtubeId === 'string' && !/^[\w-]{11}$/.test(o.youtubeId)) errors.push(`${lang}${path}：YouTube ID 格式不對：${o.youtubeId}`);
  });

  // 3. 不該出現的文字：TODO、成績與排名、電話、學號等。
  const text = JSON.stringify(c);
  const banned = [
    [/TODO/i, 'TODO（尚未完成的內容）'],
    [/GPA|班排|名次|rank(ed)? \d/i, '成績或排名'],
    [/IELTS|TOEIC/i, '語言成績'],
    [/\b09\d{2}[- ]?\d{3}[- ]?\d{3}\b/, '手機號碼'],
    [/\bB\d{9}\b/i, '學號'],
    [/g-mail\.nsysu\.edu\.tw/i, '學校信箱（目前決定不公開）'],
  ];
  for (const [re, label] of banned) if (re.test(text)) errors.push(`${lang}.json 含有${label}：${text.match(re)[0]}`);
}

// 3b. 一頁式 CV 的 PDF 要存在（用 npm run cv 產生）。
for (const lang of ['en', 'zh']) {
  if (!existsSync(join(root, 'public', 'cv', `Chao-Yuan_Chiang_CV_${lang}.pdf`))) errors.push(`缺少 public/cv/Chao-Yuan_Chiang_CV_${lang}.pdf，請執行 npm run cv`);
}

// 4. 中文用語：台灣用語檢查（只檢查中文檔）。
const zhText = JSON.stringify(zh);
for (const [bad, good] of [['信息', '資訊'], ['網絡', '網路'], ['優化', '最佳化'], ['調用', '呼叫'], ['質量', '品質'], ['軟件', '軟體'], ['硬件', '硬體'], ['數據集', '資料集'], ['視頻', '影片']]) {
  if (zhText.includes(bad)) errors.push(`zh.json 用了「${bad}」，台灣用語建議改成「${good}」`);
}

if (errors.length) {
  console.error(`內容檢查失敗（${errors.length} 項）：\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('內容檢查通過：zh.json 與 en.json 結構一致，圖片與連結格式正確。');
