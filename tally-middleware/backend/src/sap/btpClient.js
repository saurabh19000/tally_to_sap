// /**
//  * btpClient.js
//  *
//  * ARCHITECTURE: Tally data flows Tally → memory → SAP BTP directly.
//  * Data is NEVER saved to the database. Only sync logs go to DB.
//  *
//  * Sends FULL data arrays to SAP BTP.
//  */

// import axios from "axios";
// import { config } from "../config/config.js";
// import { logger } from "../logs/logger.js";

// let cachedToken    = null;
// let tokenExpiresAt = 0;

// // ── OAuth Token ───────────────────────────────────────────────────────────────
// export async function getBtpToken(forceRefresh = false) {
//   if (!forceRefresh && cachedToken && Date.now() < tokenExpiresAt - 60_000) {
//     return cachedToken;
//   }

//   const { clientId, clientSecret, tokenUrl } = config.btp;
//   if (!clientId || !clientSecret || !tokenUrl) {
//     throw new Error("BTP credentials missing — set BTP_CLIENT_ID, BTP_CLIENT_SECRET, BTP_TOKEN_URL in .env");
//   }

//   logger.info("Fetching new BTP OAuth token");

//   const params = new URLSearchParams();
//   params.append("grant_type",    "client_credentials");
//   params.append("client_id",     clientId);
//   params.append("client_secret", clientSecret);

//   try {
//     const res = await axios.post(tokenUrl, params.toString(), {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       timeout: 30_000,
//     });

//     if (!res.data?.access_token) {
//       throw new Error("Token response missing access_token: " + JSON.stringify(res.data));
//     }

//     cachedToken    = res.data.access_token;
//     tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
//     logger.success("BTP OAuth token received");
//     return cachedToken;
//   } catch (err) {
//     cachedToken    = null;
//     tokenExpiresAt = 0;
//     const detail   = err.response?.data ? JSON.stringify(err.response.data) : err.message;
//     logger.error("BTP token fetch failed", { detail });
//     throw new Error(`BTP token error: ${detail}`);
//   }
// }

// // ── Resolve runtime URL ───────────────────────────────────────────────────────
// function getEffectiveRuntimeUrl() {
//   const url = config.btp.runtimeUrl || config.btp.ngrokUrl;
//   if (!url) throw new Error("No BTP runtime URL — set BTP_RUNTIME_URL or NGROK_URL in .env");
//   return url.replace(/\/+$/, "");
// }

// // ── Check BTP connection ──────────────────────────────────────────────────────
// export async function checkBtpConnection() {
//   try {
//     const token      = await getBtpToken(true);
//     const runtimeUrl = getEffectiveRuntimeUrl();
//     return { connected: true, tokenPreview: token.slice(0, 20) + "...", runtimeUrl };
//   } catch (e) {
//     return {
//       connected:  false,
//       error:      e.message,
//       runtimeUrl: config.btp.runtimeUrl || config.btp.ngrokUrl || "(not set)",
//     };
//   }
// }

// // ── Strip null values recursively ────────────────────────────────────────────
// function stripNulls(value) {
//   if (Array.isArray(value)) {
//     return value.map(stripNulls);
//   }
//   if (value !== null && typeof value === "object") {
//     return Object.fromEntries(
//       Object.entries(value)
//         .filter(([, v]) => v !== null)
//         .map(([k, v]) => [k, stripNulls(v)])
//     );
//   }
//   return value;
// }

// // ── Core push — with 401 retry ────────────────────────────────────────────────
// async function pushToBtp(payload, retried = false) {
//   const base         = getEffectiveRuntimeUrl();
//   const url          = `${base}/http/tally-trigger`;
//   const token        = await getBtpToken();
//   const cleanPayload = stripNulls(payload);

//   logger.info(`Pushing to SAP BTP`, {
//     url,
//     dataType: payload.dataType,
//     totalRecords: payload.totalRecords,
//   });

//   try {
//     const res = await axios.post(url, cleanPayload, {
//       headers: {
//         Authorization:               `Bearer ${token}`,
//         "Content-Type":              "application/json",
//         "Accept":                    "application/json",
//         "ngrok-skip-browser-warning": "true",
//       },
//       timeout:        120_000,
//       validateStatus: (s) => s >= 200 && s < 300,
//     });

