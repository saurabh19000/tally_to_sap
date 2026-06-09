const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tallyapp",
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        token_url TEXT NOT NULL,
        cpi_api_base TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[db] Database initialized (user_credentials table ready).");
  } finally {
    client.release();
  }
}

async function saveCredentials(email, creds) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO user_credentials (email, client_id, client_secret, token_url, cpi_api_base)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email)
       DO UPDATE SET client_id = $2, client_secret = $3, token_url = $4, cpi_api_base = $5, updated_at = NOW()`,
      [email, creds.clientId, creds.clientSecret, creds.tokenUrl, creds.cpiApiBase]
    );
    return true;
  } finally {
    client.release();
  }
}

async function getCredentials(email) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT client_id, client_secret, token_url, cpi_api_base FROM user_credentials WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      clientId: row.client_id,
      clientSecret: row.client_secret,
      tokenUrl: row.token_url,
      cpiApiBase: row.cpi_api_base,
    };
  } finally {
    client.release();
  }
}

module.exports = { initDb, saveCredentials, getCredentials, pool };
