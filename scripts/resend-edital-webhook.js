require('dotenv').config();
const { Client } = require('pg');
const https = require('https');
const { URL } = require('url');

(async () => {
  const webhookUrl = process.env.WEBHOOK_N8N_EDITAL_URL;
  if (!webhookUrl) {
    console.error('WEBHOOK_N8N_EDITAL_URL nao configurada');
    process.exit(1);
  }

  const method = (process.env.WEBHOOK_HTTP_METHOD || 'POST').toUpperCase();
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  const subRes = await client.query(`
    SELECT
      s.id,
      s.registration_id,
      s.status,
      s.institution_name,
      s.institution_cnpj,
      s.lab_name,
      s.lab_area,
      s.lab_academic_unit,
      s.lab_structure_description,
      s.main_improvement_objective,
      s.team_description,
      s.technical_justification,
      s.expected_results,
      s.protocol_number,
      s.submitted_at,
      r.full_name,
      r.email,
      r.cpf
    FROM edital_submissions s
    INNER JOIN registrations r ON r.id = s.registration_id
    WHERE s.status = 'SUBMITTED'
    ORDER BY s.submitted_at DESC NULLS LAST, s.id DESC
    LIMIT 1
  `);

  if (subRes.rows.length === 0) {
    console.error('Nenhuma proposta SUBMITTED encontrada');
    await client.end();
    process.exit(1);
  }

  const s = subRes.rows[0];
  const docsRes = await client.query(
    `
      SELECT id, requirement_code
      FROM edital_submission_documents
      WHERE submission_id = $1
      ORDER BY id ASC
    `,
    [s.id]
  );

  const documentLinks = {};
  const photoLinks = [];
  for (const doc of docsRes.rows) {
    const link = `${baseUrl}/api/editais/documento/${doc.id}/link`;
    documentLinks[doc.requirement_code] = link;
    if (doc.requirement_code === '8.1.8') {
      photoLinks.push(link);
    }
  }

  const payload = {
    id: s.id,
    protocolNumber: s.protocol_number ?? String(s.id),
    registrationId: s.registration_id,
    status: 'SUBMITTED',
    fullName: s.full_name,
    email: s.email,
    cpf: s.cpf,
    institutionName: s.institution_name,
    institutionCnpj: s.institution_cnpj,
    labName: s.lab_name,
    labArea: s.lab_area,
    labAcademicUnit: s.lab_academic_unit,
    labStructureDescription: s.lab_structure_description,
    mainImprovementObjective: s.main_improvement_objective,
    teamDescription: s.team_description,
    technicalJustification: s.technical_justification,
    expectedResults: s.expected_results,
    submittedAt: s.submitted_at ? new Date(s.submitted_at).toISOString() : null,
    documentLinks,
    photoLinks,
    communityCertificateUrl: `${baseUrl}/api/editais/certificado/${s.registration_id}/link`,
    adminReviewUrl: `${baseUrl}/admin/editais/${s.id}`,
    source: 'edital-proposta',
  };

  console.log(`Reenviando proposta #${s.id} -> ${method} ${webhookUrl}`);
  console.log('Destinatario:', s.email);
  console.log('Docs:', Object.keys(documentLinks).join(', ') || '(nenhum)');

  const body = JSON.stringify(payload);
  const url = new URL(webhookUrl);

  const statusCode = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          console.log('HTTP', res.statusCode, text.slice(0, 500));
          resolve(res.statusCode || 0);
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  await client.end();
  process.exit(statusCode >= 200 && statusCode < 300 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
