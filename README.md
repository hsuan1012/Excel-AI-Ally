# Excel AI Ally：數位遊戲化學習系統

這是一個基於 Next.js (TypeScript) 開發的互動式 Excel 學習平台。本系統結合了「數位遊戲化學習 (DGBL)」與「AI 鷹架理論」，旨在透過遊戲化的闖關機制與生成式 AI 助教，降低初學者的認知負荷，幫助學生高效掌握 Excel 數據分析技巧。

## 技術

- **前端框架：** Next.js, React
- **程式語言：** TypeScript
- **樣式與 UI：** Tailwind CSS, Lucide Icons
- **資料庫：** Supabase
- **AI 串接：** Google Gemini API
- **部署平台：** Vercel

## 核心功能特點

- **遊戲化學習體驗 (DGBL)**
  - 關卡式解鎖與學習進度追蹤
  - 等級提升與獎勵系統
  - 每日學習目標

- **生成式 AI 助教支援 (軟性鷹架)**
  - 整合大語言模型，提供即時、情境化的問答
  - 智能學習診斷與個人化提示引導
  - 隨時可用的全域懸浮 AI 諮詢按鈕

- **系統化課程模組**
  - 基礎 Excel 魔法觀念 (工具欄, 工作表區域, 工作表標籤區)
  - 初階函數修行 (SUM, COUNT, AVERAGE)
  - 判斷之術 IF (單條件 IF, 多條件 IF)
  - 統計召喚法陣 (樞紐分析表)
  - 資料迷宮的魔法指南 (VLOOKUP)

## 系統畫面

| 遊戲化學習地圖 | AI 助教即時互動 |
| :---: | :---: |
| ![學習地圖](https://github.com/user-attachments/assets/96986f89-572e-44a2-81b1-6d9da2ace757) | ![AI 助教](https://github.com/user-attachments/assets/cf378777-9bca-4294-bef7-20c692a07dd5) |
| **關卡式解鎖與進度追蹤，提升學習動機** | **全域懸浮 AI 助教，隨時提供解題提示** |

| 課程闖關介面 | 學習成效儀表板 |
| :---: | :---: |
| ![課程介面](https://github.com/user-attachments/assets/47b55cf8-bc07-45aa-9eb8-6f258e5cdda5) | ![後台儀表板](https://github.com/user-attachments/assets/f16dda27-23b7-4b84-9bec-311b59a1378d) |
| **結合情境的實作練習與立即回饋** | **視覺化呈現學生的學習進度與數據** |

## 檔案結構

```text
src/
├── app/            # Next.js App Router 應用程式路由
│   ├── admin/      # 管理員後台相關頁面
│   ├── lessons/    # 課程動態路由
│   ├── layout.tsx  # 全局布局組件與樣式 
│   └── page.tsx    # 系統首頁組件
├── components/     # 專案核心與共用 UI 組件
│   ├── ui/         # 基礎 UI 元件庫
│   └── ...         # 包含 AIChatAssistant, ExcelMascot 等自訂互動組件
├── context/        # React 全域狀態管理 
├── data/           # 課程文本、數據結構與模擬資料
├── lib/            # 核心工具與服務整合 (Gemini AI 串接、Supabase 設定、進度演算邏輯)
└── types/          # TypeScript 嚴格型別定義 
```

## 本地端運行指南

### 1. 複製專案
```bash
git clone https://github.com/hsuan1012/excel-ai-ally.git
cd excel-ai-ally
```

### 2. 安裝依賴套件
```bash
npm install
```

### 3. 環境變數設定
請在專案根目錄建立一個 `.env.local` 檔案，並填入以下資訊：

```env
# Google Gemini AI API Key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase 資料庫連線設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 啟動開發伺服器
```bash
npm run dev
```
開啟瀏覽器並前往 [http://localhost:3000](http://localhost:3000) 即可查看專案。
