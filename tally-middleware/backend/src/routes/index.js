// import { Router } from "express";
// import {
//   pingTally,
//   fetchTallyCompanies,
//   fetchTallyLedgers,
//   fetchTallyVouchers,
//   fetchTallyStockItems,
//   runMiddlewareCheck,
// } from "../tally/tallyClient.js";
// import {
//   checkBtpConnection,
//   getBtpToken,
//   pushMiddlewareCheckToBtp,
//   pushLedgersToBtp,
//   pushVouchersToBtp,
//   pushStockItemsToBtp,
// } from "../sap/btpClient.js";
// import {
//   saveSyncRun,
//   getSyncRuns,
//   getDbStats,
// } from "../db/database.js";
// import { logger } from "../logs/logger.js";
// import { config } from "../config/config.js";

// const router = Router();

// // ── Health ────────────────────────────────────────────────────────────────────
// router.get("/health", (_req, res) => {
//   const effectiveUrl = config.btp.runtimeUrl || config.btp.ngrokUrl;
//   res.json({
//     ok: true,
//     ts: new Date().toISOString(),
//     tallyUrl: config.tally.url,
//     btpConfigured: !!(config.btp.clientId && config.btp.tokenUrl),
//     btpRuntimeUrl: effectiveUrl || "(not set)",
//     pushTarget: effectiveUrl
//       ? `${effectiveUrl.replace(/\/+$/, "")}/http/tally-trigger`
//       : "(not set)",
//     dbMode: "logs-only — Tally data is NOT stored in DB, pushed directly to SAP BTP",
//   });
// });

// // ── BTP URL debug ─────────────────────────────────────────────────────────────
// router.get("/btp/url", (_req, res) => {
//   const effectiveUrl = config.btp.runtimeUrl || config.btp.ngrokUrl;
//   res.json({
//     runtimeUrl:   config.btp.runtimeUrl || "(not set)",
//     ngrokUrl:     config.btp.ngrokUrl   || "(not set)",
//     effectiveUrl: effectiveUrl          || "(not set)",
//     pushTarget:   effectiveUrl
//       ? `${effectiveUrl.replace(/\/+$/, "")}/http/tally-trigger`
//       : "(not set)",
//   });
// });

// // ── Tally ping ────────────────────────────────────────────────────────────────
// router.get("/tally/ping", async (_req, res) => {
//   try { res.json(await pingTally()); }
//   catch (err) { res.status(500).json({ connected: false, error: err.message }); }
// });

// // ── BTP ping ──────────────────────────────────────────────────────────────────
// router.get("/btp/ping", async (_req, res) => {
//   try { res.json(await checkBtpConnection()); }
//   catch (err) { res.status(500).json({ connected: false, error: err.message }); }
// });

// // ── BTP token preview ─────────────────────────────────────────────────────────
// router.get("/btp/token", async (_req, res) => {
//   try {
//     const token = await getBtpToken(true);
//     res.json({ ok: true, tokenPreview: token.slice(0, 30) + "...", length: token.length });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── Tally companies ───────────────────────────────────────────────────────────
// router.get("/tally/companies", async (_req, res) => {
//   try {
//     const data = await fetchTallyCompanies();
//     res.json({ ok: true, count: data.length, data });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── Tally ledgers (preview only — NOT saved to DB) ────────────────────────────
// router.get("/tally/ledgers", async (req, res) => {
//   const company = req.query.company || config.tally.companyName;
//   if (!company) return res.status(400).json({ ok: false, error: "company required" });
//   try {
//     const data = await fetchTallyLedgers(company);
//     res.json({ ok: true, count: data.length, note: "Preview only — data not saved to DB", data });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── Tally vouchers (preview only — NOT saved to DB) ───────────────────────────
// router.get("/tally/vouchers", async (req, res) => {
//   const company = req.query.company || config.tally.companyName;
//   if (!company) return res.status(400).json({ ok: false, error: "company required" });
//   try {
//     const data = await fetchTallyVouchers(
//       company,
//       req.query.from || null,
//       req.query.to   || null
//     );
//     res.json({ ok: true, count: data.length, note: "Preview only — data not saved to DB", data });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── Tally stock (preview only — NOT saved to DB) ──────────────────────────────
// router.get("/tally/stock", async (req, res) => {
//   const company = req.query.company || config.tally.companyName;
//   if (!company) return res.status(400).json({ ok: false, error: "company required" });
//   try {
//     const data = await fetchTallyStockItems(company);
//     res.json({ ok: true, count: data.length, note: "Preview only — data not saved to DB", data });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── Middleware check ──────────────────────────────────────────────────────────
// // POST /api/middleware/check
// // Body: { company, fromDate, toDate, pushToBtp }
// router.post("/middleware/check", async (req, res) => {
//   const body       = req.body || {};
//   const company    = body.company   || config.tally.companyName || "";
//   const fromDate   = body.fromDate  || null;
//   const toDate     = body.toDate    || null;
//   const pushToBtp  = body.pushToBtp || false;

