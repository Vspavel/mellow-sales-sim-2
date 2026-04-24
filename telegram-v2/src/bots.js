/**
 * bots.js — Multi-bot Telegraf launcher
 * One Telegraf instance per persona. All bots share the same handler logic.
 */
import { Telegraf } from 'telegraf';
import {
  generateBotReply,
  updateBehaviorState,
  updateSessionClaims,
  detectLanguage,
  isCompletionTrigger,
  buildPersonaGreeting,
  BUILTIN_PERSONAS
} from './engine.js';
import { loadActiveSession, createSession, saveSession, finishSession } from './sessions.js';
import { runEvaluation } from './evaluator.js';

// ── Persona → env var mapping ────────────────────────────────────────────────

const PERSONA_TOKEN_KEYS = {
  andrey:         'BOT_TOKEN_ANDREY',
  alexey:         'BOT_TOKEN_ALEXEY',
  cfo_round:      'BOT_TOKEN_CFO_ROUND',
  eng_manager:    'BOT_TOKEN_ENG_MANAGER',
  ops_manager:    'BOT_TOKEN_OPS_MANAGER',
  head_finance:   'BOT_TOKEN_HEAD_FINANCE',
  internal_legal: 'BOT_TOKEN_INTERNAL_LEGAL',
  external_legal: 'BOT_TOKEN_EXTERNAL_LEGAL',
};

// ── SDE card formatting for Telegram ────────────────────────────────────────

function formatSdeCard(card, persona) {
  const lines = [];
  lines.push(`*📋 Сигнальная карточка — ${persona.name}*`);
  lines.push(`*Сигнал:* ${card.signal_type} · ${card.heat === 'hot' ? '🔥 hot' : card.heat === 'warm' ? '🟡 warm' : '🔵 cold'}`);
  lines.push(`*Окно:* ${card.outreach_window}`);
  lines.push('');
  lines.push(`*Контакт:* ${card.contact.name} — ${card.contact.title}`);
  lines.push(`*Компания:* ${card.company.name} (${card.company.industry}, ${card.company.size}, ${card.company.hq})`);
  lines.push('');
  lines.push(`*Что произошло:*`);
  lines.push(card.what_happened);
  if (card.apollo_context?.length) {
    lines.push('');
    lines.push(`*Контекст:*`);
    for (const c of card.apollo_context) lines.push(`• ${c}`);
  }
  lines.push('');
  lines.push(`*Боль:* ${card.probable_pain}`);
  lines.push(`*Продукт:* ${card.recommended_product} | *Канал:* ${card.recommended_channel}`);
  lines.push('');
  lines.push(`💡 *Совет:* ${card.first_touch_hint}`);
  if (card.dont_do?.length) {
    lines.push(`⚠️ *Не делай:* ${card.dont_do.join(' / ')}`);
  }
  lines.push('');
  lines.push(`_Начни диалог — бот сыграет роль ${card.contact.name}._`);
  lines.push(`_/end или /стоп для завершения прогона._`);
  return lines.join('\n');
}

// ── Finish run handler ───────────────────────────────────────────────────────

async function handleFinishRun(ctx, session, trigger) {
  finishSession(session, trigger);
  await ctx.reply('⏳ Оцениваю прогон...');
  try {
    const { telegramMessage } = await runEvaluation(session);
    await ctx.reply(telegramMessage, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`[bot:${session.bot_id}] Evaluation error:`, err.message);
    await ctx.reply('❌ Ошибка при оценке прогона. Результаты сохранены локально.');
  }
}

// ── Bot factory ──────────────────────────────────────────────────────────────