//     logger.success(`BTP push OK`, { dataType: payload.dataType, status: res.status });
//     return {
//       success:      true,
//       status:       res.status,
//       dataType:     payload.dataType,
//       totalRecords: payload.totalRecords,
//       response:     res.data,
//     };
//   } catch (err) {
//     const status       = err.response?.status;
//     const responseBody = err.response?.data;

//     // 401 → refresh token once and retry
//     if (status === 401 && !retried) {
//       logger.warn("BTP 401 — refreshing token and retrying");
//       cachedToken    = null;
//       tokenExpiresAt = 0;
//       return pushToBtp(payload, true);
//     }

//     let message;
//     if (typeof responseBody === "string" && responseBody.trim()) {
//       message = responseBody.trim();
//     } else if (responseBody && typeof responseBody === "object") {
//       message = JSON.stringify(responseBody);
//     } else if (err.code === "ECONNREFUSED") {
//       message = `Connection refused — is ngrok running? (${url})`;
//     } else if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED") {
//       message = `Timed out after 120s (${url})`;
//     } else {
//       message = err.message;
//     }

//     logger.error(`BTP push failed`, { dataType: payload.dataType, status, message });
//     throw new Error(`BTP push failed (HTTP ${status ?? "no-response"}): ${message}`);
//   }
// }

// // ── Push FULL ledgers to BTP ──────────────────────────────────────────────────
// export async function pushLedgersToBtp(ledgers, company) {
//   const groupMap = {};
//   ledgers.forEach((l) => {
//     const g = l.parentGroup || "Unknown";
//     groupMap[g] = (groupMap[g] || 0) + 1;
//   });

//   return pushToBtp({
//     source:       "tally-middleware",
//     dataType:     "ledgers",
//     company,
//     timestamp:    new Date().toISOString(),
//     totalRecords: ledgers.length,
//     // Data flows directly from Tally to BTP — not stored in middleware DB
//     savedToDb:    false,

//     summary: {
//       totalLedgers:  ledgers.length,
//       partyLedgers:  ledgers.filter((l) => l.type === "Party").length,
//       withGstin:     ledgers.filter((l) => l.gstin).length,
//       withEmail:     ledgers.filter((l) => l.email).length,
//       totalBalance:  Math.round(ledgers.reduce((s, l) => s + (l.closingBalance || 0), 0)),
//       topGroups:     Object.entries(groupMap)
//                        .sort((a, b) => b[1] - a[1])
//                        .slice(0, 20)
//                        .map(([group, count]) => ({ group, count })),
//     },

//     data: ledgers.map((l) => ({
//       name:             l.name,
//       parentGroup:      l.parentGroup,
//       type:             l.type,
//       openingBalance:   l.openingBalance,
//       closingBalance:   l.closingBalance,
//       gstin:            l.gstin          || null,
//       pan:              l.pan            || null,
//       email:            l.email          || null,
//       phone:            l.phone          || null,
//       address:          l.address        || null,
//       currency:         l.currency       || "INR",
//       countryCode:      l.countryCode    || "IN",
//       gstType:          l.gstType        || null,
//       registrationType: l.registrationType || null,
//     })),
//   });
// }

// // ── Push FULL vouchers to BTP ─────────────────────────────────────────────────
// export async function pushVouchersToBtp(vouchers, company) {
//   const byType      = {};
//   let   totalAmount = 0;
//   vouchers.forEach((v) => {
//     byType[v.voucherType] = (byType[v.voucherType] || 0) + 1;
//     totalAmount += v.netAmount || 0;
//   });

//   return pushToBtp({
//     source:       "tally-middleware",
//     dataType:     "vouchers",
//     company,
//     timestamp:    new Date().toISOString(),
//     totalRecords: vouchers.length,
//     savedToDb:    false,

//     summary: {
//       totalVouchers: vouchers.length,
//       totalAmount:   Math.round(totalAmount),
//       byType,
//     },