//   if (!company.trim()) {
//     return res.status(400).json({ ok: false, error: "company name is required" });
//   }

//   logger.info(`Middleware check: ${company}`, { fromDate, toDate, pushToBtp });

//   try {
//     const report = await runMiddlewareCheck(company, { fromDate, toDate });

//     let btpResult = null;
//     if (pushToBtp && config.btp.clientId) {
//       try {
//         btpResult = await pushMiddlewareCheckToBtp(report);
//         logger.success("Check report pushed to SAP BTP");
//       } catch (btpErr) {
//         logger.warn("BTP push of check report failed", { error: btpErr.message });
//         btpResult = { error: btpErr.message };
//       }
//     }

//     return res.json({ ok: true, report, btpResult });
//   } catch (err) {
//     logger.error("Middleware check error", { error: err.message });
//     return res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── Push Ledgers → BTP only (no DB save) ─────────────────────────────────────
// // Flow: Tally (port 9000) → in-memory → SAP BTP → log entry saved to DB
// router.post("/btp/push/ledgers", async (req, res) => {
//   const body        = req.body || {};
//   const companyName = body.company || config.tally.companyName;
//   if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

//   const startedAt = new Date().toISOString();
//   const errors    = [];
//   let   btpResult = null;
//   let   ledgers   = [];

//   // Step 1: Fetch from Tally
//   try {
//     logger.info(`Fetching ledgers for: ${companyName}`);
//     ledgers = await fetchTallyLedgers(companyName);
//     logger.success(`Fetched ${ledgers.length} ledgers from Tally (not saved to DB)`);
//   } catch (err) {
//     logger.error("Tally fetch failed — ledgers", { error: err.message });
//     return res.status(500).json({ ok: false, error: `Tally: ${err.message}` });
//   }

//   // Step 2: Push directly to SAP BTP (data is in-memory, not stored in DB)
//   try {
//     btpResult = await pushLedgersToBtp(ledgers, companyName);
//     logger.success(`Pushed ${ledgers.length} ledgers to SAP BTP`);
//   } catch (btpErr) {
//     logger.error("BTP push failed — ledgers", { error: btpErr.message });
//     errors.push(`BTP: ${btpErr.message}`);
//     btpResult = { error: btpErr.message };
//   }

//   // Step 3: Save only the sync log to DB (not the actual data)
//   try {
//     await saveSyncRun({
//       company: companyName, fromDate: null, toDate: null,
//       status: errors.length ? "fail" : "ok",
//       dataType: "ledgers",
//       recordCount: ledgers.length,
//       btpPushed: !btpResult?.error,
//       errors,
//       startedAt,
//     });
//   } catch (e) { logger.warn("saveSyncRun failed", { error: e.message }); }

//   return res.json({
//     ok: errors.length === 0,
//     count: ledgers.length,
//     savedToDb: false,
//     pushedToBtp: !btpResult?.error,
//     btpResult,
//     errors,
//   });
// });

// // ── Push Vouchers → BTP only (no DB save) ────────────────────────────────────
// router.post("/btp/push/vouchers", async (req, res) => {
//   const body        = req.body || {};
//   const companyName = body.company  || config.tally.companyName;
//   const fromDate    = body.fromDate || null;
//   const toDate      = body.toDate   || null;
//   if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

//   const startedAt = new Date().toISOString();
//   const errors    = [];
//   let   btpResult = null;
//   let   vouchers  = [];

//   // Step 1: Fetch from Tally
//   try {
//     logger.info(`Fetching vouchers for: ${companyName}`, { fromDate, toDate });
//     vouchers = await fetchTallyVouchers(companyName, fromDate, toDate);
//     logger.success(`Fetched ${vouchers.length} vouchers from Tally (not saved to DB)`);
//   } catch (err) {
//     logger.error("Tally fetch failed — vouchers", { error: err.message });
//     return res.status(500).json({ ok: false, error: `Tally: ${err.message}` });
//   }

//   // Step 2: Push directly to SAP BTP
//   try {
//     btpResult = await pushVouchersToBtp(vouchers, companyName);
//     logger.success(`Pushed ${vouchers.length} vouchers to SAP BTP`);
//   } catch (btpErr) {
//     logger.error("BTP push failed — vouchers", { error: btpErr.message });
//     errors.push(`BTP: ${btpErr.message}`);
//     btpResult = { error: btpErr.message };
//   }

