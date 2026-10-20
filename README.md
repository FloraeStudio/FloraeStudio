# FloraeStudio 網站專案結構

```
FloraeStudio/
├── index.html / works.html / commission.html   # 頁面結構
├── css/
│   ├── base.css        # 全站共用（變數、header、footer、作品卡）
│   ├── home.css / works.css / commission.css    # 各頁專屬
│   └── lenis.css       # Lenis 官方必要樣式
├── js/
│   ├── main.js         # 平滑捲動、進場動畫、導覽列、作品集渲染
│   └── vendor/lenis.min.js   # Lenis 1.3.27（本機載入，不再依賴 unpkg）
├── data/
│   └── projects.json   # 作品集內容資料（分類 + 作品清單）
└── images/
    └── projects/       # 放作品實際截圖，檔名對應 projects.json 的 image 欄位；建議先轉成 WebP、寬度約 1400px（單張 150KB 內），載入與捲動都會更順
```

## 新增一件作品

編輯 `data/projects.json`，在 `projects` 陣列加入一筆：

```json
{
  "id": "my-project-01",
  "category": "brand",      // 對應 categories 裡的 id：brand / ecom / landing
  "title": "作品標題",
  "description": "一兩句作品簡介。",
  "image": "images/projects/my-project-01.jpg",   // 沒有截圖可留空字串 ""
  "url": "https://example.com"                     // 沒有連結可留空字串 ""
}
```

把截圖放進 `images/projects/`，路徑對上就會自動顯示；沒有截圖時會顯示標本誌風格的佔位圖示。
某個分類完全沒有作品時，該分類會自動顯示「尚在栽培中」的空狀態卡片，不用手動處理。

## 新增 / 調整分類

編輯 `data/projects.json` 裡的 `categories` 陣列即可，篩選 chips 與空狀態卡片會自動同步，不用改 HTML/CSS/JS。

## 本機預覽注意事項

`js/main.js` 用 `fetch()` 讀取 `data/projects.json`，瀏覽器基於安全限制，**直接雙擊開啟 index.html（file:// 協定）會讀取失敗**。
本機測試建議：
- VS Code 安裝 **Live Server** 擴充套件，右鍵 index.html → "Open with Live Server"
- 或在專案資料夾執行 `python -m http.server`，瀏覽器開 `http://localhost:8000`

部署到 GitHub Pages 後（https:// 協定）不會有這個問題。
