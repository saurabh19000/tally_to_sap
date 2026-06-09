const fs = require('fs');
const path = require('path');
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
      }
    });
  }
} catch (e) {
  // Silent fail if .env cannot be read
}

const readline = require('readline');
const axios = require('axios');
const { execSync } = require('child_process');
const os = require('os');
const { val } = require('./src/helpers');

function fileDialog(mode) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      const tmp = path.join(os.tmpdir(), 'fd_' + Date.now() + '.ps1');
      const script = mode === 'open'
        ? `Add-Type -AssemblyName System.Windows.Forms; $f=New-Object System.Windows.Forms.OpenFileDialog; $f.Filter='Credential Files (*.txt)|*.txt|PEM Files (*.pem)|*.pem|All Files (*.*)|*.*'; $f.Title='Select BTP Credentials File'; if($f.ShowDialog() -eq 'OK'){Write-Output $f.FileName}`
        : `Add-Type -AssemblyName System.Windows.Forms; $f=New-Object System.Windows.Forms.SaveFileDialog; $f.Filter='Credential Files (*.txt)|*.txt|PEM Files (*.pem)|*.pem|All Files (*.*)|*.*'; $f.Title='Save BTP Credentials'; $f.FileName='btp-credentials.txt'; if($f.ShowDialog() -eq 'OK'){Write-Output $f.FileName}`;
      fs.writeFileSync(tmp, script, 'utf8');
      const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmp}"`, { encoding: 'utf8', timeout: 30000 }).trim();
      try { fs.unlinkSync(tmp); } catch {}
      return out || null;
    }
    if (platform === 'darwin') {
      const script = mode === 'open'
        ? `osascript -e 'set f to choose file with prompt "Select BTP Credentials File"' -e 'if f is not "" then POSIX path of f' 2>/dev/null`
        : `osascript -e 'set f to choose file name default name "btp-credentials.txt" with prompt "Save BTP Credentials"' -e 'if f is not "" then POSIX path of f' 2>/dev/null`;
      const out = execSync(script, { encoding: 'utf8', timeout: 30000, shell: true }).trim();
      return out || null;
    }
    if (platform === 'linux') {
      const cmd = mode === 'open'
        ? `zenity --file-selection --title="Select BTP Credentials File" --file-filter="*.txt *.pem" 2>/dev/null`
        : `zenity --file-selection --save --title="Save BTP Credentials" --filename="btp-credentials.txt" --file-filter="*.txt *.pem" 2>/dev/null`;
      const out = execSync(cmd, { encoding: 'utf8', timeout: 30000, shell: true }).trim();
      return out || null;
    }
  } catch {}
  return null;
}
const { fetchCompanies, fetchAllDetailedData } = require('./src/tallyClient');
const { pushAllToBtpMethod } = require('./src/btpClient');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function waitAndExit(code) {
  await askQuestion('\nPress Enter to exit...');
  process.exit(code);
}

// --- Global Config Store ---
let config = {
  btp: {
    clientId: '',
    clientSecret: '',
    tokenUrl: '',
    runtimeUrl: ''
  }
};

// --- External License API Configuration ---
const LICENSE_API_BASE_URL = process.env.LICENSE_API_BASE_URL || 'https://license-system-v6ht.onrender.com';
const LICENSE_API_KEY = process.env.LICENSE_API_KEY || 'my-secret-key-123';
const PRODUCT_ID = process.env.PRODUCT_ID || '6a23c744247319b4b7bf702a';

