# 姜兆源 Chao-Yuan Chiang｜個人學術網站

中英雙語的個人學術網站，用 [Astro](https://astro.build/) 建置，透過 GitHub Actions 自動部署到 GitHub Pages。

- 網址：<https://tera0406.github.io/>（中文 `/zh/`、英文 `/en/`；根網址會依上次選擇或瀏覽器語言自動轉址）
- Repo：`tera0406/tera0406.github.io`（原名 `tera0406/resume`，GitHub 會自動轉址）

> **給 Claude（或其他 AI 助理）**：請先讀完第 2 節「維護手冊」再動手。裡面有內容規則、隱私禁區、資料格式，以及新增或更新專案的標準流程。

---

## 1. 給本人：快速上手

```bash
npm install            # 第一次才需要
npm run dev            # 本機預覽 http://localhost:4321/
npm run check:content  # 改完內容先檢查
npm run build          # 建置到 dist/（部署前 CI 也會跑）
npm run cv             # 重新產生一頁式 CV（public/cv/*.pdf），內容有改就要跑
```

- 改文字：只要改 `content/zh.json` 和 `content/en.json`，兩個檔案的結構要一模一樣。
- 加圖片：放進 `src/assets/img/`，在 JSON 裡用檔名引用。
- 上線：推到 `main` 就會自動部署，約 1～2 分鐘完成。進度可以在 GitHub repo 的 **Actions** 分頁查看。

---

## 2. 維護手冊（給 Claude）

### 2.1 專案結構

| 路徑 | 用途 |
|---|---|
| `content/zh.json`、`content/en.json` | **所有網站文字**。中英文結構必須完全一致（key、陣列長度、順序） |
| `src/assets/img/` | 網站用的圖片。建置時 Astro 會自動轉成 WebP、產生多種尺寸 |
| `src/pages/[lang]/index.astro` | 主頁面模板：左側個人欄＋右側各區塊 |
| `src/pages/index.astro` | 根網址的語言轉址 |
| `src/pages/404.astro`、`src/pages/sitemap.xml.ts` | 404 頁面、sitemap |
| `src/layouts/Base.astro` | `<head>`：SEO、hreflang、Open Graph、字型、JSON-LD |
| `src/components/Video.astro` | YouTube 延遲載入（youtube-nocookie，點了才載入；`poster` 是預覽圖） |
| `src/components/Icon.astro` | 左欄的圖示（Lucide：mail／linkedin／github／box） |
| `src/lib/content.ts` | 讀取 JSON、`img(檔名)`、`rich()`（`**粗體**` 轉 `<strong>`，其他 HTML 一律跳脫） |
| `src/styles/global.css` | 全部樣式。顏色變數在開頭的 `:root`，深色模式緊接在後，列印樣式在最後 |
| `scripts/check-content.mjs` | 內容檢查，CI 部署前會跑，失敗就不會部署 |
| `public/og-zh.png`、`public/og-en.png` | 社群分享預覽圖（1200×630） |
| `src/pages/[lang]/cv.astro` | 一頁式 CV 的 A4 版面（`/en/cv/`、`/zh/cv/`，noindex），內容讀同一份 JSON |
| `scripts/build-cv.mjs`、`public/cv/*.pdf` | 用 Chromium 把 CV 頁輸出成 PDF；超過一頁會失敗。網站左欄的 CV 圖示和頁尾的「下載 CV」連到這兩份 PDF |
| `astro.config.mjs` | 依 `GITHUB_REPOSITORY` 自動決定 `base`：repo 名稱是 `帳號.github.io` 時用 `/` |
| `.github/workflows/deploy.yml` | push 到 `main` 時依序執行 `npm ci` → `check:content` → `build` → 部署 |

頁面區塊順序：左欄（頭貼、姓名、身分、圖示連結、研究興趣）→ 右側依序是關於我、學歷、經歷、研究與專案、著作、獲獎與計畫、其他作品與活動。

### 2.2 內容規則（本人已確認，務必遵守）

1. **只寫有出處的事實。** 數字、日期、獎項、角色都要能在本人提供的資料裡找到，例如 CV、論文、簡報。不確定就問本人，**不要自己補寫或美化**，也不要留 `TODO`，因為 CI 會擋下來。
2. **角色照實寫。** 團隊專案用「我們／we」，本人負責的部分才寫「我／I」。已確認的分工：
   - **智慧分類垃圾桶**：本人是組長，負責機電整合，以及 PC、樹莓派、ESP32 之間的通訊；機構和核心 AI 模型由組員負責。
   - **OpenArm**：三人團隊。本人要求只寫「我們」，**不要細分誰做了什麼**。
   - **TEL Robot Combat**：本人是隊長，負責硬體架構與全機機構設計；軟體和 AI 由隊友負責。
3. **中文用台灣用語與繁體字**（資訊、網路、最佳化、呼叫；不用信息、網絡、優化、調用）。語氣平實，不要用「首創」「顛覆」這類詞。
4. **英文用正式學術語氣**，專有名詞前後一致，例如 system identification、sim-to-real、imitation learning、SmolVLA、Isaac Lab Mimic。英文要重新寫成英文的寫法，不是逐字翻譯。
5. **論文**：
   - 只放摘要，**不放全文 PDF**，**不列作者與作者順序**。
   - IEEE Access 那篇標示「審查中 / Under review」。題目以 PDF 內文的版本為準：*…Design and Evaluation on a Physical Prototype*。
6. **隱私禁區**（`check-content.mjs` 會自動擋其中一部分）：
   - 不放 GPA、班排、IELTS／TOEIC 分數、學號、電話、地址、學校信箱。
   - 不放未公開的夾爪（UMI）專案，任何字樣都不行。
   - 不放 Thingiverse 帳號名稱（帳號名會透露生日）。
   - 不放排球隊相關內容（本人要求拿掉）。
   - **不要連結或提到 `tera0406/trash_bin` repo**（本人決定不公開）。
   - 不要 commit 原始申請文件，例如 pptx、docx、論文 PDF、證明文件、推薦信，`.gitignore` 已經擋掉。
   - 公開的聯絡方式只有：`cdtera2446890@gmail.com`、LinkedIn、GitHub `tera0406`、MakerWorld。
7. **Pokémon 卡盒**只寫設計，**不提販售**，標題用中性名稱。

### 2.3 資料格式（`content/*.json`）

主要的 key：`meta`、`hero`、`education`、`experience`、`research`、`publications`、`awards`、`videos`、`activities`、`contact`、`ui`、`updated`。

- 以 `_` 開頭的 key（例如 `_src`、`_note`）是給維護者看的出處註記，不會顯示在網站上。新增事實時請一併寫上 `_src`。
- 只有 `hero.summary` 支援 `**粗體**`（經過 `rich()` 處理）；其他欄位寫 `**` 會原樣顯示。
- 新增欄位要中英兩邊同時加。介面文字放在 `ui.labels`、`ui.sections`、`ui.nav`。

**`research[]`（研究與專案）一筆的格式：**

```jsonc
{
  "id": "openarm-bimanual",          // 英文小寫加連字號，不可重複；同時是網址錨點 #openarm-bimanual
  "category": "研究實習",             // 卡片右上角的標籤
  "title": "…",
  "org": "…",                        // 卡片上的金色一行（短）
  "orgFull": "…",                    // 「詳細內容」裡的完整單位名稱
  "period": "2026 年 7–8 月",         // 可省略
  "summary": "…",                    // 卡片上的 1–2 句說明
  "brief": "…",                      // 「我的角色」一句
  "tags": ["Isaac Sim", "…"],
  "thumb": "urop_thumb.jpg",         // 代表圖；有影片時當影片預覽圖
  "thumbAlt": "…",                   // 代表圖的替代文字（必填）
  "video": { "youtubeId": "BDO_n6OTzGI" },   // 可省略；ID 也要出現在 videos[]
  "images": [                        // 卡片旁的小圖最多顯示 4 張（排除 thumb）；全部會出現在「詳細內容」
    { "file": "urop_annotation.jpg", "caption": "…", "alt": "…", "wide": true }
  ],
  "overview": "…",                   // 以下都在「詳細內容」裡，都可省略
  "method": ["…"], "system": "…", "design": ["…"], "contributions": ["…"],
  "team": "…", "results": ["…"], "challenges": ["…"], "next": ["…"], "reflection": "…"
}
```

**`publications[]`**：`id`、`type`、`title`（可另加 `titleEn`）、`venue`、`status`、`statusKind`、`year`、`date`（可省略）、`abstract`、`note`（可省略）。
- `statusKind` 決定狀態標籤的顏色：`review` 是黃色（審查中），`ok` 是藍色（已接受），`plain` 是無色。

**`experience[]`**：`role`、`org`、`place`、`period`、`items[]`、`link`（可省略，填專案的 `id`，會顯示「→ 專案介紹」）。

**`videos[]`**：`youtubeId`（11 個字元）、`title`、`caption`、`relatedProject`（專案的 `id`）。目前沒有獨立的影片區，影片只會嵌在專案卡片裡，播放器的標題取自這裡。

### 2.4 常見任務的標準流程

#### A. 新增一個專案

1. **先問本人**以下資訊，有原始資料（CV、簡報、論文）就請本人提供：
   - 題目、時間、單位或指導老師
   - 團隊人數，以及本人的角色
   - 結果（要有具體數字或出處）
   - 能公開的照片和影片
   - 有沒有不能公開的部分
2. 圖片處理：
   - 用 PIL 縮到最寬 1600px，存成 JPG（品質約 85）。PIL 預設不會保留 EXIF，等於順便去除。
   - 放進 `src/assets/img/`，檔名用英文，例如 `proj_xxx_1.jpg`。
   - 不要用有其他人入鏡的照片、證明文件截圖，或引用他人論文的圖。
3. 在 `content/zh.json` 和 `content/en.json` 的 `research[]` 加入同一筆資料，兩邊位置相同。陣列順序就是網頁上的顯示順序，最新、最重要的放前面。
4. 有影片的話：在 `research[].video` 填 `youtubeId`，同時在 `videos[]` 加一筆，`relatedProject` 填這個專案的 `id`。
5. 如果是實習或工作，視需要在 `experience[]` 加一筆，用 `link` 連到這個專案。
6. 執行「2.5 驗證」。

#### B. 更新既有專案的進度

- **新結果**：加進 `results[]`，在 `_src` 註明出處。如果最重要的數字改變了，`summary` 也要一起更新。
- **專案狀態改變**：例如計畫結案，就更新 `period` 和 `category`。
- **新照片或影片**：照 A 的第 2、4 步處理。
- **後續方向有進展**：把已完成的項目從 `next[]` 移到 `results[]`。
- 中英兩邊都要改，並更新根層級的 `updated`（格式 `YYYY-MM`）。

#### C. 論文狀態改變

- **被接受或刊出**：
  - 改 `status`，例如「已接受 / Accepted」或「已刊出 / Published」。
  - `statusKind` 改成 `ok`。
  - 刊出後在 `venue` 加上卷期、頁碼和 DOI。
  - 專案的 `results[]` 和 `summary` 裡提到論文狀態的句子也要一起改。
- **想改放全文 PDF**：先跟本人確認期刊的分享政策，再把檔案放在 `public/papers/`，並在 JSON 加連結。目前的決定是不放。
- **新論文**：加在 `publications[]` 最前面。

#### D. 更新一頁式 CV（每次改內容都要做）

CV 的 PDF 是事先產生、commit 進 repo 的，**CI 不會自動重產**。只要改了 `content/*.json`，就要：

1. 執行 `npm run cv`。這會先建置網站、輸出 `public/cv/Chao-Yuan_Chiang_CV_{en,zh}.pdf`，再建置一次。
   - 需要 Chromium。本機第一次使用請先跑 `npx playwright install chromium`；雲端環境可以設 `CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome`。
2. 指令失敗、顯示超過一頁時，就精簡內容。CV 用的欄位是：`research[].summary`、`brief`、`org`、`period`，`experience[].items`，`publications[].title`、`venue`、`status`，`awards[].title`、`org`。
3. 把 PDF 轉成圖片看過一遍（`pdftoppm -r 80 -png`），再連同 JSON 一起 commit。

#### E. 其他

- **新獎項**：`awards[]`，格式為 `title`、`org`、`year`、`note`。
- **學歷變動**：例如畢業或開始交換，改 `education[]` 的 `badge`、`detail`。
- **個人介紹**：`hero.summary`（兩三句）、`hero.role`、`hero.interests`（4 項以內）。
- **聯絡方式**：`contact`。版面上的圖示順序在 `index.astro` 的 `links` 陣列。

### 2.5 驗證（每次修改後都要做）

1. `npm run check:content`：檢查中英結構一致（`_` 開頭的註記欄位不比對）、CV 的 PDF 存在、圖片存在、每張圖都有 alt 和 thumbAlt、YouTube ID 格式、沒有 TODO 和成績類字眼、沒有對岸用語。
2. `npm run build`：必須成功。
3. 用 Playwright 截圖檢查（Chromium 在 `/opt/pw-browsers`；`npx astro preview --port 4321` 可以啟動預覽）：
   - 寬度：1440 和 390
   - 模式：淺色和深色
   - 語言：中英文都要看
   - 確認沒有水平捲動
   - 截圖拿給本人看
4. 有改內容就執行 `npm run cv`，確認兩份 CV 都只有一頁。

### 2.6 發佈流程

1. 在工作分支上 commit。Commit 訊息不要提到模型名稱。
2. 開 PR 到 `main`。
3. **先讓本人看截圖並同意後再合併**；修 bug 這類本人明確要求的修正，可以直接合併。
4. 合併後 GitHub Actions 會自動部署。要確認 `build` 和 `deploy` 兩個 job 都是 success。
5. 雲端工作環境可能連不到 `github.io`。真的打不開時，請本人用瀏覽器確認，不要假裝已經看過。

### 2.7 本人偏好的互動方式

- 一律用繁體中文回覆。
- 喜歡先看截圖，有選項時再討論。可以提供 2～3 個方向讓本人選，並附上建議。
- 版面偏好：
  - 左側個人欄，頭貼下方放圖示連結
  - 右側用卡片呈現內容
  - 標題用明體，內文用黑體，暖金色強調
  - **不要**黑框或工程圖風格
  - 字不要太大
- 內容偏好：只放研究相關的重點，不放成績、技能清單這類一般個人網頁不會放的東西。

### 2.8 已知待辦與想法

- [ ] 英文版 CSMMT 會議名稱目前寫成「29th Conference of the Chinese Society of Mechanism and Machine Theory (CSMMT 2026)」，這是暫譯。有官方英文名稱時要替換，可查 <https://www.csmmt2026.org/>。
- [ ] 翁愷貽老師的英文名「Kai-Yi Weng」，本人已同意先這樣寫，有正式拼法時再改。
- [ ] IEEE Access 論文審查結果出來後，照 2.4 C 更新。

---

## 3. 隱私與安全

- `.gitignore` 已經排除：證明文件、推薦信、`*.odt`、個人資料表、成績單、原始的 pptx 和 docx。
- 新增檔案前先跑 `git status`，確認沒有私人檔案被加進來。
- 刪掉的檔案仍然留在 git 歷史裡。萬一不小心 commit 了私人檔案，要先跟本人討論怎麼清除歷史，不能只是刪檔。
