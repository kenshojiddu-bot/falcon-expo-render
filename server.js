import express from 'express';
import pg from 'pg';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.FALCON_DATA_DIR || '/tmp/falcon-expo';
const submissionsFile = path.join(dataDir, 'applications.json');
const salonSubmissionsFile = path.join(dataDir, 'salon-registrations.json');
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    })
  : null;
const adminPassword = process.env.ADMIN_PASSWORD || '';
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || '';
const adminCookieName = 'falcon_admin_session';
const adminSessionDurationMs = 8 * 60 * 60 * 1000;
const adminAttemptWindowMs = 15 * 60 * 1000;
const adminMaxAttempts = 5;
const adminLoginAttempts = new Map();

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const requiredFields = ['company', 'contact', 'phone', 'role', 'category', 'booth'];
const salonRequiredFields = ['name', 'phone', 'company', 'role', 'topic'];

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function cleanValue(value) {
  return String(value ?? '').trim().slice(0, 2000);
}

function constantTimeEqual(left, right) {
  const leftHash = createHash('sha256').update(String(left)).digest();
  const rightHash = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function adminConfigured() {
  return Boolean(adminPassword && adminSessionSecret);
}

function requestIp(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || request.ip || request.socket.remoteAddress || 'unknown';
}

function activeLoginAttempt(ip, now = Date.now()) {
  const attempt = adminLoginAttempts.get(ip);
  if (!attempt || attempt.resetAt <= now) {
    adminLoginAttempts.delete(ip);
    return null;
  }
  return attempt;
}

function recordFailedLogin(ip, now = Date.now()) {
  const current = activeLoginAttempt(ip, now);
  adminLoginAttempts.set(ip, current
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt: now + adminAttemptWindowMs });
}

function sessionToken(expiresAt) {
  const payload = String(expiresAt);
  const signature = createHmac('sha256', adminSessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        return separator === -1
          ? [part, '']
          : [part.slice(0, separator), part.slice(separator + 1)];
      })
  );
}

function validAdminSession(request) {
  if (!adminConfigured()) return false;
  const token = parseCookies(request)[adminCookieName];
  if (!token) return false;
  const separator = token.indexOf('.');
  if (separator === -1) return false;
  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expected = createHmac('sha256', adminSessionSecret)
    .update(String(expiresAt))
    .digest('base64url');
  return constantTimeEqual(signature, expected);
}

function adminCookie(request, value, maxAgeSeconds) {
  const secure = request.secure || request.headers['x-forwarded-proto'] === 'https';
  return [
    `${adminCookieName}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : [])
  ].join('; ');
}

function requireAdmin(request, response, next) {
  response.set('Cache-Control', 'no-store');
  if (!adminConfigured()) {
    response.status(503).json({ ok: false, error: 'admin_not_configured' });
    return;
  }
  if (!validAdminSession(request)) {
    response.status(401).json({ ok: false, error: 'authentication_required' });
    return;
  }
  next();
}

function normalizeApplication(body) {
  const application = {
    id: `FHE-${Date.now()}-${randomUUID().slice(0, 8)}`,
    submittedAt: new Date().toISOString(),
    company: cleanValue(body.company),
    contact: cleanValue(body.contact),
    phone: cleanValue(body.phone),
    email: cleanValue(body.email),
    city: cleanValue(body.city),
    role: cleanValue(body.role),
    category: cleanValue(body.category),
    booth: cleanValue(body.booth),
    needs: cleanValue(body.needs),
    note: cleanValue(body.note),
    source: 'render-web-service'
  };

  const missing = requiredFields.filter((field) => !application[field]);
  return { application, missing };
}

function normalizeSalonRegistration(body) {
  const registration = {
    id: `SALON-${Date.now()}-${randomUUID().slice(0, 8)}`,
    submittedAt: new Date().toISOString(),
    name: cleanValue(body.name),
    company: cleanValue(body.company),
    role: cleanValue(body.role),
    phone: cleanValue(body.phone),
    email: cleanValue(body.email),
    city: cleanValue(body.city),
    topic: cleanValue(body.topic),
    interest: cleanValue(body.interest),
    note: cleanValue(body.note),
    source: 'render-web-service'
  };

  const missing = salonRequiredFields.filter((field) => !registration[field]);
  return { registration, missing };
}

async function readApplications() {
  try {
    return JSON.parse(await readFile(submissionsFile, 'utf8'));
  } catch {
    return [];
  }
}

async function readSalonRegistrations() {
  try {
    return JSON.parse(await readFile(salonSubmissionsFile, 'utf8'));
  } catch {
    return [];
  }
}

async function ensureApplicationsTable() {
  await pool.query(`
    create table if not exists falcon_applications (
      id text primary key,
      submitted_at timestamptz not null,
      company text not null,
      contact text not null,
      phone text not null,
      email text,
      city text,
      role text not null,
      category text not null,
      booth text not null,
      needs text,
      note text,
      source text not null,
      raw_json jsonb not null
    )
  `);
}

async function ensureSalonRegistrationsTable() {
  await pool.query(`
    create table if not exists salon_registrations (
      id text primary key,
      submitted_at timestamptz not null,
      name text not null,
      company text not null,
      role text not null,
      phone text not null,
      email text,
      city text,
      topic text not null,
      interest text,
      note text,
      source text not null,
      raw_json jsonb not null
    )
  `);
}

async function saveApplication(application) {
  if (pool) {
    await ensureApplicationsTable();
    await pool.query(
      `
        insert into falcon_applications (
          id, submitted_at, company, contact, phone, email, city, role,
          category, booth, needs, note, source, raw_json
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        application.id,
        application.submittedAt,
        application.company,
        application.contact,
        application.phone,
        application.email,
        application.city,
        application.role,
        application.category,
        application.booth,
        application.needs,
        application.note,
        application.source,
        application
      ]
    );
    return;
  }

  await mkdir(dataDir, { recursive: true });
  const applications = await readApplications();
  applications.unshift(application);
  await writeFile(submissionsFile, JSON.stringify(applications, null, 2));
}

