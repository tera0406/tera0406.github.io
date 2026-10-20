// 自託管字型（public/fonts/，由 `npm run fonts` 產生）。
// 把產生好的 @font-face 直接內嵌到頁面，不再連 Google Fonts。
import manifest from '../../public/fonts/manifest.json';
import zh from '../../public/fonts/fonts-zh.css?raw';
import en from '../../public/fonts/fonts-en.css?raw';
import type { Lang } from './content';

const css: Record<Lang, string> = { zh, en };

/**
 * 某語言頁面要內嵌的 @font-face CSS，分成拉丁字型（小，直接放 <style>）和中文字型（大，見 Base.astro 的載入方式）。
 * base 是網站的子路徑（GitHub Pages 專案站台會有）。
 */
export function fontCss(lang: Lang, base: string, display: 'swap' | 'block' = 'swap') {
  const rules = css[lang]
    .replace(/url\(\.\//g, `url(${base}/fonts/`)
    .replace(/font-display:swap/g, `font-display:${display}`)
    .split('\n')
    .filter((l) => l.startsWith('@font-face'));
  const isCjk = (l: string) => /font-family:'Noto /.test(l);
  return { latin: rules.filter((l) => !isCjk(l)).join('\n'), cjk: rules.filter(isCjk).join('\n') };
}

/** 一開始就會用到、值得 preload 的字型檔。 */
export function fontPreloads(lang: Lang, base: string) {
  return (manifest.preload as Record<Lang, string[]>)[lang].map((f) => `${base}/fonts/${f}`);
}
