import axios from "axios";

const BASE = "http://localhost:4000/api";

async function fetchCount(url) {
  const res = await axios.get(url);
  return res.data.count;
}

const company = "Rajlaxmi Solutions Private Limited - (From 1-Apr-2016)";
const companyEnc = encodeURIComponent(company);

console.log("=== FETCHING COUNTS FROM TALLY ===\n");

console.log("--- Masters ---");
const ledgers = await fetchCount(`${BASE}/tally/ledgers?company=${companyEnc}`);
console.log(`Ledgers: ${ledgers}`);

// Groups
const groupsRes = await axios.get(`${BASE}/tally/ping`);
const groups = groupsRes.data?.latencyMs; // Just a placeholder, need separate call
// Actually need to call tallyClient functions directly

// Voucher Types - need direct function call
// Stock Items
const stockItems = await fetchCount(`${BASE}/tally/stock?company=${companyEnc}`);
console.log(`Stock Items: ${stockItems}`);

console.log("\n--- Vouchers by Year ---");

const years = [
  ["2016-04-01", "2017-03-31", "2016-17"],
  ["2017-04-01", "2018-03-31", "2017-18"],
  ["2018-04-01", "2019-03-31", "2018-19"],
  ["2019-04-01", "2020-03-31", "2019-20"],
  ["2020-04-01", "2021-03-31", "2020-21"],
  ["2021-04-01", "2022-03-31", "2021-22"],
  ["2022-04-01", "2023-03-31", "2022-23"],
  ["2023-04-01", "2024-03-31", "2023-24"],
  ["2024-04-01", "2025-03-31", "2024-25"],
  ["2025-04-01", "2026-03-31", "2025-26"],
  ["2026-04-01", "2026-04-09", "2026-27"],
];

let totalVouchers = 0;
for (const [from, to, label] of years) {
  try {
    const res = await axios.get(`${BASE}/tally/vouchers?company=${companyEnc}&from=${from}&to=${to}`);
    const count = res.data.count || 0;
    console.log(`${label}: ${count}`);
    totalVouchers += count;
  } catch (e) {
    console.log(`${label}: ERROR - ${e.message}`);
  }
}

console.log(`\nTOTAL VOUCHERS: ${totalVouchers}`);