async function saveSalonRegistration(registration) {
  if (pool) {
    await ensureSalonRegistrationsTable();
    await pool.query(
      `
        insert into salon_registrations (
          id, submitted_at, name, company, role, phone, email, city,
          topic, interest, note, source, raw_json
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        registration.id,
        registration.submittedAt,
        registration.name,
        registration.company,
        registration.role,
        registration.phone,
        registration.email,
        registration.city,
        registration.topic,
        registration.interest,
        registration.note,
        registration.source,
        registration
      ]
    );
    return;
  }

  await mkdir(dataDir, { recursive: true });
  const registrations = await readSalonRegistrations();
  registrations.unshift(registration);
  await writeFile(salonSubmissionsFile, JSON.stringify(registrations, null, 2));
}

function adminExpoRecord(application) {
  return {
    type: 'expo',
    id: application.id,
    submittedAt: application.submittedAt,
    company: application.company,
    name: application.contact,
    phone: application.phone,
    email: application.email || '',
    city: application.city || '',
    role: application.role,
    summary: application.category,
    details: {
      category: application.category,
      booth: application.booth,
      needs: application.needs || '',
      note: application.note || ''
    }
  };
}

function adminSalonRecord(registration) {
  return {
    type: 'salon',
    id: registration.id,
    submittedAt: registration.submittedAt,
    company: registration.company,
    name: registration.name,
    phone: registration.phone,
    email: registration.email || '',
    city: registration.city || '',
    role: registration.role,
    summary: registration.topic,
    details: {
      topic: registration.topic,
      interest: registration.interest || '',
      note: registration.note || ''
    }
  };
}

async function loadAdminApplications() {
  if (!pool) return (await readApplications()).map(adminExpoRecord);
  await ensureApplicationsTable();
  const result = await pool.query(`
    select
      id,
      submitted_at as "submittedAt",
      company,
      contact,
      phone,
      email,
      city,
      role,
      category,
      booth,
      needs,
      note
    from falcon_applications
    order by submitted_at desc
  `);
  return result.rows.map(adminExpoRecord);
}

async function loadAdminSalonRegistrations() {
  if (!pool) return (await readSalonRegistrations()).map(adminSalonRecord);
  await ensureSalonRegistrationsTable();
  const result = await pool.query(`
    select
      id,
      submitted_at as "submittedAt",
      name,
      company,
      role,
      phone,
      email,
      city,
      topic,
      interest,
      note
    from salon_registrations
    order by submitted_at desc
  `);
  return result.rows.map(adminSalonRecord);
}

async function loadAdminSubmissions() {
  const [applications, registrations] = await Promise.all([
    loadAdminApplications(),
    loadAdminSalonRegistrations()
  ]);
  return [...applications, ...registrations].sort(
    (left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt)
  );
}

app.post('/api/admin/login', (request, response) => {
  response.set('Cache-Control', 'no-store');
  if (!adminConfigured()) {
    response.status(503).json({ ok: false, error: 'admin_not_configured' });
    return;
  }

  const ip = requestIp(request);
  const attempt = activeLoginAttempt(ip);
  if (attempt?.count >= adminMaxAttempts) {
    response.status(429).json({ ok: false, error: 'too_many_attempts' });
    return;
  }

  if (!constantTimeEqual(cleanValue(request.body.password), adminPassword)) {
    recordFailedLogin(ip);
    response.status(401).json({ ok: false, error: 'invalid_credentials' });
    return;
  }

  adminLoginAttempts.delete(ip);
  const expiresAt = Date.now() + adminSessionDurationMs;
  response.set('Set-Cookie', adminCookie(
    request,
    sessionToken(expiresAt),
    Math.floor(adminSessionDurationMs / 1000)
  ));
  response.json({ ok: true });
});

app.post('/api/admin/logout', (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.set('Set-Cookie', adminCookie(request, '', 0));
  response.json({ ok: true });
});

app.get('/api/admin/submissions', requireAdmin, asyncRoute(async (_request, response) => {
  response.json({ ok: true, submissions: await loadAdminSubmissions() });
}));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'falcon-expo-render' });
});

app.post('/api/applications', asyncRoute(async (request, response) => {
  const { application, missing } = normalizeApplication(request.body);
  if (missing.length) {
    response.status(400).json({ ok: false, error: 'missing_required_fields', missing });
    return;
  }

  await saveApplication(application);
  response.status(201).json({ ok: true, applicationId: application.id });
}));

app.get('/api/salon-health', (_request, response) => {
  response.json({ ok: true, service: 'falcon-expo-salon' });
});

app.post('/api/salon-registrations', asyncRoute(async (request, response) => {
  const { registration, missing } = normalizeSalonRegistration(request.body);
  if (missing.length) {
    response.status(400).json({ ok: false, error: 'missing_required_fields', missing });
    return;
  }

  await saveSalonRegistration(registration);
  response.status(201).json({ ok: true, registrationId: registration.id });
}));

app.use('/api', (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const status = Number(error.status || error.statusCode);
  if (status >= 400 && status < 500) {
    response.status(status).json({ ok: false, error: 'invalid_request' });
    return;
  }
  console.error(`API persistence failed for ${request.path}: ${error.message}`);
  response.status(503).json({ ok: false, error: 'submission_unavailable' });
});

app.get('/admin', (_request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Falcon expo server listening on ${port}`);
});