//   // Step 3: Save only the sync log
//   try {
//     await saveSyncRun({
//       company: companyName, fromDate, toDate,
//       status: errors.length ? "fail" : "ok",
//       dataType: "vouchers",
//       recordCount: vouchers.length,
//       btpPushed: !btpResult?.error,
//       errors,
//       startedAt,
//     });
//   } catch (e) { logger.warn("saveSyncRun failed", { error: e.message }); }

//   return res.json({
//     ok: errors.length === 0,
//     count: vouchers.length,
//     savedToDb: false,
//     pushedToBtp: !btpResult?.error,
//     btpResult,
//     errors,
//   });
// });

// // ── Push Stock → BTP only (no DB save) ───────────────────────────────────────
// router.post("/btp/push/stock", async (req, res) => {
//   const body        = req.body || {};
//   const companyName = body.company || config.tally.companyName;
//   if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

//   const startedAt = new Date().toISOString();
//   const errors    = [];
//   let   btpResult = null;
//   let   items     = [];

//   // Step 1: Fetch from Tally
//   try {
//     logger.info(`Fetching stock for: ${companyName}`);
//     items = await fetchTallyStockItems(companyName);
//     logger.success(`Fetched ${items.length} stock items from Tally (not saved to DB)`);
//   } catch (err) {
//     logger.error("Tally fetch failed — stock", { error: err.message });
//     return res.status(500).json({ ok: false, error: `Tally: ${err.message}` });
//   }

//   // Step 2: Push directly to SAP BTP
//   try {
//     btpResult = await pushStockItemsToBtp(items, companyName);
//     logger.success(`Pushed ${items.length} stock items to SAP BTP`);
//   } catch (btpErr) {
//     logger.error("BTP push failed — stock", { error: btpErr.message });
//     errors.push(`BTP: ${btpErr.message}`);
//     btpResult = { error: btpErr.message };
//   }

//   // Step 3: Save only the sync log
//   try {
//     await saveSyncRun({
//       company: companyName, fromDate: null, toDate: null,
//       status: errors.length ? "fail" : "ok",
//       dataType: "stockItems",
//       recordCount: items.length,
//       btpPushed: !btpResult?.error,
//       errors,
//       startedAt,
//     });
//   } catch (e) { logger.warn("saveSyncRun failed", { error: e.message }); }

//   return res.json({
//     ok: errors.length === 0,
//     count: items.length,
//     savedToDb: false,
//     pushedToBtp: !btpResult?.error,
//     btpResult,
//     errors,
//   });
// });

// // ── Push All → BTP only (no DB save) ─────────────────────────────────────────
// router.post("/btp/push/all", async (req, res) => {
//   const body        = req.body || {};
//   const companyName = body.company  || config.tally.companyName;
//   const fromDate    = body.fromDate || null;
//   const toDate      = body.toDate   || null;
//   if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

//   const startedAt = new Date().toISOString();
//   const results   = {
//     company: companyName,
//     ledgers: null,
//     vouchers: null,
//     stockItems: null,
//     errors: [],
//     savedToDb: false,
//     note: "Tally data fetched in-memory and pushed directly to SAP BTP — not stored in DB",
//   };

//   // Ledgers
//   try {
//     const d = await fetchTallyLedgers(companyName);
//     await pushLedgersToBtp(d, companyName);
//     results.ledgers = { count: d.length, pushedToBtp: true };
//     logger.success(`All — Ledgers: ${d.length}`);
//   } catch (e) {
//     logger.error("All — Ledgers failed", { error: e.message });
//     results.errors.push(`Ledgers: ${e.message}`);
//     results.ledgers = { error: e.message, pushedToBtp: false };
//   }

//   // Vouchers
//   try {
//     const d = await fetchTallyVouchers(companyName, fromDate, toDate);
//     await pushVouchersToBtp(d, companyName);
//     results.vouchers = { count: d.length, pushedToBtp: true };
//     logger.success(`All — Vouchers: ${d.length}`);
//   } catch (e) {
//     logger.error("All — Vouchers failed", { error: e.message });
//     results.errors.push(`Vouchers: ${e.message}`);
//     results.vouchers = { error: e.message, pushedToBtp: false };
//   }

//   // Stock Items
//   try {
//     const d = await fetchTallyStockItems(companyName);
//     await pushStockItemsToBtp(d, companyName);
//     results.stockItems = { count: d.length, pushedToBtp: true };
//     logger.success(`All — Stock: ${d.length}`);
//   } catch (e) {
//     logger.error("All — Stock failed", { error: e.message });
//     results.errors.push(`Stock: ${e.message}`);
//     results.stockItems = { error: e.message, pushedToBtp: false };
//   }

