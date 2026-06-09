const axios = require('axios');

const BACKEND_URL = 'https://tally-to-sap.onrender.com';

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function pushAllToBtpMethod(ledgers, vouchers, items, company, config) {
  // log('Calling backend API to push data to SAP BTP...');

  const payload = {
    company,
    ledgers,
    vouchers,
    stockItems: items,
    btp: config ? {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenUrl: config.tokenUrl,
      runtimeUrl: config.runtimeUrl
    } : undefined
  };

  const payloadSize = JSON.stringify(payload).length;
  log(`Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

  if (payloadSize > 40 * 1024 * 1024) {
    log('Warning: Payload exceeds 40MB, may hit server limits.');
  }

  try {
    const res = await axios.post(`${BACKEND_URL}/api/btp/push/all`, payload, {
      timeout: 300000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: { 'Content-Type': 'application/json' }
    });

    log('Backend API responded successfully.');
    return res.data;
  } catch (err) {
    const status = err.response?.status ? `(HTTP ${err.response.status})` : '';
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Backend Push Failed ${status}: ${detail}`);
  }
}

module.exports = {
  pushAllToBtpMethod
};
