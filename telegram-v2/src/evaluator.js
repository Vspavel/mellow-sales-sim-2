import fs from 'fs';
import path from 'path';
import pg from 'pg';
import nodemailer from 'nodemailer';
import { assess, BUILTIN_PERSONAS } from './engine.js';

const logsDir = process.env.LOGS_DIR
  ? path.resolve(process.env.LOGS_DIR)
  : path.join(process.cwd(), 'data', 'logs');

const RESULT_EMAIL = process.env.RESULT_EMAIL || 'onboarding-simulations@mellow.io';
const { Pool } = pg;
let pool = null;

function resolvePostgresConnection() {
  return process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || '';
}

function shouldUsePostgres() {
  return String(process.env.STORAGE_DRIVER || '').toLowerCase() === 'postgres' && Boolean(resolvePostgresConnection());
}

function shouldUsePostgresSsl(connectionString) {
  if (!connectionString) return false;
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get('sslmode') === 'disable') return false;
    return !['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return !/localhost|127\.0\.0\.1/.test(connectionString);
  }
}

function getPool() {
  if (!shouldUsePostgres()) return null;
  if (!pool) {
    const connectionString = resolvePostgresConnection();
    pool = new Pool({
      connectionString,
      ssl: shouldUsePostgresSsl(connectionString) ? { rejectUnauthorized: false } : false,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}

const VERDICT_EMOJI = { PASS: '✅', PASS_WITH_NOTES: '🟡', FAIL: '❌', BLOCKER: '🚫' };
const STATUS_EMOJI = { PASS: '✅', FAIL: '❌' };

export function formatAssessmentTelegram(session, assessment) {
  const persona = BUILTIN_PERSONAS[session.bot_id];
  const personaName = persona?.name || session.bot_id;
  const verdictEmoji = VERDICT_EMOJI[assessment.verdict] || '❓';
  const lines = [];
  lines.push(`*━━ ИТОГИ ПРОГОНА ━━*`);
  lines.push(`Персона: *${personaName}* — ${persona?.role || ''}`);
  lines.push(`Карточка: ${session.sde_card_id} · ${session.sde_card?.signal_type || ''} · ${session.sde_card?.heat || ''}`);
  lines.push(`Язык сессии: ${session.language === 'en' ? 'English' : 'Русский'}`);
  lines.push(`Ходы: ${session.meta.bot_turns || 0} ответов бота`);
  lines.push('');
  lines.push(`${verdictEmoji} *Вердикт: ${assessment.verdict_label}*`);
  lines.push('');
  lines.push(`*Критерии:*`);
  for (const c of assessment.criteria) {
    const emoji = STATUS_EMOJI[c.status] || '❓';
    lines.push(`${emoji} *${c.id}* ${c.label}: ${c.short_reason}`);
  }
  if (assessment.coaching_points?.length) {
    lines.push('');
    lines.push(`*Что улучшить:*`);
    for (const cp of assessment.coaching_points) {
      lines.push(`• ${cp.what_is_wrong}`);
      if (cp.better_version) lines.push(`  → ${cp.better_version}`);
    }
  }
  lines.push('');
  lines.push(`*Следующий шаг:*`);
  lines.push(assessment.recommended_next_drill_label);
  lines.push('');
  lines.push(`_${assessment.summary_for_seller}_`);
  lines.push('');
  lines.push(`\`Run ID: ${session.session_id}\``);
  return lines.join('\n');
}

function formatTranscriptText(session) {
  const persona = BUILTIN_PERSONAS[session.bot_id];
  const personaName = persona?.name || session.bot_id;
  return session.transcript.map(m => {
    const role = m.role === 'seller' ? `[Seller ${session.seller_username}]` : `[${personaName}]`;
    const ts = m.ts ? ` (${m.ts.slice(11, 19)})` : '';
    return `${role}${ts}: ${m.text}`;
  }).join('\n');
}

function buildTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function buildEmailBody(session, assessment) {
  const persona = BUILTIN_PERSONAS[session.bot_id];
  const lines = [];
  lines.push(`Sales Sim v2 — Run Result`);
  lines.push(`=========================`);
  lines.push(`Run ID:    ${session.session_id}`);
  lines.push(`Seller:    ${session.seller_username} (TG uid: ${session.telegram_user_id})`);
  lines.push(`Persona:   ${persona?.name || session.bot_id} / ${persona?.role || ''}`);
  lines.push(`SDE Card:  ${session.sde_card_id} — ${session.sde_card?.signal_type || ''} — ${session.sde_card?.heat || ''}`);
  lines.push(`Language:  ${session.language || 'unknown'}`);
  lines.push(`Started:   ${session.started_at}`);
  lines.push(`Finished:  ${session.finished_at}`);
  lines.push(`Trigger:   ${session.trigger}`);
  lines.push(`Verdict:   ${assessment.verdict} — ${assessment.verdict_label}`);
  lines.push('');
  lines.push(`── Criteria ──`);
  for (const c of assessment.criteria) lines.push(`${c.id} ${c.label}: ${c.status} — ${c.short_reason}`);
  lines.push('');
  lines.push(`── Transcript (${session.transcript.length} turns) ──`);
  lines.push(formatTranscriptText(session));
  lines.push('');
  lines.push(`── Coaching ──`);
  for (const cp of assessment.coaching_points || []) {
    lines.push(`• ${cp.what_is_wrong}`);
    lines.push(`  → ${cp.better_version}`);
  }
  lines.push('');
  lines.push(`Next drill: ${assessment.recommended_next_drill_label}`);
  return lines.join('\n');
}

export async function sendResultEmail(session, assessment) {
  const transport = buildTransport();
  if (!transport) {
    console.warn('[evaluator] SMTP not configured — skipping email dispatch');
    return;
  }
  const persona = BUILTIN_PERSONAS[session.bot_id];
  const date = (session.finished_at || new Date().toISOString()).slice(0, 10);
  const subject = `[Sales Sim v2] ${session.session_id} — ${persona?.name || session.bot_id} — ${date}`;
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'simulator@mellow.io',
      to: RESULT_EMAIL,
      subject,
      text: buildEmailBody(session, assessment)
    });
    console.log(`[evaluator] Email sent → ${RESULT_EMAIL} | ${session.session_id}`);
  } catch (err) {
    console.error('[evaluator] Email send failed:', err.message);
  }
}