async function main() {
  console.log('--- Middleware Agent ---');

  let email = '';
  let activeLicense = null;

  while (true) {
    email = await askQuestion('\nEnter Email: ');
    if (!email) {
      console.log('Error: Email is required.');
      continue;
    }
    if (!email.includes('@') || !email.toLowerCase().endsWith('.com')) {
      console.log('Error: Invalid email. Email must contain "@" and end with ".com"');
      continue;
    }

    console.log(`\nVerifying email: ${email} ...`);
    try {
      const url = `${LICENSE_API_BASE_URL}/api/external/actve-license/${encodeURIComponent(email)}?productId=${PRODUCT_ID}`;
      
      const authRes = await axios.get(url, {
        headers: { 'x-api-key': LICENSE_API_KEY }
      });

      activeLicense = authRes.data?.activeLicense;
      
      if (activeLicense && activeLicense.status === 'active') {
        const planName = activeLicense.licenseTypeId?.name || 'Active';
        console.log(`\nSuccess! You have a valid ${planName} plan.`);
        
        if (activeLicense.endDate) {
          console.log(`End Date: ${new Date(activeLicense.endDate).toLocaleDateString()}`);
        }
        
        console.log(`You have access to use this feature till the end of your license. After that, we can't use this.`);

        console.log('\n--- Password Verification ---');
        let passwordVerified = false;
        while (!passwordVerified) {
          const password = await askQuestion('Enter Password: ');
          if (!password) {
            console.log('Error: Password is required.');
            continue;
          }

          console.log('Verifying password...');
          try {
            const pwdRes = await axios.post(
              'https://license-system-v6ht.onrender.com/api/external/customer-login',
              { email, password },
              { headers: { 'x-api-key': LICENSE_API_KEY } }
            );

            if (pwdRes.data?.success) {
              console.log('Password verified successfully!');
              passwordVerified = true;
            } else {
              console.log('Error: Incorrect password. Please try again.');
            }
          } catch (err) {
            const msg = err.response?.data?.message || err.message;
            console.log(`Error: Password verification failed: ${msg}`);
          }
        }

        break; // Break out of the authentication loop to proceed with the agent
      } else {
        console.log('\nError: Your license is not active. Please upgrade your plan to use this feature or try another email.');
        // Loop continues
      }
      
    } catch (err) {
      if (err.response) {
        if (err.response.status === 404) {
          console.log("\nWarning: This user don't exist in our database please check the email and retry.");
        } else if (err.response.status === 403) {
          console.log('\nError: You dont have valid license plz upgrade to the plan to use this feature.');
        } else {
          console.log(`\nError verifying license: ${err.response.data.message || err.message}`);
          console.log('Please check your network connection or API URL configuration.');
        }
      } else {
        console.log('\nError verifying license. Please check your network connection or API URL configuration.');
      }
      // Loop continues, allowing the user to retry
    }
  }

  console.log('\n--- BTP Configuration ---');

  const loadChoice = await askQuestion('Load credentials from a file? (y/N): ');
  if (loadChoice.trim().toLowerCase() === 'y') {
    try {
      const filePath = fileDialog('open');
      if (filePath) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const creds = {};
        const keyMap = { BTP_CLIENT_ID:'clientId', BTP_CLIENT_SECRET:'clientSecret', BTP_TOKEN_URL:'tokenUrl', BTP_RUNTIME_URL:'runtimeUrl' };
        raw.split('\n').forEach(line => {
          const m = line.match(/^\s*(BTP_\w+)\s*=\s*(.+)\s*$/);
          if (m && keyMap[m[1]]) creds[keyMap[m[1]]] = m[2].trim();
        });
        if (creds.clientId && creds.clientSecret && creds.tokenUrl && creds.runtimeUrl) {
          config.btp = { clientId: creds.clientId, clientSecret: creds.clientSecret, tokenUrl: creds.tokenUrl, runtimeUrl: creds.runtimeUrl };
          console.log('Credentials loaded successfully!');
        } else {
          console.log('Error: File missing required fields. Enter manually.');
        }
      }
    } catch (e) {
      console.log(`Could not open file dialog: ${e.message}. Enter manually.`);
    }
  }

  if (!config.btp.clientId) {
    while (!config.btp.clientId) {
      config.btp.clientId = await askQuestion('Enter BTP_CLIENT_ID: ');
      if (!config.btp.clientId) console.log('Error: BTP_CLIENT_ID is required.');
    }
    while (!config.btp.clientSecret) {
      config.btp.clientSecret = await askQuestion('Enter BTP_CLIENT_SECRET: ');
      if (!config.btp.clientSecret) console.log('Error: BTP_CLIENT_SECRET is required.');
    }
    while (!config.btp.tokenUrl) {
      config.btp.tokenUrl = await askQuestion('Enter BTP_TOKEN_URL: ');
      if (!config.btp.tokenUrl) console.log('Error: BTP_TOKEN_URL is required.');
    }
    while (!config.btp.runtimeUrl) {
      config.btp.runtimeUrl = await askQuestion('Enter BTP_RUNTIME_URL: ');
      if (!config.btp.runtimeUrl) console.log('Error: BTP_RUNTIME_URL is required.');
    }
    try {
      const savePath = fileDialog('save');
      if (savePath) {
        const content = `BTP_CLIENT_ID=${config.btp.clientId}\nBTP_CLIENT_SECRET=${config.btp.clientSecret}\nBTP_TOKEN_URL=${config.btp.tokenUrl}\nBTP_RUNTIME_URL=${config.btp.runtimeUrl}\n`;
        fs.writeFileSync(savePath, content, 'utf8');
        console.log(`\nCredentials saved to: ${savePath}`);
        console.log('Keep this file safe. Next time, load it to skip manual entry.');
      } else {
        console.log('\nSave cancelled. Credentials not saved to file.');
      }
    } catch (e) {
      console.log(`\nCould not open save dialog: ${e.message}. Credentials not saved.`);
    }
  }

  console.log('\nAuthentication & Configuration Successful!');

  while (true) {
    console.log('\n--- Agent Menu ---');
    console.log('1. Fetch all the data from the tally');
    console.log('2. Exit');
    const choice = await askQuestion('\nChoice: ');

    if (choice === '1') {
      try {
        const companies = await fetchCompanies();
        if (companies.length === 0) {
          console.log('No companies found in Tally.');
          continue;
        }

        // --- Paginated Company Selection ---
        let selectedCompany = null;
        let currentPage = 0;
        const pageSize = 10;
        const totalPages = Math.ceil(companies.length / pageSize);

        while (true) {
          console.log(`\nAvailable Companies (Page ${currentPage + 1} of ${totalPages}):`);
          const start = currentPage * pageSize;
          const end = Math.min(start + pageSize, companies.length);

          for (let i = start; i < end; i++) {
            console.log(`${i + 1}. ${val(companies[i].NAME)}`);
          }

          let promptMsg = `\nSelect a company (${start + 1}-${end})`;
          if (totalPages > 1) {
            if (currentPage < totalPages - 1) promptMsg += `, [N]ext`;
            if (currentPage > 0) promptMsg += `, [P]revious`;
          }
          promptMsg += `, [A]ll, or [C]ancel: `;

          const compChoice = (await askQuestion(promptMsg)).trim().toLowerCase();

          if (compChoice === 'c') {
            break; // Cancel selection
          } else if (compChoice === 'n' && currentPage < totalPages - 1) {
            currentPage++;
            continue;
          } else if (compChoice === 'p' && currentPage > 0) {
            currentPage--;
            continue;
          } else if (compChoice === 'a') {
            const confirm = (await askQuestion(`\nPush data for ALL ${companies.length} companies? (y/N): `)).trim().toLowerCase();
            if (confirm !== 'y') {
              console.log('Cancelled.');
              continue;
            }
            for (const company of companies) {
              const name = val(company.NAME);
              console.log(`\n--- Processing: ${name} ---`);
              try {
                const data = await fetchAllDetailedData(name);
                if (data) {
                  const total = data.ledgers.length + data.vouchers.length + data.stockItems.length;
                  console.log(`Fetched ${total} records: ${data.ledgers.length} ledgers, ${data.vouchers.length} vouchers, ${data.stockItems.length} stock items`);
                  console.log('Syncing...');
                  await pushAllToBtpMethod(data.ledgers, data.vouchers, data.stockItems, data.company, config.btp);
                  console.log(`✓ Successfully pushed ${name}\n`);
                }
              } catch (e) {
                console.error(`✗ Failed for ${name}: ${e.message}\n`);
              }
            }
            console.log('All companies processed!');
            continue;
          }

          const index = parseInt(compChoice) - 1;
          if (!isNaN(index) && index >= 0 && index < companies.length) {
            selectedCompany = val(companies[index].NAME);
            break;
          } else {
            console.log('Invalid selection. Please try again.');
          }
        }

        if (!selectedCompany) {
          continue; // User cancelled or failed selection
        }

        const data = await fetchAllDetailedData(selectedCompany);

        if (data) {
          const total = data.ledgers.length + data.vouchers.length + data.stockItems.length;
          console.log(`\nFetched ${total} records: ${data.ledgers.length} ledgers, ${data.vouchers.length} vouchers, ${data.stockItems.length} stock items`);
          console.log('\n1. Push to SAP BTP');
          console.log('2. Cancel');
          const pushChoice = await askQuestion('\nChoice: ');
          if (pushChoice === '1') {
            console.log('Syncing...');
            try {
              await pushAllToBtpMethod(data.ledgers, data.vouchers, data.stockItems, data.company, config.btp);
              console.log('Success! Data pushed to SAP BTP.');
            } catch (e) { console.error('Failed:', e.message); }
          }
        }
      } catch (err) {
        console.error('Error:', err.message);
      }
    } else if (choice === '2') {
      await waitAndExit(0);
    }
  }
}

main().catch(async err => { 
  console.error(err); 
  await askQuestion('\nPress Enter to exit...');
  process.exit(1); 
});