//     data: vouchers.map((v) => ({
//       voucherNumber:    v.voucherNumber,
//       voucherDate:      v.voucherDate,
//       voucherType:      v.voucherType,
//       partyName:        v.partyName      || null,
//       narration:        v.narration      || null,
//       netAmount:        v.netAmount      || 0,
//       gstin:            v.gstin          || null,
//       referenceNo:      v.referenceNo    || null,
//       placeOfSupply:    v.placeOfSupply  || null,
//       isGstInvoice:     v.isGstInvoice   || false,
//       ledgerEntries:  (v.ledgerEntries || []).map((e) => ({
//         ledgerName:       e.ledgerName,
//         amount:           e.amount,
//         isDeemedPositive: e.isDeemedPositive,
//         gstAmount:        e.gstAmount || null,
//         taxType:          e.taxType   || null,
//       })),
//       inventoryEntries: (v.inventoryEntries || []).map((i) => ({
//         itemName: i.itemName,
//         qty:      i.qty,
//         rate:     i.rate,
//         amount:   i.amount,
//         unit:     i.unit   || null,
//         godown:   i.godown || null,
//       })),
//     })),
//   });
// }

// // ── Push FULL stock items to BTP ──────────────────────────────────────────────
// export async function pushStockItemsToBtp(items, company) {
//   return pushToBtp({
//     source:       "tally-middleware",
//     dataType:     "stockItems",
//     company,
//     timestamp:    new Date().toISOString(),
//     totalRecords: items.length,
//     savedToDb:    false,

//     summary: {
//       totalItems: items.length,
//       totalValue: Math.round(items.reduce((s, i) => s + (i.closingValue || 0), 0)),
//       totalQty:   Math.round(items.reduce((s, i) => s + (i.closingQty   || 0), 0)),
//     },

//     data: items.map((i) => ({
//       name:         i.name,
//       group:        i.group        || null,
//       category:     i.category     || null,
//       baseUnit:     i.baseUnit     || null,
//       openingQty:   i.openingQty   || 0,
//       openingValue: i.openingValue || 0,
//       closingQty:   i.closingQty   || 0,
//       closingValue: i.closingValue || 0,
//       rate:         i.rate         || 0,
//       hsn:          i.hsn          || null,
//       gstRate:      i.gstRate      || null,
//       taxability:   i.taxability   || null,
//       description:  i.description  || null,
//       partNumber:   i.partNumber   || null,
//     })),
//   });
// }

// // ── Push middleware check report to BTP ───────────────────────────────────────
// export async function pushMiddlewareCheckToBtp(report) {
//   return pushToBtp({
//     source:       "tally-middleware",
//     dataType:     "checkReport",
//     company:      report.company,
//     timestamp:    new Date().toISOString(),
//     totalRecords: 1,
//     savedToDb:    false,
//     status:       report.status,
//     readyToSync:  report.readyToSync,
//     summary:      report.summary,
//     checks: {
//       ping:       { status: report.checks?.ping?.status,       latencyMs: report.checks?.ping?.latencyMs },
//       companies:  { status: report.checks?.companies?.status,  count: report.checks?.companies?.count },
//       ledgers:    { status: report.checks?.ledgers?.status,    count: report.checks?.ledgers?.count },
//       vouchers:   { status: report.checks?.vouchers?.status,   count: report.checks?.vouchers?.count },
//       stockItems: { status: report.checks?.stockItems?.status, count: report.checks?.stockItems?.count },
//     },
//   });
// }


/**
 * btpClient.js
 * Sends FULL data arrays to SAP BTP (not just summaries/counts).
 */

import axios from "axios";
import { config } from "../config/config.js";
import { logger } from "../logs/logger.js";

export const STOCK_BATCH_SIZE = 23;

let cachedToken    = null;
let tokenExpiresAt = 0;

export function clearTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ── IST timestamp helper (UTC+05:30) ──────────────────────────────────────────
export function istTimestamp() {
  // "sv-SE" locale gives YYYY-MM-DD HH:MM:SS — easy to reformat to ISO+offset
  const local = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
  // local is "YYYY-MM-DD HH:MM:SS"
  return local.replace(" ", "T") + "+05:30";
}

// ── Run-counter store: track how many runs have started per calendar day ──────
const _runCounters = {};   // key: "YYYYMMDD" → number

