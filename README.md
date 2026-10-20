# 財日記網頁版

React + TypeScript + Vite + Supabase，可與 iOS 版共用同一個 Supabase 專案。

## 啟動
1. 複製 `.env.example` 為 `.env.local`，填入與 iOS 相同的 Project URL 與 Publishable Key。
2. 在原本的 `schema.sql` 執行完成後，再於 Supabase SQL Editor 執行 `supabase/web-sync-patch.sql`。
3. Supabase Authentication 開啟 Email 登入。iOS 版也必須改用同一組 Email／Apple 帳號登入，匿名帳號不會自動跨瀏覽器共用。
4. 執行 `npm install`、`npm run dev`。正式版執行 `npm run build`，將 `dist` 部署到 Cloudflare Pages、Vercel 或 Netlify。

## 同步方式
所有資料皆寫入同一批 `accounts`、`transactions`、`todos`、`journal_entries` 資料表；RLS 以 `auth.uid()` 隔離使用者，Realtime 監聽資料變更，日記圖片放在私有 `journal-images` bucket。

## 目前功能
登入／註冊、財務總覽、收支新增、多幣別、帳戶餘額、待辦新增與完成、日記心情／文字／封面上傳、Monthly Dump 格狀彙總、RWD／PWA manifest。

## 注意
此版本是可執行 MVP。正式公開前，請補上交易編輯與刪除的餘額回沖、完整轉帳表單、母子分類管理、通知、股票行情、圖片簽名 URL、錯誤邊界、測試與隱私政策。
