# BillFlow — GST Billing & Accounting SaaS

> Modern, India-first GST billing platform for SMEs. Phase 1 + Phase 2 complete.

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env          # fill in MONGO_URI + JWT secrets
npm run seed:hsn               # seed 60+ HSN/SAC codes
npm run dev                    # API starts on :5000
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev                    # UI starts on :5173
```

> **Custom port?** Edit `frontend/vite.config.js` proxy target to match your backend port.

---

## 🗂️ Project Structure

```
billflow/
├── backend/
│   ├── config/db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Business.js        # company profile + invoice series
│   │   ├── Party.js           # customers & suppliers
│   │   ├── HsnMaster.js       # HSN/SAC code master
│   │   └── Invoice.js         # full invoice schema ✦ Phase 2
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── businessController.js
│   │   ├── partyController.js
│   │   ├── hsnController.js
│   │   ├── dashboardController.js
│   │   ├── invoiceController.js  ✦ Phase 2
│   │   └── pdfController.js      ✦ Phase 2
│   ├── routes/
│   │   ├── auth.js
│   │   ├── business.js
│   │   ├── party.js
│   │   ├── hsn.js
│   │   ├── dashboard.js
│   │   └── invoices.js           ✦ Phase 2
│   ├── templates/
│   │   ├── traditionalTemplate.js  ✦ Phase 2
│   │   └── modernTemplate.js       ✦ Phase 2
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── gstCalc.js            ✦ Phase 2
│   └── seeds/hsnSeed.js
│
└── frontend/src/
    ├── api/
    │   ├── client.js             # axios + auto token refresh
    │   └── index.js              # all API modules
    ├── store/slices/
    │   ├── authSlice.js
    │   ├── businessSlice.js
    │   ├── partySlice.js
    │   ├── uiSlice.js
    │   └── invoiceSlice.js       ✦ Phase 2
    ├── hooks/
    │   └── useGstCalc.js         ✦ Phase 2 (client-side GST calc)
    ├── components/
    │   ├── layout/               # Sidebar, Topbar, AppLayout
    │   ├── ui/                   # Modal, Input, Badge, StatCard...
    │   └── invoice/
    │       └── InvoicePreview.jsx ✦ Phase 2 (iframe live preview)
    └── pages/
        ├── auth/                 # Login, Register
        ├── dashboard/            # Dashboard with stats
        ├── business/             # 4-tab business setup
        ├── parties/              # Party list + modal
        ├── hsn/                  # HSN/SAC search
        └── invoices/
            ├── InvoiceListPage.jsx   ✦ Phase 2
            └── InvoiceCreatePage.jsx ✦ Phase 2 (split-panel)
```

---

## 🔑 .env Variables

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/billflow
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## 📡 API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Current user |

### Business
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/business` | List / Create |
| GET/PUT  | `/api/business/:id` | Get / Update |
| GET | `/api/business/:id/next-invoice-number?type=sale` | Preview next no. |

### Parties `[x-business-id header required]`
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/parties` | List (search, filter, paginate) / Create |
| GET/PUT/DELETE | `/api/parties/:id` | Get / Update / Soft delete |
| GET | `/api/parties/summary` | Count by type |

### HSN/SAC
| Method | Route | Description |
|---|---|---|
| GET | `/api/hsn?q=9988` | Search |
| GET | `/api/hsn/rates` | All GST rates |
| GET | `/api/hsn/:code` | Get by code |

### Invoices `[x-business-id header required]`
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/invoices` | List / Create |
| GET/PUT/DELETE | `/api/invoices/:id` | Get / Update / Void |
| PATCH | `/api/invoices/:id/status` | Mark paid/sent/cancelled |
| POST | `/api/invoices/calculate` | Live GST calc (no DB write) |
| GET  | `/api/invoices/pdf/:id` | Download PDF |
| POST | `/api/invoices/preview-html` | HTML preview for iframe |

---

## 🧾 GST Logic

| Scenario | Tax Applied |
|---|---|
| Seller state = Buyer state | SGST 50% + CGST 50% |
| Seller state ≠ Buyer state | IGST 100% |
| No GSTIN on buyer (B2C) | SGST + CGST (intra default) |

Auto-detected from GSTIN prefix (2-digit state code).

---

## 📄 PDF Themes

| Theme | Description |
|---|---|
| Traditional | Classic Indian format — black borders, tabular layout, matches Hardik Embroidery style |
| Modern | Clean card-based layout — color-coded tax pills, bank QR, premium feel |

PDF via Puppeteer (optional). Without it, streams HTML. Install:
```bash
cd backend && npm install puppeteer
```

---

## 📅 Roadmap

| Phase | Scope | Status |
|---|---|---|
| **1** | Auth, Business, Parties, HSN | ✅ Done |
| **2** | Invoice Engine + PDF + Live Preview | ✅ Done |
| **3** | Credit Note, Debit Note, Proforma finalize | 🔜 |
| **4** | Party Ledger, Payment Recording | 🔜 |
| **5** | Reports, GSTR-1 Export, Excel | 🔜 |

---

## 🎨 Design System

- **Font Display**: Syne
- **Font Body**: Plus Jakarta Sans
- **Font Mono**: JetBrains Mono
- **Accent**: Amber #F59E0B
- **Background**: Deep slate #0B0D12