function nextRunIndex(dateStr) {
  _runCounters[dateStr] = (_runCounters[dateStr] || 0) + 1;
  return String(_runCounters[dateStr]).padStart(3, "0");
}

// ── OAuth Token ───────────────────────────────────────────────────────────────
export async function getBtpToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { clientId, clientSecret, tokenUrl } = config.btp;
  if (!clientId || !clientSecret || !tokenUrl) {
    throw new Error("BTP credentials missing — set BTP_CLIENT_ID, BTP_CLIENT_SECRET, BTP_TOKEN_URL in .env");
  }

  logger.info("Fetching new BTP OAuth token");

  const params = new URLSearchParams();
  params.append("grant_type",    "client_credentials");
  params.append("client_id",     clientId);
  params.append("client_secret", clientSecret);

  try {
    const res = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30_000,
    });

    if (!res.data?.access_token) {
      throw new Error("Token response missing access_token: " + JSON.stringify(res.data));
    }

    cachedToken    = res.data.access_token;
    tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
    logger.success("BTP OAuth token received");
    return cachedToken;
  } catch (err) {
    cachedToken    = null;
    tokenExpiresAt = 0;
    const detail   = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error("BTP token fetch failed", { detail });
    throw new Error(`BTP token error: ${detail}`);
  }
}

// ── Resolve runtime URL ───────────────────────────────────────────────────────
function getEffectiveRuntimeUrl() {
  const url = config.btp.runtimeUrl || config.btp.ngrokUrl;
  if (!url) throw new Error("No BTP runtime URL — set BTP_RUNTIME_URL or NGROK_URL in .env");
  return url.replace(/\/+$/, "");
}

// ── Check BTP connection ──────────────────────────────────────────────────────
export async function checkBtpConnection() {
  try {
    const token      = await getBtpToken(true);
    const runtimeUrl = getEffectiveRuntimeUrl();
    return { connected: true, tokenPreview: token.slice(0, 20) + "...", runtimeUrl };
  } catch (e) {
    return {
      connected:  false,
      error:      e.message,
      runtimeUrl: config.btp.runtimeUrl || config.btp.ngrokUrl || "(not set)",
    };
  }
}

// ── Strip null values recursively ────────────────────────────────────────────
function stripNulls(value) {
  if (Array.isArray(value)) {
    return value.map(stripNulls);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)])
    );
  }
  return value;
}

