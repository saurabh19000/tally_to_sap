# Tally Middleware — Data Check Before Sync

Connects to **TallyPrime on port 9000**, fetches all data into middleware, validates it, and shows you a full check report before you ever push anything to SAP.

---

## How It Works

```
TallyPrime (port 9000)
       │  XML/HTTP
       ▼
 Backend (port 4000)   ← fetches all data, validates
       │
       ▼
 Frontend (port 5173)  ← shows check report + sample data
```

The key flow is:
1. **Run Middleware Check** — fetches Companies, Ledgers, Vouchers, Stock Items from Tally
2. **Inspect Results** — see counts, breakdowns, sample rows, any errors
3. **Only sync if `readyToSync: true`** — no partial/broken data pushed to SAP

---

## Setup

### 1. Enable TallyPrime HTTP Server (Port 9000)

In TallyPrime:
- Gateway of Tally → **F12: Configure**
- Go to **Advanced Configuration**
- Enable **Tally.NET Features** → **XML/HTTP Server**
- Set port to **9000**
- Press **Ctrl+Alt+H** to activate (or restart Tally)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set TALLY_COMPANY_NAME to your company name
npm install
npm run dev
```

Server starts on **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI opens on **http://localhost:5173**

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Backend health check |
| GET | `/api/tally/ping` | Test Tally connection (port 9000) |
| GET | `/api/tally/companies` | List all companies |
| GET | `/api/tally/ledgers?company=XYZ` | Fetch all ledgers |
| GET | `/api/tally/vouchers?company=XYZ&from=2024-04-01&to=2025-03-31` | Fetch vouchers |
| GET | `/api/tally/stock?company=XYZ` | Fetch stock items |
| POST | `/api/middleware/check` | **Full data check** (main endpoint) |
| GET | `/api/logs` | Server logs |

### POST `/api/middleware/check`

```json
{
  "company": "ABC Private Limited",
  "fromDate": "2024-04-01",
  "toDate":   "2025-03-31"
}
```

**Response:**
```json
{
  "ok": true,
  "report": {
    "status": "ok",
    "readyToSync": true,
    "summary": { "companies": 1, "ledgers": 420, "vouchers": 1850, "stockItems": 310 },
    "checks": {
      "ping":       { "status": "ok", "latencyMs": 12 },
      "companies":  { "status": "ok", "count": 1, "data": [...] },
      "ledgers":    { "status": "ok", "count": 420, "partyCount": 85, "withGstin": 62, "sample": [...] },
      "vouchers":   { "status": "ok", "count": 1850, "byType": { "Sales": 620, "Receipt": 410 }, "totalAmount": 48500000 },
      "stockItems": { "status": "ok", "count": 310, "sample": [...] }
    },
    "errors": []
  }
}
```

---

## Project Structure

```
tally-middleware/
├── backend/
│   ├── src/
│   │   ├── tally/tallyClient.js   ← ALL Tally XML fetching (port 9000)
│   │   ├── routes/index.js        ← Express routes
│   │   ├── config/config.js
│   │   ├── logs/logger.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/tallyAPI.js        ← API calls to backend
    │   ├── components/
    │   │   ├── StatusDot.jsx
    │   │   ├── CheckRow.jsx       ← Per-check result row
    │   │   └── DataTable.jsx      ← Expandable sample data table
    │   ├── hooks/
    │   │   ├── useConnection.js   ← Backend + Tally connectivity
    │   │   └── useLogs.js
    │   ├── pages/
    │   │   ├── MiddlewareCheck.jsx  ← Main check page
    │   │   ├── QuickFetch.jsx       ← Fetch individual data types
    │   │   └── LiveLogs.jsx
    │   └── App.jsx
    └── package.json
```

---

## .env Reference

```env
PORT=4000
TALLY_URL=http://localhost:9000
TALLY_COMPANY_NAME=ABC Private Limited
```
