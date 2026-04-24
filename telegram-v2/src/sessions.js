/**
 * sessions.js — Telegram-keyed file-backed session store
 * Sessions are keyed by "{personaId}:{chatId}" and stored as JSON files.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildPersonaSeed, buildConcernOrder, pickCard, now } from './engine.js';

const sessionsDir = process.env.SESSIONS_DIR
  ? path.resolve(process.env.SESSIONS_DIR)
  : path.join(process.cwd(), 'data', 'sessions');

fs.mkdirSync(sessionsDir, { recursive: true });

function sessionKey(personaId, chatId) {
  return `${personaId}_${chatId}`;
}

function sessionPath(personaId, chatId) {
  return path.join(sessionsDir, `${sessionKey(personaId, chatId)}.json`);
}

export function loadActiveSession(personaId, chatId) {
  const p = sessionPath(personaId, chatId);
  if (!fs.existsSync(p)) return null;
  try {
    const session = JSON.parse(fs.readFileSync(p, 'utf8'));
    return session.status === 'in_progress' ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  const p = sessionPath(session.bot_id, session.telegram_chat_id);
  fs.writeFileSync(p, JSON.stringify(session, null, 2));
}

export function createSession(personaId, chatId, userId, username) {
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
  saveSession(session);
  return session;
}

export function finishSession(session, trigger) {
  session.status = 'finished';
  session.finished_at = now();
  session.trigger = trigger || 'manual';
  saveSession(session);
  return session;
}