// ── Core push — with 401 retry ────────────────────────────────────────────────
async function pushToBtp(payload, retried = false) {
  const base         = getEffectiveRuntimeUrl();
  const url          = `${base}/http/tally-write`;
  const token        = await getBtpToken();
  const cleanPayload = stripNulls(payload);

  logger.info(`Pushing to SAP BTP`, {
    url,
    dataType: payload.dataType,
    totalRecords: payload.totalRecords,
  });

  try {
    const res = await axios.post(url, cleanPayload, {
      headers: {
        Authorization:              `Bearer ${token}`,
        "Content-Type":             "application/json",
        "Accept":                   "application/json",
        "ngrok-skip-browser-warning": "true",         // ← fixes ngrok 404
      },
      timeout:        120_000,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    logger.success(`BTP push OK`, { dataType: payload.dataType, status: res.status });
    return {
      success:      true,
      status:       res.status,
      dataType:     payload.dataType,
      totalRecords: payload.totalRecords,
      response:     res.data,
    };
  } catch (err) {
    const status       = err.response?.status;
    const responseBody = err.response?.data;

    // 401 → refresh token once and retry
    if (status === 401 && !retried) {
      logger.warn("BTP 401 — refreshing token and retrying");
      cachedToken    = null;
      tokenExpiresAt = 0;
      return pushToBtp(payload, true);
    }

    let message;
    if (typeof responseBody === "string" && responseBody.trim()) {
      message = responseBody.trim();
    } else if (responseBody && typeof responseBody === "object") {
      message = JSON.stringify(responseBody);
    } else if (err.code === "ECONNREFUSED") {
      message = `Connection refused — is ngrok running? (${url})`;
    } else if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED") {
      message = `Timed out after 120s (${url})`;
    } else {
      message = err.message;
    }

    logger.error(`BTP push failed`, { dataType: payload.dataType, status, message });
    throw new Error(`BTP push failed (HTTP ${status ?? "no-response"}): ${message}`);
  }
}

// ── Push FULL ledgers to BTP ──────────────────────────────────────────────────
export async function pushLedgersToBtp(ledgers, company) {
  // Build quick stats for the summary block (kept for BTP-side reporting)
  const groupMap = {};
  ledgers.forEach((l) => {
    const g = l.parentGroup || "Unknown";
    groupMap[g] = (groupMap[g] || 0) + 1;
  });

  return pushToBtp({
    source:       "tally-middleware",
    dataType:     "ledgers",
    company,
    timestamp:    istTimestamp(),
    totalRecords: ledgers.length,          // ← total count for quick reference

    // ─── Summary (overview for BTP dashboard) ────────────────────────────────
    summary: {
      totalLedgers:  ledgers.length,
      partyLedgers:  ledgers.filter((l) => l.type === "Party").length,
      withGstin:     ledgers.filter((l) => l.gstin).length,
      withEmail:     ledgers.filter((l) => l.email).length,
      totalBalance:  Math.round(ledgers.reduce((s, l) => s + (l.closingBalance || 0), 0)),
      topGroups:     Object.entries(groupMap)
                       .sort((a, b) => b[1] - a[1])
                       .slice(0, 20)
                       .map(([group, count]) => ({ group, count })),
    },

    // ─── FULL dataset ─────────────────────────────────────────────────────────
    data: ledgers.map((l) => ({
      name:           l.name,
      parentGroup:    l.parentGroup,
      type:           l.type,
      openingBalance: l.openingBalance,
      closingBalance: l.closingBalance,
      gstin:          l.gstin          || null,
      pan:            l.pan            || null,
      email:          l.email          || null,
      phone:          l.phone          || null,
      address:        l.address        || null,
      currency:       l.currency       || "INR",
      countryCode:    l.countryCode    || "IN",
      gstType:        l.gstType        || null,
      registrationType: l.registrationType || null,
    })),

    savedToDb: true,
    dbTable:   "ledgers",
  });
}

// ── Push FULL vouchers to BTP ─────────────────────────────────────────────────
export async function pushVouchersToBtp(vouchers, company) {
  const byType      = {};
  let   totalAmount = 0;
  vouchers.forEach((v) => {
    byType[v.voucherType] = (byType[v.voucherType] || 0) + 1;
    totalAmount += v.netAmount || 0;
  });

  return pushToBtp({
    source:       "tally-middleware",
    dataType:     "vouchers",
    company,
    timestamp:    istTimestamp(),
    totalRecords: vouchers.length,

    summary: {
      totalVouchers: vouchers.length,
      totalAmount:   Math.round(totalAmount),
      byType,
    },

    // ─── FULL dataset ─────────────────────────────────────────────────────────
    data: vouchers.map((v) => ({
      voucherNumber:  v.voucherNumber,
      voucherDate:    v.voucherDate,
      voucherType:    v.voucherType,
      partyName:      v.partyName      || null,
      narration:      v.narration      || null,
      netAmount:      v.netAmount      || 0,
      gstin:          v.gstin          || null,
      referenceNo:    v.referenceNo    || null,
      placeOfSupply:  v.placeOfSupply  || null,
      isGstInvoice:   v.isGstInvoice   || false,
      ledgerEntries:  (v.ledgerEntries || []).map((e) => ({
        ledgerName:      e.ledgerName,
        amount:          e.amount,
        isDeemedPositive: e.isDeemedPositive,
        gstAmount:       e.gstAmount || null,
        taxType:         e.taxType   || null,
      })),
      inventoryEntries: (v.inventoryEntries || []).map((i) => ({
        itemName:  i.itemName,
        qty:       i.qty,
        rate:      i.rate,
        amount:    i.amount,
        unit:      i.unit || null,
        godown:    i.godown || null,
      })),
    })),

    savedToDb: true,
    dbTable:   "vouchers",
  });
}

// ── Push stock items to BTP in batches ───────────────────────────────────────
export async function pushStockItemsToBtp(items, company) {
  const totalRecords = items.length;

  // ── Build normalised item list once ─────────────────────────────────────────
  const allItems = items.map((i) => ({
    name:         i.name,
    group:        i.group        || null,
    category:     i.category     || null,
    baseUnit:     i.baseUnit     || null,
    openingQty:   i.openingQty   || 0,
    openingValue: i.openingValue || 0,
    closingQty:   i.closingQty   || 0,
    closingValue: i.closingValue || 0,
    rate:         i.rate         || 0,
    hsn:          i.hsn          || null,
    gstRate:      i.gstRate      || null,
    taxability:   i.taxability   || null,
    description:  i.description  || null,
    partNumber:   i.partNumber   || null,
  }));

  // ── Split into chunks of STOCK_BATCH_SIZE ────────────────────────────────────
  const chunks = [];
  for (let i = 0; i < allItems.length; i += STOCK_BATCH_SIZE) {
    chunks.push(allItems.slice(i, i + STOCK_BATCH_SIZE));
  }
  const totalBatches = chunks.length;

  // ── correlationId: one per run, shared across all batches ───────────────────
  const dateStr    = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 10).replace(/-/g, "");
  const runIndex   = nextRunIndex(dateStr);
  const correlationId = `tally-stock-${dateStr}-${runIndex}`;

  logger.info(`Stock batch push starting`, { correlationId, totalRecords, totalBatches, batchSize: STOCK_BATCH_SIZE });

  const batchResults = [];

  for (let b = 0; b < totalBatches; b++) {
    const chunk      = chunks[b];
    const batchIndex = b + 1;
    const batchLabel = String(batchIndex).padStart(2, "0");
    const entryId    = `${correlationId}-b${batchLabel}`;
    const ts         = istTimestamp();

    const payload = {
      correlationId,
      entryId,
      sourceSystem:  "tally-middleware",
      dataType:      "stockItems",
      company,
      status:        "RECEIVED",
      batchIndex,
      batchSize:     chunk.length,
      totalBatches,
      totalRecords,
      retryCount:    0,
      errorMessage:  null,
      createdAt:     ts,
      updatedAt:     ts,
      payload:       chunk,
    };

    try {
      const result = await pushToBtp(payload);
      logger.success(`Stock batch ${batchIndex}/${totalBatches} pushed`, { entryId, records: chunk.length });
      batchResults.push({ batchIndex, entryId, records: chunk.length, success: true, result });
    } catch (err) {
      logger.error(`Stock batch ${batchIndex}/${totalBatches} failed`, { entryId, error: err.message });
      batchResults.push({ batchIndex, entryId, records: chunk.length, success: false, error: err.message });
    }
  }

  const successCount = batchResults.filter((r) => r.success).length;
  logger.info(`Stock batch push complete`, { correlationId, successCount, totalBatches });

  return {
    correlationId,
    totalRecords,
    batchSize:    STOCK_BATCH_SIZE,
    totalBatches,
    successCount,
    results:      batchResults,
  };
}

