// DKK Intake Server — Port 3333
// Square API integration — listens for intake form submissions
// Uses ONLY DDK credentials from environment

import { createServer } from 'node:http';

const PORT = 3333;
const ADDRESS = '0.0.0.0';

// DDK credentials only — no BTC tokens anywhere
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_API_VERSION = process.env.SQUARE_API_VERSION || '2025-06-03';
const DKK_LOCATION_ID = process.env.DKK_LOCATION_ID || '';

function log(msg) {
  console.log(`[DKK-INTAKE] ${msg}`);
}

if (!SQUARE_TOKEN) {
  console.error('ERROR: SQUARE_ACCESS_TOKEN not set. Set it in your shell before starting:');
  console.error('  export SQUARE_ACCESS_TOKEN="your-token-here"');
  process.exit(1);
}
if (!DKK_LOCATION_ID) {
  console.error('ERROR: DKK_LOCATION_ID not set. Set it in your shell before starting:');
  console.error('  export DKK_LOCATION_ID="L8XCP3V5E186Y"');
  process.exit(1);
}

async function squareFetch(path, options = {}) {
  const url = `https://connect.squareup.com${path}`;
  log(`API call: ${options.method || 'GET'} ${path}`);

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SQUARE_TOKEN}`,
      'Square-Version': SQUARE_API_VERSION,
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  log(`API response: ${response.status} ${text.substring(0, 300)}`);

  return { success: response.ok, status: response.status, body: json, text };
}

function formatPhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }
  return `+1${digits}`;
}

function buildCustomerName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  return {
    given_name: parts.shift() || 'New',
    family_name: parts.join(' ') || 'Student',
  };
}

async function findCustomerByEmail(email) {
  if (!email) return null;
  const result = await squareFetch(`/v2/customers?email=${encodeURIComponent(email)}`);
  if (!result.success) return null;
  return result.body?.customers?.[0] || null;
}

async function createCustomer(data) {
  const customer = buildCustomerName(data.parentName || data.name || '');
  if (data.parentEmail) customer.email_address = data.parentEmail;
  if (data.parentPhone) {
    customer.phone_number = formatPhone(data.parentPhone);
  }
  log(`Creating customer: ${JSON.stringify(customer)}`);
  return squareFetch('/v2/customers', { method: 'POST', body: customer });
}

async function updateCustomer(customerId, data) {
  const customer = buildCustomerName(data.parentName || data.name || '');
  if (data.parentEmail) customer.email_address = data.parentEmail;
  if (data.parentPhone) {
    customer.phone_number = formatPhone(data.parentPhone);
  }
  log(`Updating customer ${customerId}: ${JSON.stringify(customer)}`);
  return squareFetch(`/v2/customers/${encodeURIComponent(customerId)}`, {
    method: 'PUT',
    body: customer,
  });
}

async function updateCustomerNote(customerId, notesObj) {
  log(`Saving note for ${customerId}: ${JSON.stringify(notesObj)}`);
  return squareFetch(`/v2/customers/${encodeURIComponent(customerId)}`, {
    method: 'PUT',
    body: { note: JSON.stringify(notesObj) },
  });
}

async function handleIntake(data) {
  log(`Received intake: ${JSON.stringify({ parentName: data.parentName || data.name, parentEmail: data.parentEmail })}`);

  if (!data.parentEmail) {
    return { success: false, error: 'Missing parent email' };
  }

  const existing = await findCustomerByEmail(data.parentEmail);

  let customerResult;
  if (existing) {
    customerResult = await updateCustomer(existing.id, data);
  } else {
    customerResult = await createCustomer(data);
  }

  if (!customerResult.success) return customerResult;

  const customerId = customerResult.body?.customer?.id;
  if (!customerId) {
    return { success: false, error: 'No customer ID returned' };
  }

  const noteData = {
    studentCount: data.studentCount || 1,
    studentNames: data.studentNames || '',
    trainingFreq: data.trainingFreq || '',
    referral: data.referral || '',
    timestamp: data.timestamp || new Date().toISOString(),
    source: 'intake-form',
    locationId: DKK_LOCATION_ID,
  };

  const noteResult = await updateCustomerNote(customerId, noteData);
  if (!noteResult.success) return noteResult;

  return {
    success: true,
    action: existing ? 'updated' : 'created',
    customerId,
  };
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/intake') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await handleIntake(data);
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      locationId: DKK_LOCATION_ID,
      tokenSet: !!SQUARE_TOKEN,
      version: '1.0',
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, ADDRESS, () => {
  console.log(`DKK intake server listening on ${ADDRESS}:${PORT}`);
  console.log(`SQUARE_ACCESS_TOKEN: ${SQUARE_TOKEN ? '***SET***' : 'NOT SET'}`);
  console.log(`DKK_LOCATION_ID: ${DKK_LOCATION_ID}`);
  console.log(`SQUARE_API_VERSION: ${SQUARE_API_VERSION}`);
});
