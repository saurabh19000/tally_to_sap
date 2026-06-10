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

  try {
    const res = await axios.post(`${BACKEND_URL}/api/btp/push/all`, payload, {
      timeout: 300000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: { 'Content-Type': 'application/json' }
    });

    log('Backend API responded successfully.');
    
    if (res.data && res.data.ok === false) {
      const errors = res.data.errors || res.data.results?.errors;
      const errorMsg = Array.isArray(errors) && errors.length > 0 
        ? errors.join(', ') 
        : (res.data.error || res.data.results?.error || 'Unknown backend error');
      throw new Error(`Push Failed: ${errorMsg}`);
    }

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