// ── Push ALL data (Ledgers + Vouchers + Stock) to BTP in one request ────────
export async function pushAllToBtp(ledgers, vouchers, items, company) {
  const totalRecords = ledgers.length + vouchers.length + items.length;

  const payload = {
    source:       "tally-middleware",
    dataType:     "all",
    company,
    timestamp:    istTimestamp(),
    totalRecords,
    summary: {
      ledgers:    ledgers.length,
      vouchers:   vouchers.length,
      stockItems: items.length,
    },
    data: {
      ledgers: ledgers.map((l) => ({
        name:           l.name,
        parentGroup:    l.parentGroup,
        type:           l.type,
        openingBalance: l.openingBalance,
        closingBalance: l.closingBalance,
        gstin:          l.gstin          || null,
        pan:            l.pan            || null,
        email:          l.email          || null,
        phone:          l.phone          || null,
        address:        l.address        || null,
        currency:       l.currency       || "INR",
        countryCode:    l.countryCode    || "IN",
        gstType:        l.gstType        || null,
        registrationType: l.registrationType || null,
      })),
      vouchers: vouchers.map((v) => ({
        voucherNumber:  v.voucherNumber,
        voucherDate:    v.voucherDate,
        voucherType:    v.voucherType,
        partyName:      v.partyName      || null,
        narration:      v.narration      || null,
        netAmount:      v.netAmount      || 0,
        gstin:          v.gstin          || null,
        referenceNo:    v.referenceNo    || null,
        placeOfSupply:  v.placeOfSupply  || null,
        isGstInvoice:   v.isGstInvoice   || false,
        ledgerEntries:  (v.ledgerEntries || []).map((e) => ({
          ledgerName:      e.ledgerName,
          amount:          e.amount,
          isDeemedPositive: e.isDeemedPositive,
          gstAmount:       e.gstAmount || null,
          taxType:         e.taxType   || null,
        })),
        inventoryEntries: (v.inventoryEntries || []).map((i) => ({
          itemName:  i.itemName,
          qty:       i.qty,
          rate:      i.rate,
          amount:    i.amount,
          unit:      i.unit || null,
          godown:    i.godown || null,
        })),
      })),
      stockItems: items.map((i) => ({
        name:         i.name,
        group:        i.group        || null,
        category:     i.category     || null,
        baseUnit:     i.baseUnit     || null,
        openingQty:   i.openingQty   || 0,
        openingValue: i.openingValue || 0,
        closingQty:   i.closingQty   || 0,
        closingValue: i.closingValue || 0,
        rate:         i.rate         || 0,
        hsn:          i.hsn          || null,
        gstRate:      i.gstRate      || null,
        taxability:   i.taxability   || null,
        description:  i.description  || null,
        partNumber:   i.partNumber   || null,
      })),
    },
    savedToDb: true,
    dbTable:   "all",
  };

  return pushToBtp(payload);
}

