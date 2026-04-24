/**
 * index.js — Mellow Sales Simulator v2 entry point
 *
 * Starts 8 Telegram bots (one per ICP persona) and keeps them running.
 * Configure with .env (see .env.example).
 *
 * Usage:
 *   npm install
 *   cp .env.example .env   # fill in BOT_TOKEN_* and SMTP_*
 *   node src/index.js
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env before anything else
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenvPath = path.join(__dirname, '..', '.env');

try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: dotenvPath });
} catch {
  // dotenv optional during tests
}

import { launchAllBots, PERSONA_TOKEN_KEYS } from './bots.js';
import { BUILTIN_PERSONAS } from './engine.js';

console.log('');
console.log('┌─────────────────────────────────────────────┐');
console.log('│   Mellow Sales Simulator v2 — Telegram      │');
console.log('│   ICP-bot training system                   │');
console.log('└─────────────────────────────────────────────┘');
console.log('');
console.log(`Personas available: ${Object.keys(BUILTIN_PERSONAS).join(', ')}`);
console.log('');

// Check which tokens are configured
const configured = [];
const unconfigured = [];
for (const [personaId, envKey] of Object.entries(PERSONA_TOKEN_KEYS)) {
  if (process.env[envKey]) configured.push(personaId);
  else unconfigured.push({ personaId, envKey });
}

if (unconfigured.length > 0) {
  console.warn('⚠️  Missing bot tokens (bots will not start):');
  for (const { personaId, envKey } of unconfigured) {
    const persona = BUILTIN_PERSONAS[personaId];
    console.warn(`   ${envKey}  →  ${persona?.name || personaId}`);
  }
  console.warn('');
  console.warn('   Get tokens from @BotFather on Telegram.');
  console.warn('   See .env.example for all required variables.');
  console.warn('');
}

if (configured.length === 0) {
  console.error('❌ No bot tokens configured. Set at least one BOT_TOKEN_* env var and restart.');
  process.exit(1);
}

// Check SMTP configuration
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('⚠️  SMTP not configured — post-run emails will be skipped.');
  console.warn('   Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable email dispatch.');
  console.warn('');
}

console.log(`Starting ${configured.length} bot(s)...`);
console.log('');

const { launched, missing } = launchAllBots();

if (launched.length > 0) {
  console.log(`\n✅ ${launched.length} bot(s) running. Press Ctrl+C to stop.\n`);
}

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[index] Received ${signal}. Stopping bots...`);
  for (const { bot, personaId } of launched) {
    try {
      bot.stop(signal);
      console.log(`[index] Stopped ${personaId}`);
    } catch {}
  }
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