function createBot(personaId, token) {
  const bot = new Telegraf(token);
  const persona = BUILTIN_PERSONAS[personaId];
  const personaName = persona?.name || personaId;

  // /start — create new session
  bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || String(userId);

    const existing = loadActiveSession(personaId, chatId);
    if (existing) {
      await ctx.reply(
        `У вас уже есть активный прогон с *${personaName}*.\n\nИспользуйте /end или /стоп для завершения прогона перед началом нового.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const session = createSession(personaId, chatId, userId, username);
    const cardMessage = formatSdeCard(session.sde_card, persona);
    await ctx.reply(cardMessage, { parse_mode: 'Markdown' });

    // Bot sends opening greeting as persona
    const greeting = buildPersonaGreeting(personaId);
    session.transcript.push({ role: 'bot', text: greeting, ts: new Date().toISOString() });
    session.meta.bot_turns = 1;
    saveSession(session);
    await ctx.reply(greeting);
  });

  // /end and /стоп — finish run
  const endHandler = async (ctx) => {
    const session = loadActiveSession(personaId, ctx.chat.id);
    if (!session) {
      await ctx.reply('Нет активного прогона. Используйте /start чтобы начать.');
      return;
    }
    if (session.transcript.filter(m => m.role === 'seller').length === 0) {
      await ctx.reply('Отправьте хотя бы одно сообщение перед завершением прогона.');
      return;
    }
    await handleFinishRun(ctx, session, ctx.message.text.trim());
  };

  bot.command('end', endHandler);
  bot.command('стоп', endHandler);

  // Text messages — main dialogue handler
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text) return;

    // Ignore Telegram commands other than ones we handle
    if (text.startsWith('/') && !isCompletionTrigger(text)) {
      await ctx.reply('Используйте /start для нового прогона или /end для завершения.');
      return;
    }

    const session = loadActiveSession(personaId, ctx.chat.id);
    if (!session) {
      await ctx.reply(`Нет активного прогона. Используйте /start чтобы начать с ${personaName}.`);
      return;
    }

    // Language detection on first seller message
    if (!session.language) {
      session.language = detectLanguage(text);
    }

    // Check inline completion trigger
    if (isCompletionTrigger(text)) {
      if (session.transcript.filter(m => m.role === 'seller').length === 0) {
        await ctx.reply('Отправьте хотя бы одно сообщение перед завершением прогона.');
        return;
      }
      await handleFinishRun(ctx, session, text);
      return;
    }

    // Add seller message to transcript
    session.transcript.push({ role: 'seller', text, ts: new Date().toISOString() });

    // Update behavior state (trust/irritation tracking)
    updateBehaviorState(session, text);

    // Generate and send bot reply
    const reply = generateBotReply(session, text);
    updateSessionClaims(session, text);
    session.meta.bot_turns = (session.meta.bot_turns || 0) + 1;
    session.transcript.push({ role: 'bot', text: reply, ts: new Date().toISOString() });
    saveSession(session);

    // Add typing indicator for realism
    await ctx.sendChatAction('typing');
    // Brief delay for realism (200-600ms)
    await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
    await ctx.reply(reply);
  });

  bot.catch((err, ctx) => {
    console.error(`[bot:${personaId}] Unhandled error for ${ctx.updateType}:`, err.message);
  });

  return bot;
}

// ── Launch all bots ──────────────────────────────────────────────────────────

export function launchAllBots() {
  const launched = [];
  const missing = [];

  for (const [personaId, envKey] of Object.entries(PERSONA_TOKEN_KEYS)) {
    const token = process.env[envKey];
    if (!token) {
      missing.push({ personaId, envKey });
      console.warn(`[bots] ⚠️  ${envKey} not set — ${personaId} bot will not start`);
      continue;
    }
    const bot = createBot(personaId, token);
    const persona = BUILTIN_PERSONAS[personaId];
    bot.launch()
      .then(() => console.log(`[bots] ✅ ${persona?.name || personaId} (${personaId}) started`))
      .catch(err => console.error(`[bots] ❌ Failed to launch ${personaId}:`, err.message));
    launched.push({ personaId, bot });
  }

  return { launched, missing };
}

export { PERSONA_TOKEN_KEYS };