// ── Notify dashboard backend after successful CPI push ───────────────────────
// Called automatically from the BTP push handlers to register the CPI message GUID.
export async function pushToDashboard({ dataType,
    company,
    totalRecords,
    summary,
    data,
    syncId,
    cpiDataStoreId }) {
  const dashboardUrl = config.dashboardUrl;
  if (!dashboardUrl) {
    logger.warn("Dashboard push skipped — DASHBOARD_URL not configured");
    return null;
  }

  const pathMap = {
    ledgers:    "/api/push/ledgers",
    vouchers:   "/api/push/vouchers",
    stockItems: "/api/push/stock-items",
  };
  const path = pathMap[dataType] || "/api/push";
  const url = `${dashboardUrl.replace(/\/+$/, "")}${path}`;

const body = {
    syncId: syncId || `auto-${Date.now()}`,
    cpiMessageId: syncId || null,
    cpiDataStoreId: cpiDataStoreId || null,
    cpiPushDate: new Date().toUTCString(),
    company,
    dataType: dataType.charAt(0).toUpperCase() + dataType.slice(1),
    totalRecords,
    timestamp: istTimestamp(),
    summary: summary || {},
    data: data || [],
};
  if (!pathMap[dataType]) {
    body.dataType = dataType;
  }

  try {
    const res = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15_000,
    });
    logger.success(`Dashboard notified: ${dataType} (syncId=${body.syncId})`);
    return res.data;
  } catch (err) {
    logger.warn(`Dashboard push failed (${dataType}) — dashboard may be offline`, {
      url,
      error: err.message,
    });
    return null;
  }
}

// ── Push middleware check report to BTP ───────────────────────────────────────
export async function pushMiddlewareCheckToBtp(report) {
  return pushToBtp({
    source:      "tally-middleware",
    dataType:    "checkReport",
    company:     report.company,
    timestamp:   istTimestamp(),
    totalRecords: 1,
    status:      report.status,
    readyToSync: report.readyToSync,
    summary:     report.summary,
    checks: {
      ping:       { status: report.checks?.ping?.status,       latencyMs: report.checks?.ping?.latencyMs },
      companies:  { status: report.checks?.companies?.status,  count: report.checks?.companies?.count },
      ledgers:    { status: report.checks?.ledgers?.status,    count: report.checks?.ledgers?.count },
      vouchers:   { status: report.checks?.vouchers?.status,   count: report.checks?.vouchers?.count },
      stockItems: { status: report.checks?.stockItems?.status, count: report.checks?.stockItems?.count },
    },
  });
}