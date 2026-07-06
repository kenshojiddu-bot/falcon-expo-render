import express from 'express';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.FALCON_DATA_DIR || '/tmp/falcon-expo';
const submissionsFile = path.join(dataDir, 'applications.json');
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    })
  : null;

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const requiredFields = ['company', 'contact', 'phone', 'role', 'category', 'booth'];

function cleanValue(value) {
  return String(value ?? '').trim().slice(0, 2000);
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

async function readApplications() {
  try {
    return JSON.parse(await readFile(submissionsFile, 'utf8'));
  } catch {
    return [];
  }
}

async function saveApplication(application) {
  if (pool) {
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

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'falcon-expo-render' });
});

app.post('/api/applications', async (request, response) => {
  const { application, missing } = normalizeApplication(request.body);
  if (missing.length) {
    response.status(400).json({ ok: false, error: 'missing_required_fields', missing });
    return;
  }

  await saveApplication(application);
  response.status(201).json({ ok: true, applicationId: application.id });
});

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Falcon expo server listening on ${port}`);
});