//   // Log a single combined sync_run entry
//   try {
//     const totalRecords =
//       (results.ledgers?.count   || 0) +
//       (results.vouchers?.count  || 0) +
//       (results.stockItems?.count || 0);

//     await saveSyncRun({
//       company: companyName, fromDate, toDate,
//       status: results.errors.length === 0 ? "ok"
//             : results.errors.length === 3 ? "fail"
//             : "partial",
//       dataType: "all",
//       recordCount: totalRecords,
//       btpPushed: results.errors.length === 0,
//       errors: results.errors,
//       startedAt,
//     });
//   } catch (e) { logger.warn("saveSyncRun failed", { error: e.message }); }

//   return res.json({ ok: results.errors.length === 0, results });
// });

// // ── Sync run logs ─────────────────────────────────────────────────────────────
// router.get("/sync/logs", async (req, res) => {
//   try {
//     const limit = Math.min(parseInt(req.query.limit) || 50, 200);
//     const rows  = await getSyncRuns(limit);
//     res.json({ ok: true, count: rows.length, logs: rows });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── DB stats ──────────────────────────────────────────────────────────────────
// router.get("/db/stats", async (_req, res) => {
//   try {
//     const { getDbStats } = await import("../db/database.js");
//     res.json({ ok: true, ...(await getDbStats()) });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // ── In-memory logs ────────────────────────────────────────────────────────────
// router.get("/logs", (req, res) => {
//   const limit = Math.min(parseInt(req.query.limit) || 100, 500);
//   res.json({ logs: logger.getLogs(limit) });
// });

// export default router;



import { Router } from "express";
import {
  pingTally,
  fetchTallyCompanies,
  fetchTallyLedgers,
  fetchTallyVouchers,
  fetchTallyStockItems,
  runMiddlewareCheck,
} from "../tally/tallyClient.js";
import {
  checkBtpConnection,
  getBtpToken,
  istTimestamp,
  pushMiddlewareCheckToBtp,
  pushLedgersToBtp,
  pushVouchersToBtp,
  pushStockItemsToBtp,
  pushAllToBtp,
  pushToDashboard,
  clearTokenCache,
} from "../sap/btpClient.js";
import { logger } from "../logs/logger.js";
import { config } from "../config/config.js";

const router = Router();

// ── Latest sync state (in-memory) ─────────────────────────────────────────────
// This ensures /api/http/read-tally always returns the freshest data immediately
let latestSync = {
  ok: true,
  company: config.tally.companyName || "(none)",
  dataType: "none",
  totalRecords: 0,
  timestamp: istTimestamp(),
  summary: {},
  data: [],
  syncId: null
};

// Helper to update latestSync state
function updateLatestSync(payload) {
  latestSync = {
    ok:           true,
    company:      payload.company,
    dataType:     payload.dataType,
    totalRecords: payload.totalRecords,
    timestamp:    payload.timestamp || istTimestamp(),
    summary:      payload.summary      || {},
    data:         (payload.data        || []).slice(0, 100), // Preview top 100 for dashboard
    syncId:       payload.syncId       || null
  };
}

// ── Health ────────────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  const effectiveUrl = config.btp.runtimeUrl || config.btp.ngrokUrl;
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    tallyUrl: config.tally.url,
    btpConfigured: !!(config.btp.clientId && config.btp.tokenUrl),
    btpRuntimeUrl: effectiveUrl || "(not set)",
    pushTarget: effectiveUrl
      ? `${effectiveUrl.replace(/\/+$/, "")}/http/tally-write`
      : "(not set)",
  });
});

// ── Read latest sync data for SAP Fiori dashboard ────────────────────────────
router.get("/http/read-tally", (_req, res) => {
  res.json(latestSync);
});

// ── BTP URL debug ─────────────────────────────────────────────────────────────
router.get("/btp/url", (_req, res) => {
  const effectiveUrl = config.btp.runtimeUrl || config.btp.ngrokUrl;
  res.json({
    runtimeUrl:   config.btp.runtimeUrl || "(not set)",
    ngrokUrl:     config.btp.ngrokUrl   || "(not set)",
    effectiveUrl: effectiveUrl          || "(not set)",
    pushTarget:   effectiveUrl
      ? `${effectiveUrl.replace(/\/+$/, "")}/http/tally-write`
      : "(not set)",
  });
});

// ── Tally ping ────────────────────────────────────────────────────────────────
router.get("/tally/ping", async (_req, res) => {
  try { res.json(await pingTally()); }
  catch (err) { res.status(500).json({ connected: false, error: err.message }); }
});

