const axios = require('axios');
const xml2js = require('xml2js');
const { escapeXml, val, parseTallyAmount } = require('./helpers');

function buildCollectionXml(collectionName, type, fetch, companyName) {
  const companyTag = companyName
    ? `<SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>`
    : "";
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export Data</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>${collectionName}</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    ${companyTag}
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="${collectionName}">
      <TYPE>${type}</TYPE>
      <FETCH>${fetch}</FETCH>
     </COLLECTION>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

async function fetchFromTally(xml) {
  try {
    const response = await axios.post('http://localhost:9000', xml, {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 120000
    });
    return response.data;
  } catch (err) {
    throw new Error(`Failed to connect to Tally on port 9000. Ensure Tally is running and HTTP server is enabled.`);
  }
}

async function parseXml(raw) {
  return xml2js.parseStringPromise(raw, { explicitArray: true });
}

async function fetchCompanies() {
  const xml = buildCollectionXml("Company Collection", "Company", "NAME");
  const raw = await fetchFromTally(xml);
  const parsed = await parseXml(raw);
  return parsed?.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.COLLECTION?.[0]?.COMPANY || [];
}

async function fetchAllDetailedData(companyName) {
  const results = { company: companyName, ledgers: [], stockItems: [], vouchers: [] };

  // Ledgers
  console.log(`  Fetching ledgers for ${companyName}...`);
  const ledgerXml = buildCollectionXml("Ledger Collection", "Ledger", "NAME,PARENT,OPENINGBALANCE,CLOSINGBALANCE,LEDGERPHONE,EMAIL,INCOMETAXNUMBER,GSTIN.LIST,STATENAME", companyName);
  const ledgerRaw = await fetchFromTally(ledgerXml);
  const ledgerParsed = await parseXml(ledgerRaw);
  const lRaw = ledgerParsed?.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.COLLECTION?.[0]?.LEDGER || [];
  results.ledgers = lRaw.map(l => ({
    name: val(l.NAME),
    parentGroup: val(l.PARENT),
    type: val(l.ISBILLWISEON) === "Yes" ? "Party" : "General",
    openingBalance: parseTallyAmount(val(l.OPENINGBALANCE)),
    closingBalance: parseTallyAmount(val(l.CLOSINGBALANCE)),
    phone: val(l.LEDGERPHONE),
    email: val(l.EMAIL),
    pan: val(l.INCOMETAXNUMBER),
    gstin: l["GSTIN.LIST"]?.[0]?.GSTIN?.[0] || null
  }));
  console.log(`  ✓ ${results.ledgers.length} ledgers fetched`);

  // Stock Items
  console.log(`  Fetching stock items...`);
  const stockXml = buildCollectionXml("StockItemCollection", "Stock Item", "NAME,PARENT,CATEGORY,BASEUNITS,OPENINGBALANCE,CLOSINGBALANCE,OPENINGVALUE,CLOSINGVALUE", companyName);
  const stockRaw = await fetchFromTally(stockXml);
  const stockParsed = await parseXml(stockRaw);
  const sRaw = stockParsed?.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.COLLECTION?.[0]?.['STOCK-ITEM'] || 
               stockParsed?.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.COLLECTION?.[0]?.STOCKITEM || [];
  results.stockItems = sRaw.map(s => ({
    name: val(s.NAME),
    group: val(s.PARENT),
    category: val(s.CATEGORY),
    baseUnit: val(s.BASEUNITS),
    openingQty: parseTallyAmount(val(s.OPENINGBALANCE)),
    closingQty: parseTallyAmount(val(s.CLOSINGBALANCE)),
    openingValue: parseTallyAmount(val(s.OPENINGVALUE)),
    closingValue: parseTallyAmount(val(s.CLOSINGVALUE))
  }));
  console.log(`  ✓ ${results.stockItems.length} stock items fetched`);

  // Vouchers
  console.log(`  Fetching vouchers...`);
  const voucherXml = buildCollectionXml("VoucherCollection", "Voucher", "GUID,DATE,VOUCHERTYPENAME,VOUCHERNUMBER,PARTYLEDGERNAME,NARRATION,ALLLEDGERENTRIES.LIST", companyName);
  const voucherRaw = await fetchFromTally(voucherXml);
  const voucherParsed = await parseXml(voucherRaw);
  const vRaw = voucherParsed?.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.COLLECTION?.[0]?.VOUCHER || [];
  results.vouchers = vRaw.map(v => {
    const entries = v["ALLLEDGERENTRIES.LIST"] || [];
    let netAmount = 0;
    const ledgerEntries = entries.map(e => {
      const amt = parseTallyAmount(val(e.AMOUNT));
      const isPos = val(e.ISDEEMEDPOSITIVE) === "Yes";
      if (isPos) netAmount += amt;
      return {
        ledgerName: val(e.ledgerName || e.LEDGERNAME),
        amount: amt,
        isDeemedPositive: isPos
      };
    });

    return {
      voucherNumber: val(v.VOUCHERNUMBER),
      voucherDate: val(v.DATE),
      voucherType: val(v.VOUCHERTYPENAME),
      partyName: val(v.PARTYLEDGERNAME),
      narration: val(v.NARRATION),
      netAmount,
      ledgerEntries
    };
  });
  console.log(`  ✓ ${results.vouchers.length} vouchers fetched`);

  return results;
}

module.exports = {
  fetchCompanies,
  fetchAllDetailedData
};
