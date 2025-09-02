# MoClo Designer

一個專為 MoClo (模組化克隆) 標準設計的綜合性 Golden Gate 克隆設計工具。

## 🧬 主要功能

### 核心功能
- **質體資料庫**：基於 SQLite 的質體儲存，包含完整的元數據
- **專業向量編輯器**：整合 TeselaGen OVE，提供企業級序列編輯功能
- **視覺化工具**：環形和線性質體圖，互動式序列地圖
- **資料夾管理系統**：拖放式質體組織，支援自定義分類
- **虛擬 All Plasmid 資料夾**：統一檢視所有已匯入的質體
- **T2S 酶位點檢測**：自動檢測 BsaI, BbsI, BsmBI, 和 Esp3I 位點
- **突出端分析**：計算和驗證 Golden Gate 組裝的 4-bp 突出端
- **插入片段提取**：識別並提取 T2S 位點間的插入區域
- **MoClo 相容性**：檢查質體是否符合 MoClo 標準

### 🧬 向量編輯器功能 (TeselaGen OVE)
- **環形視圖**：專業的環形質體地圖，清楚顯示特徵分佈
- **線性視圖**：詳細的線性序列圖，支援多層次註釋
- **序列編輯**：直接編輯 DNA 序列，即時驗證
- **特徵管理**：添加、編輯、刪除基因特徵
- **限制性分析**：全面的限制酶位點分析
- **ORF 檢測**：開放閱讀框架自動識別
- **格式支援**：GenBank, FASTA, SBOL 等格式導入/導出

### 分析工具
- 多酶掃描整個質體序列
- 突出端驗證（無重複、無回文、平衡 GC 含量）
- 插入區域識別與側翼突出端
- 部件類型分類（啟動子、CDS、終止子、載體等）

### 使用者介面
- 基於 Electron 的現代化桌面應用程式
- 具備搜索功能的側邊欄質體瀏覽器
- 詳細的質體檢視器，顯示序列統計資訊
- 按酶分組的 T2S 位點視覺化
- 帶有序列預覽的插入片段資訊
- **拖放功能**：質體可在資料夾間拖放移動
- **批量操作**：支援多選質體批量管理

## 📁 資料夾管理系統

### 預設資料夾
- **All Plasmid** (虛擬)：顯示所有匯入的質體
- **未分類**：新匯入質體的預設位置
- **載體**：載體質體專用資料夾
- **元件**：生物元件存放區
- **組裝體**：組裝完成的構建體

### 功能特色
- ✅ 支援自定義資料夾創建、編輯和刪除
- ✅ 拖放式質體移動，直觀易用
- ✅ 除了「未分類」外，所有預設資料夾都可刪除
- ✅ 資料夾顯示/隱藏功能
- ✅ 即時質體計數顯示

## 🚀 安裝與使用

### 開發環境
```bash
git clone https://github.com/alextu870719/moclo-designer.git
cd moclo-designer
npm install
npm run dev
```

### 生產版本建構
```bash
npm run build
npm run dist
```

### 可用腳本
- `npm run dev` - 啟動開發伺服器（含熱重載）
- `npm run build` - 建構生產版本
- `npm run build:watch` - 監視模式建構
- `npm run build:main` - 建構主進程
- `npm run build:renderer` - 建構渲染進程

## 📄 檔案格式支援
- GenBank (.gb, .gbk, .genbank)
- FASTA (.fasta, .fa, .seq)
- **批量匯入**：支援資料夾批量匯入

## 🔬 MoClo 標準支援
- Level 0, 1, 和 2 組裝
- 標準突出端驗證
- 部件類型分類
- 組裝相容性檢查

## 🏗️ 技術架構
- **前端**: React + TypeScript + 現代 CSS
- **後端**: Electron 主進程
- **資料庫**: SQLite3 完整架構，儲存質體、特徵、位點和插入片段
- **分析**: 自定義 T2S 分析器，支援所有主要 Golden Gate 酶

## 📊 資料庫架構
- `plasmids`: 核心質體資訊
- `folders`: 資料夾資訊
- `plasmid_features`: GenBank 樣式特徵
- `t2s_sites`: 所有 Type IIS 限制位點
- `inserts`: 已識別的插入區域與突出端

## 🎯 專案結構

```
src/
├── main/                   # Electron 主進程
│   ├── main.ts            # 應用程式入口
│   └── services/          # 後端服務
│       ├── database.ts    # SQLite 資料庫管理
│       ├── goldenGateDesigner.ts  # Golden Gate 設計邏輯
│       └── t2sAnalyzer.ts # T2S 位點分析
├── renderer/              # React 前端
│   ├── App.tsx           # 主應用程式組件
│   ├── components/       # UI 組件
│   │   ├── FolderSidebar.tsx     # 資料夾側邊欄
│   │   ├── PlasmidList.tsx       # 質體列表
│   │   ├── PlasmidDetails.tsx    # 質體詳細信息
│   │   ├── VectorEditor.tsx      # TeselaGen OVE 向量編輯器
│   │   └── GoldenGateDesigner.tsx # Golden Gate 設計器
│   └── styles.css        # 全局樣式
├── preload/              # Preload 腳本
│   └── preload.ts        # IPC 通信橋接
└── types/                # TypeScript 類型定義
    ├── index.ts          # 主要類型
    └── api.ts            # API 類型
```

## 🛠️ 技術架構

### 前端技術棧
- **React 18** + **TypeScript**：現代化的組件開發
- **TeselaGen OVE**：企業級向量編輯器核心
- **Redux**：狀態管理 (OVE 必需)
- **Blueprint.js**：專業的 UI 組件庫
- **Electron**：跨平台桌面應用框架

### 後端技術
- **Node.js**：運行環境
- **SQLite3**：輕量級關係型資料庫
- **生物信息學庫**：序列分析和格式轉換

### 關鍵依賴
```json
{
  "@teselagen/ove": "^0.7.36",           // 向量編輯器核心
  "@teselagen/bio-parsers": "^0.4.28",   // 生物格式解析
  "@teselagen/sequence-utils": "^0.3.32", // 序列處理工具
  "@blueprintjs/core": "^3.54.0",        // UI 組件
  "redux": "^4.2.1",                     // 狀態管理
  "react-redux": "^8.1.3"                // React-Redux 綁定
}
```

## 🔧 新功能亮點 (v1.0.0)

### 資料夾管理
- 完整的拖放式資料夾系統
- 虛擬 "All Plasmid" 資料夾統一檢視
- 可自定義的資料夾分類
- 即時質體計數和搜尋

### 使用者體驗
- 流暢的動畫過渡效果
- 響應式設計適應不同螢幕
- 資料夾顯示/隱藏切換
- 重複質體智能處理

### 效能優化
- SQLite 資料庫優化
- 前端狀態管理改進
- 記憶體使用優化

## 🤝 貢獻指南

1. Fork 這個專案
2. 創建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

## 📝 更新日誌

### v1.0.0 (2025-09-02)
- ✨ 全新資料夾管理系統
- ✨ 拖放式質體組織功能
- ✨ 虛擬 "All Plasmid" 資料夾
- ✨ 批量匯入功能
- ✨ 改進的使用者介面設計
- 🐛 修復重複質體處理問題
- 🚀 效能優化

## 📄 授權

這個專案使用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 🎯 目標用戶

專為需要強大且符合標準的 Golden Gate 設計工具的分子生物學家而建。

---

**GitHub Repository**: https://github.com/alextu870719/moclo-designer
