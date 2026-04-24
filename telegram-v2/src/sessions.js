import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { buildPersonaSeed, buildConcernOrder, pickCard, now } from './engine.js';

const sessionsDir = process.env.SESSIONS_DIR
  ? path.resolve(process.env.SESSIONS_DIR)
  : path.join(process.cwd(), 'data', 'sessions');

fs.mkdirSync(sessionsDir, { recursive: true });

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

function sessionKey(personaId, chatId) {
  return `${personaId}_${chatId}`;
}

function sessionPath(personaId, chatId) {
  return path.join(sessionsDir, `${sessionKey(personaId, chatId)}.json`);
}

function readFileSession(personaId, chatId) {
  const p = sessionPath(personaId, chatId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeFileSession(session) {
  const p = sessionPath(session.bot_id, session.telegram_chat_id);
  fs.writeFileSync(p, JSON.stringify(session, null, 2));
}

async function saveSessionToPostgres(session) {
  const db = getPool();
  if (!db) return;
  await db.query(`
    insert into sales_sessions (session_id, persona_id, status, started_at, finished_at, payload, created_at, updated_at)
    values ($1, $2, $3, $4, $5, $6::jsonb, now(), now())
    on conflict (session_id) do update
    set persona_id = excluded.persona_id,
        status = excluded.status,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        payload = excluded.payload,
        updated_at = now()
  `, [
    session.session_id,
    session.bot_id || session.persona_id || 'unknown',
    session.status || 'in_progress',
    session.started_at || null,
    session.finished_at || null,
    JSON.stringify(session),
  ]);
}

export async function loadActiveSession(personaId, chatId) {
  const db = getPool();
  if (db) {
    const result = await db.query(
      `select payload from sales_sessions where persona_id = $1 and payload->>'telegram_chat_id' = $2 and status = 'in_progress' order by updated_at desc limit 1`,
      [personaId, String(chatId)]
    );
    if (result.rowCount > 0) return result.rows[0].payload;
  }

  const session = readFileSession(personaId, chatId);
  if (!session || session.status !== 'in_progress') return null;
  if (db) await saveSessionToPostgres(session);
  return session;
}

export async function saveSession(session) {
  writeFileSession(session);
  await saveSessionToPostgres(session);
}

export async function createSession(personaId, chatId, userId, username) {
  const card = pickCard(personaId);
  const seed = buildPersonaSeed(personaId);
  const session = {
    session_id: `session_${crypto.randomUUID().slice(0, 8)}`,
    bot_id: personaId,
    telegram_chat_id: chatId,
    telegram_user_id: userId,
    seller_username: username || String(userId),
    started_at: now(),
    finished_at: null,
    status: 'in_progress',
    trigger: null,
    language: null,
    sde_card_id: card.card_id,
    sde_card: card,
    transcript: [],
    assessment: null,
    meta: {
      bot_turns: 0,
      flags: {},
      claims: {},
      trust: 1,
      irritation: 0,
      miss_streak: 0,
      persona_seed: seed,
      concern_order: buildConcernOrder(personaId, seed),
      resolved_concerns: {}
    }
  };
  await saveSession(session);
  return session;
}

export async function finishSession(session, trigger) {
  session.status = 'finished';
  session.finished_at = now();
  session.trigger = trigger || 'manual';
  await saveSession(session);
  return session;
}