// ── BTP ping ──────────────────────────────────────────────────────────────────
router.get("/btp/ping", async (_req, res) => {
  try { res.json(await checkBtpConnection()); }
  catch (err) { res.status(500).json({ connected: false, error: err.message }); }
});

// ── BTP token preview ─────────────────────────────────────────────────────────
router.get("/btp/token", async (_req, res) => {
  try {
    const token = await getBtpToken(true);
    res.json({ ok: true, tokenPreview: token.slice(0, 30) + "...", length: token.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Tally companies ───────────────────────────────────────────────────────────
router.get("/tally/companies", async (_req, res) => {
  try {
    const data = await fetchTallyCompanies();
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Tally ledgers ─────────────────────────────────────────────────────────────
router.get("/tally/ledgers", async (req, res) => {
  const company = req.query.company || config.tally.companyName;
  if (!company) return res.status(400).json({ ok: false, error: "company required" });
  try {
    const data = await fetchTallyLedgers(company);
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Tally vouchers ────────────────────────────────────────────────────────────
router.get("/tally/vouchers", async (req, res) => {
  const company = req.query.company || config.tally.companyName;
  if (!company) return res.status(400).json({ ok: false, error: "company required" });
  try {
    const data = await fetchTallyVouchers(
      company,
      req.query.from || null,
      req.query.to   || null
    );
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Tally stock ───────────────────────────────────────────────────────────────
router.get("/tally/stock", async (req, res) => {
  const company = req.query.company || config.tally.companyName;
  if (!company) return res.status(400).json({ ok: false, error: "company required" });
  try {
    const data = await fetchTallyStockItems(company);
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Middleware check ──────────────────────────────────────────────────────────
// POST /api/middleware/check
// Body: { company, fromDate, toDate, pushToBtp }
router.post("/middleware/check", async (req, res) => {
  const body       = req.body || {};
  const company    = body.company   || config.tally.companyName || "";
  const fromDate   = body.fromDate  || null;
  const toDate     = body.toDate    || null;
  const pushToBtp  = body.pushToBtp || false;

  if (!company.trim()) {
    return res.status(400).json({ ok: false, error: "company name is required" });
  }

  logger.info(`Middleware check: ${company}`, { fromDate, toDate, pushToBtp });

  try {
    const report = await runMiddlewareCheck(company, { fromDate, toDate });

    let btpResult = null;
    if (pushToBtp && config.btp.clientId) {
      try {
        btpResult = await pushMiddlewareCheckToBtp(report);
        logger.success("Check report pushed to SAP BTP");

        // Update latestSync with the check report data
        updateLatestSync({
          company: company,
          dataType: "checkReport",
          totalRecords: 1,
          timestamp: istTimestamp(),
          summary: report.summary,
          data: [] // Check report typically doesn't send a dataset in the same way
        });
      } catch (btpErr) {
        logger.warn("BTP push of check report failed", { error: btpErr.message });
        btpResult = { error: btpErr.message };
      }
    }

    return res.json({ ok: true, report, btpResult });
  } catch (err) {
    logger.error("Middleware check error", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Push Ledgers → DB + BTP ───────────────────────────────────────────────────
router.post("/btp/push/ledgers", async (req, res) => {
  const body        = req.body || {};
  const companyName = body.company || config.tally.companyName;
  if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

  const startedAt = new Date().toISOString();
  const errors    = [];
  let   btpResult = null;
  let   ledgers   = [];

  try {
    logger.info(`Fetching ledgers for: ${companyName}`);
    ledgers = await fetchTallyLedgers(companyName);
    logger.success(`Fetched ${ledgers.length} ledgers from Tally`);
  } catch (err) {
    logger.error("Tally fetch failed — ledgers", { error: err.message });
    return res.status(500).json({ ok: false, error: `Tally: ${err.message}` });
  }

  try {
    btpResult = await pushLedgersToBtp(ledgers, companyName);
    logger.success(`Pushed ${ledgers.length} ledgers to SAP BTP`);

    // Update the shared latestSync state for the Fiori dashboard
    const ledgersSummary = {
      totalLedgers: ledgers.length,
      partyLedgers: ledgers.filter(l => l.type === "Party").length
    };
    updateLatestSync({
      company: companyName,
      dataType: "ledgers",
      totalRecords: ledgers.length,
      timestamp: istTimestamp(),
      summary: ledgersSummary,
      data: ledgers
    });

    // Notify dashboard backend with CPI message ID
    pushToDashboard({
      dataType: "ledgers",
      company: companyName,
      totalRecords: ledgers.length,
      summary: ledgersSummary,
      data: ledgers,
      syncId: btpResult?.response?.messageId || btpResult?.response?.id || null,
    });
  } catch (btpErr) {
    logger.error("BTP push failed — ledgers", { error: btpErr.message });
    errors.push(`BTP: ${btpErr.message}`);
    btpResult = { error: btpErr.message };
  }

  return res.json({ ok: errors.length === 0, count: ledgers.length, btpResult, errors });
});

// ── Push Vouchers → DB + BTP ──────────────────────────────────────────────────
router.post("/btp/push/vouchers", async (req, res) => {
  const body        = req.body || {};
  const companyName = body.company  || config.tally.companyName;
  const fromDate    = body.fromDate || null;
  const toDate      = body.toDate   || null;
  if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

  const startedAt = new Date().toISOString();
  const errors    = [];
  let   btpResult = null;
  let   vouchers  = [];

  try {
    logger.info(`Fetching vouchers for: ${companyName}`, { fromDate, toDate });
    vouchers = await fetchTallyVouchers(companyName, fromDate, toDate);
    logger.success(`Fetched ${vouchers.length} vouchers from Tally`);
  } catch (err) {
    logger.error("Tally fetch failed — vouchers", { error: err.message });
    return res.status(500).json({ ok: false, error: `Tally: ${err.message}` });
  }

  try {
    btpResult = await pushVouchersToBtp(vouchers, companyName);
    logger.success(`Pushed ${vouchers.length} vouchers to SAP BTP`);

    // Update the shared latestSync state for the Fiori dashboard
    const vouchersSummary = {
      totalVouchers: vouchers.length,
      totalAmount: vouchers.reduce((s, v) => s + (v.netAmount || 0), 0)
    };
    updateLatestSync({
      company: companyName,
      dataType: "vouchers",
      totalRecords: vouchers.length,
      timestamp: istTimestamp(),
      summary: vouchersSummary,
      data: vouchers
    });

    // Notify dashboard backend with CPI message ID
    pushToDashboard({
      dataType: "vouchers",
      company: companyName,
      totalRecords: vouchers.length,
      summary: vouchersSummary,
      data: vouchers,
      syncId: btpResult?.response?.messageId || btpResult?.response?.id || null,
    });
  } catch (btpErr) {
    logger.error("BTP push failed — vouchers", { error: btpErr.message });
    errors.push(`BTP: ${btpErr.message}`);
    btpResult = { error: btpErr.message };
  }

  return res.json({ ok: errors.length === 0, count: vouchers.length, btpResult, errors });
});

// ── Push Stock → DB + BTP ─────────────────────────────────────────────────────
router.post("/btp/push/stock", async (req, res) => {
  const body        = req.body || {};
  const companyName = body.company || config.tally.companyName;
  if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

  const startedAt = new Date().toISOString();
  const errors    = [];
  let   btpResult = null;
  let   items     = [];

  try {
    logger.info(`Fetching stock for: ${companyName}`);
    items = await fetchTallyStockItems(companyName);
    logger.success(`Fetched ${items.length} stock items from Tally`);
  } catch (err) {
    logger.error("Tally fetch failed — stock", { error: err.message });
    return res.status(500).json({ ok: false, error: `Tally: ${err.message}` });
  }

  try {
    btpResult = await pushStockItemsToBtp(items, companyName);
    const failedBatches = btpResult.results.filter((r) => !r.success).length;
    if (failedBatches > 0) {
      errors.push(`BTP: ${failedBatches}/${btpResult.totalBatches} batches failed`);
    } else {
      // Update the shared latestSync state for the Fiori dashboard ONLY if all batches succeed
      const stockSummary = {
        totalItems: items.length,
        totalValue: items.reduce((s, i) => s + (i.closingValue || 0), 0)
      };
      updateLatestSync({
        company: companyName,
        dataType: "stockItems",
        totalRecords: items.length,
        timestamp: istTimestamp(),
        summary: stockSummary,
        data: items
      });

      // Notify dashboard backend with CPI message ID
      pushToDashboard({
        dataType: "stockItems",
        company: companyName,
        totalRecords: items.length,
        summary: stockSummary,
        data: items,
        syncId: btpResult?.correlationId || null,
      });
    }
    logger.success(`Stock batch push done`, {
      correlationId: btpResult.correlationId,
      successCount:  btpResult.successCount,
      totalBatches:  btpResult.totalBatches,
    });
  } catch (btpErr) {
    logger.error("BTP push failed — stock", { error: btpErr.message });
    errors.push(`BTP: ${btpErr.message}`);
    btpResult = { error: btpErr.message };
  }

  const correlationId = btpResult?.correlationId || null;

  return res.json({
    ok:           errors.length === 0,
    count:        items.length,
    correlationId,
    batchSize:    btpResult?.batchSize    ?? null,
    totalBatches: btpResult?.totalBatches ?? null,
    btpResult,
    errors,
  });
});

// ── Push All → DB + BTP ───────────────────────────────────────────────────────
router.post("/btp/push/all", async (req, res) => {
  const body        = req.body || {};
  const companyName = body.company  || config.tally.companyName;
  const fromDate    = body.fromDate || null;
  const toDate      = body.toDate   || null;
  if (!companyName) return res.status(400).json({ ok: false, error: "company required" });

  const startedAt = new Date().toISOString();
  const results   = { company: companyName, ledgers: null, vouchers: null, stockItems: null, errors: [] };
  
  let allLedgers = [];
  let allVouchers = [];
  let allStock = [];

  // 1. Ledgers — use from request body if provided, else fetch from Tally
  if (body.ledgers) {
    allLedgers = body.ledgers;
    results.ledgers = { count: allLedgers.length, source: "request" };
    logger.info(`All — Ledgers from request: ${allLedgers.length}`);
  } else {
    try {
      allLedgers = await fetchTallyLedgers(companyName);
      results.ledgers = { count: allLedgers.length };
      logger.success(`All — Ledgers fetched: ${allLedgers.length}`);
    } catch (e) {
      logger.error("All — Ledgers fetch failed", { error: e.message });
      results.errors.push(`Ledgers: ${e.message}`);
      results.ledgers = { error: e.message };
    }
  }

  // 2. Vouchers — use from request body if provided, else fetch from Tally
  if (body.vouchers) {
    allVouchers = body.vouchers;
    results.vouchers = { count: allVouchers.length, source: "request" };
    logger.info(`All — Vouchers from request: ${allVouchers.length}`);
  } else {
    try {
      allVouchers = await fetchTallyVouchers(companyName, fromDate, toDate);
      results.vouchers = { count: allVouchers.length };
      logger.success(`All — Vouchers fetched: ${allVouchers.length}`);
    } catch (e) {
      logger.error("All — Vouchers fetch failed", { error: e.message });
      results.errors.push(`Vouchers: ${e.message}`);
      results.vouchers = { error: e.message };
    }
  }

  // 3. Stock Items — use from request body if provided, else fetch from Tally
  if (body.stockItems) {
    allStock = body.stockItems;
    results.stockItems = { count: allStock.length, source: "request" };
    logger.info(`All — Stock items from request: ${allStock.length}`);
  } else {
    try {
      allStock = await fetchTallyStockItems(companyName);
      results.stockItems = { count: allStock.length };
      logger.success(`All — Stock fetched: ${allStock.length}`);
    } catch (e) {
      logger.error("All — Stock fetch failed", { error: e.message });
      results.errors.push(`Stock: ${e.message}`);
      results.stockItems = { error: e.message };
    }
  }

  // 4. Combined Push to BTP (ONLY ONCE)
  let btpRes = null;
  const totalRecords = allLedgers.length + allVouchers.length + allStock.length;

  // Use BTP credentials from request body if provided (overrides env/config)
  let origBtpConfig = null;
  if (body.btp) {
    origBtpConfig = { ...config.btp };
    if (body.btp.clientId) config.btp.clientId = body.btp.clientId;
    if (body.btp.clientSecret) config.btp.clientSecret = body.btp.clientSecret;
    if (body.btp.tokenUrl) config.btp.tokenUrl = body.btp.tokenUrl;
    if (body.btp.runtimeUrl) config.btp.runtimeUrl = body.btp.runtimeUrl;
    clearTokenCache();
  }

  if (totalRecords > 0 && results.errors.length < 3) {
    try {
      btpRes = await pushAllToBtp(allLedgers, allVouchers, allStock, companyName);
      logger.success(`All — Combined push to BTP OK (records: ${totalRecords})`);
      
      const summary = {
        ledgers: allLedgers.length,
        vouchers: allVouchers.length,
        stockItems: allStock.length
      };

      // Update the shared latestSync state for the Fiori dashboard
      updateLatestSync({
        company: companyName,
        dataType: "all",
        totalRecords: totalRecords,
        timestamp: istTimestamp(),
        summary,
        data: [] // Sequential/Bulk syncs often don't show a single dataset preview
      });

      // Notify dashboard backend (ONLY ONCE)
      pushToDashboard({
        dataType: "all",
        company: companyName,
        totalRecords,
        summary,
        data: [], // Do not send huge data arrays to dashboard
        syncId: btpRes?.response?.messageId || btpRes?.response?.id || null,
      });

    } catch (btpErr) {
      logger.error("All — Combined BTP push failed", { error: btpErr.message });
      results.errors.push(`BTP: ${btpErr.message}`);
    }
  }

  // Restore original BTP config if it was overridden (skip getter-only 'effectiveUrl')
  if (origBtpConfig) {
    config.btp.clientId = origBtpConfig.clientId;
    config.btp.clientSecret = origBtpConfig.clientSecret;
    config.btp.tokenUrl = origBtpConfig.tokenUrl;
    config.btp.runtimeUrl = origBtpConfig.runtimeUrl;
    config.btp.ngrokUrl = origBtpConfig.ngrokUrl || '';
    clearTokenCache();
  }

  return res.json({ ok: results.errors.length === 0, results, btpRes });
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD PUSH ENDPOINTS
// ── Called AFTER CPI upload succeeds to register the CPI Message GUID ──────
// ═════════════════════════════════════════════════════════════════════════════

// ── Push to Dashboard: Ledgers ────────────────────────────────────────────────
router.post("/push/ledgers", async (req, res) => {
  const { syncId, company, totalRecords, summary, data } = req.body || {};
  if (!syncId) return res.status(400).json({ ok: false, error: "syncId (CPI message GUID) is required" });
  if (!company) return res.status(400).json({ ok: false, error: "company is required" });

  try {
    updateLatestSync({
      company,
      dataType: "ledgers",
      totalRecords: totalRecords || data?.length || 0,
      timestamp: istTimestamp(),
      summary: summary || {},
      data: data || [],
      syncId,
    });

    logger.success(`Dashboard push: ledgers (syncId=${syncId})`);
    return res.json({ ok: true, syncId, company, totalRecords: totalRecords || data?.length || 0 });
  } catch (err) {
    logger.error("Dashboard push failed — ledgers", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Push to Dashboard: Vouchers ───────────────────────────────────────────────
router.post("/push/vouchers", async (req, res) => {
  const { syncId, company, totalRecords, summary, data } = req.body || {};
  if (!syncId) return res.status(400).json({ ok: false, error: "syncId (CPI message GUID) is required" });
  if (!company) return res.status(400).json({ ok: false, error: "company is required" });

  try {
    updateLatestSync({
      company,
      dataType: "vouchers",
      totalRecords: totalRecords || data?.length || 0,
      timestamp: istTimestamp(),
      summary: summary || {},
      data: data || [],
      syncId,
    });

    logger.success(`Dashboard push: vouchers (syncId=${syncId})`);
    return res.json({ ok: true, syncId, company, totalRecords: totalRecords || data?.length || 0 });
  } catch (err) {
    logger.error("Dashboard push failed — vouchers", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Push to Dashboard: Stock Items ────────────────────────────────────────────
router.post("/push/stock-items", async (req, res) => {
  const { syncId, company, totalRecords, summary, data } = req.body || {};
  if (!syncId) return res.status(400).json({ ok: false, error: "syncId (CPI message GUID) is required" });
  if (!company) return res.status(400).json({ ok: false, error: "company is required" });

  try {
    updateLatestSync({
      company,
      dataType: "stockItems",
      totalRecords: totalRecords || data?.length || 0,
      timestamp: istTimestamp(),
      summary: summary || {},
      data: data || [],
      syncId,
    });

    logger.success(`Dashboard push: stockItems (syncId=${syncId})`);
    return res.json({ ok: true, syncId, company, totalRecords: totalRecords || data?.length || 0 });
  } catch (err) {
    logger.error("Dashboard push failed — stockItems", { error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Push to Dashboard: Generic (requires "dataType" in body) ──────────────────
router.post("/push", async (req, res) => {
  const { syncId, company, dataType, totalRecords, summary, data } = req.body || {};
  if (!syncId) return res.status(400).json({ ok: false, error: "syncId (CPI message GUID) is required" });
  if (!company) return res.status(400).json({ ok: false, error: "company is required" });
  if (!dataType) return res.status(400).json({ ok: false, error: "dataType is required for generic push (e.g. 'ledgers', 'vouchers', 'stockItems')" });

  try {
    updateLatestSync({
      company,
      dataType: dataType,
      totalRecords: totalRecords || data?.length || 0,
      timestamp: istTimestamp(),
      summary: summary || {},
      data: data || [],
      syncId,
    });

    logger.success(`Dashboard push: ${dataType} (syncId=${syncId})`);
    return res.json({ ok: true, syncId, company, dataType, totalRecords: totalRecords || data?.length || 0 });
  } catch (err) {
    logger.error("Dashboard push failed", { dataType, error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Logs ──────────────────────────────────────────────────────────────────────
router.get("/logs", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json({ logs: logger.getLogs(limit) });
});

export default router;