export async function logRun(session, assessment) {
  const record = {
    session_id: session.session_id,
    bot_id: session.bot_id,
    seller_username: session.seller_username,
    telegram_chat_id: session.telegram_chat_id,
    sde_card_id: session.sde_card_id,
    signal_type: session.sde_card?.signal_type,
    heat: session.sde_card?.heat,
    language: session.language,
    started_at: session.started_at,
    finished_at: session.finished_at,
    trigger: session.trigger,
    bot_turns: session.meta.bot_turns,
    verdict: assessment.verdict,
    criteria_summary: assessment.criteria.map(c => ({ id: c.id, status: c.status })),
    transcript_length: session.transcript.length
  };

  const db = getPool();
  if (db) {
    await db.query(`
      insert into session_logs (log_id, session_id, log_date, payload, created_at, updated_at)
      values ($1, $2, $3, $4::jsonb, now(), now())
      on conflict (log_id) do update
      set payload = excluded.payload,
          updated_at = now()
    `, [session.session_id, session.session_id, (session.finished_at || new Date().toISOString()).slice(0, 10), JSON.stringify(record)]);
    console.log(`[evaluator] Run logged → postgres:${session.session_id}`);
    return;
  }

  const date = (session.finished_at || new Date().toISOString()).slice(0, 10);
  const dayDir = path.join(logsDir, date);
  fs.mkdirSync(dayDir, { recursive: true });
  const logPath = path.join(dayDir, `${session.session_id}.json`);
  fs.writeFileSync(logPath, JSON.stringify(record, null, 2));
  console.log(`[evaluator] Run logged → ${logPath}`);
}

export async function runEvaluation(session) {
  const assessment = assess(session);
  session.assessment = assessment;
  await logRun(session, assessment);
  await sendResultEmail(session, assessment);
  return { assessment, telegramMessage: formatAssessmentTelegram(session, assessment) };
}
