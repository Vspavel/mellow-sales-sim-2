/**
 * engine.js — Core Sales Simulator engine extracted from v1 server.js
 * Pure functions only. No Express, no file I/O, no side effects beyond session mutation.
 */
import crypto from 'crypto';

// ==================== UTILITY ====================

export function now() { return new Date().toISOString(); }
export function randomId(prefix) { return `${prefix}_${crypto.randomUUID().slice(0, 8)}`; }
export function countWords(text) { return text.trim().split(/\s+/).filter(Boolean).length; }
export function hasAny(text, items) { const t = text.toLowerCase(); return items.some(i => t.includes(i)); }
export function pick(options) { return options[Math.floor(Math.random() * options.length)]; }
export function chooseRandom(items) { if (!Array.isArray(items) || !items.length) return null; return items[Math.floor(Math.random() * items.length)]; }
export function clone(v) { return JSON.parse(JSON.stringify(v)); }

function sanitizePersonaId(v) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}
function normalizeArray(v) { if (!Array.isArray(v)) return []; return v.map(i => String(i || '').trim()).filter(Boolean); }

function normalizeCard(card, personaId, index) {
  const fallbackId = `${personaId}-card-${index + 1}`;
  const company = card?.company || {};
  const contact = card?.contact || {};
  return {
    card_id: String(card?.card_id || fallbackId).trim() || fallbackId,
    signal_type: String(card?.signal_type || 'PAIN_SIGNAL').trim() || 'PAIN_SIGNAL',
    heat: ['hot', 'warm', 'cold'].includes(String(card?.heat || '').toLowerCase()) ? String(card.heat).toLowerCase() : 'warm',
    outreach_window: String(card?.outreach_window || '7 дней').trim() || '7 дней',
    contact: { name: String(contact.name || '').trim() || 'New Contact', title: String(contact.title || '').trim() || 'Decision maker', linkedin: String(contact.linkedin || '').trim() },
    company: { name: String(company.name || '').trim() || 'NewCo', industry: String(company.industry || '').trim() || 'Technology', size: String(company.size || '').trim() || '50 сотрудников', hq: String(company.hq || '').trim() || 'Remote', founded_year: Number.isFinite(Number(company.founded_year)) ? Number(company.founded_year) : new Date().getUTCFullYear(), latest_event: String(company.latest_event || '').trim() || 'Команда ищет более управляемый contractor flow.' },
    what_happened: String(card?.what_happened || '').trim() || 'Есть операционный или контрольный сбой.',
    apollo_context: normalizeArray(card?.apollo_context),
    target_profile: String(card?.target_profile || '').trim() || 'A',
    probable_pain: String(card?.probable_pain || '').trim() || 'Ручная нагрузка.',
    recommended_product: String(card?.recommended_product || '').trim() || 'CM',
    recommended_channel: String(card?.recommended_channel || '').trim() || 'email',
    first_touch_hint: String(card?.first_touch_hint || '').trim() || 'Зайди через конкретный операционный контекст.',
    dont_do: normalizeArray(card?.dont_do),
    rendered_text: String(card?.rendered_text || '').trim() || 'Сигнал: у компании есть pain в contractor/payment flow.'
  };
}

export function normalizePersona(persona, fallbackId) {
  const id = sanitizePersonaId(persona?.id || fallbackId || persona?.name) || `persona_${crypto.randomUUID().slice(0, 8)}`;
  const cards = Array.isArray(persona?.cards) && persona.cards.length
    ? persona.cards.map((card, i) => normalizeCard(card, id, i))
    : [normalizeCard({}, id, 0)];
  return { id, name: String(persona?.name || id).trim(), role: String(persona?.role || 'Persona').trim(), intro: String(persona?.intro || '').trim(), archetype: String(persona?.archetype || 'custom').trim(), tone: String(persona?.tone || 'balanced').trim(), system_prompt: String(persona?.system_prompt || '').trim(), cards };
}

// ==================== BUILTIN PERSONAS ====================

export const BUILTIN_PERSONAS_RAW = {
  andrey: { id: 'andrey', name: 'Андрей Волков', role: 'CFO — финансовые риски и сложные гео', intro: 'Жёсткий CFO. Проверяет границы ответственности, риск и следующий шаг.', archetype: 'finance', tone: 'risk', cards: [
    { card_id: 'andrey-card-1', signal_type: 'COMPLIANCE_PRESSURE', heat: 'hot', outreach_window: '48 часов', contact: { name: 'Андрей Волков', title: 'CFO', linkedin: 'linkedin.com/in/andrey-volkov' }, company: { name: 'Northstar Games', industry: 'GameDev', size: '280 сотрудников', hq: 'Amsterdam', founded_year: 2018, latest_event: 'Компания обсуждает стратегическое партнёрство и внешний legal review.' }, what_happened: 'Финансовый менеджер пожаловался на ручную сверку выплат подрядчикам, а один платёж недавно завис на 23 дня.', apollo_context: ['45 подрядчиков в UA/KZ/GE/AM и часть с паспортами РФ', 'Текущая схема: Wise / Payoneer / посредник в Грузии', 'Скоро внешний legal review contractor/payment structure'], target_profile: 'A', probable_pain: 'Санкционный и налоговый риск + ручная возня в финансах', recommended_product: 'CoR', recommended_channel: 'LinkedIn', first_touch_hint: 'Зайди через зависший платёж и предстоящий legal review, не обещай магических compliance-обещаний.', dont_do: ['Не обещай защиту от misclassification', 'Не начинай с обезличенного захода'], rendered_text: 'Сигнал: у Northstar Games перед внешним legal review всплыл pain по contractor payments. Один платёж завис на 23 дня, а finance команда тратит 3-4 дня в месяц на ручную сверку. Контекст: 45 подрядчиков, hard geo, смесь Wise / Payoneer / посредника.' },
    { card_id: 'andrey-card-2', signal_type: 'FUNDRAISING_DILIGENCE', heat: 'warm', outreach_window: '3 недели', contact: { name: 'Андрей Волков', title: 'CFO', linkedin: 'linkedin.com/in/andrey-volkov' }, company: { name: 'Stellarpath', industry: 'B2B Software', size: '320 сотрудников', hq: 'Warsaw', founded_year: 2017, latest_event: 'Совет директоров поставил задачу привести contractor arrangements в порядок до Series B.' }, what_happened: 'Совет директоров попросил CFO аудировать текущую схему работы с подрядчиками перед переговорами о раунде.', apollo_context: ['60+ contractors in PL/UA/GE/KZ', 'Часть выплат идёт через личные счета', 'Board требует clean contractor documentation до раунда'], target_profile: 'A', probable_pain: 'Недостаточная управляемость схемы перед investor diligence', recommended_product: 'CoR', recommended_channel: 'LinkedIn', first_touch_hint: 'Заходи через diligence-readiness и управляемость схемы.', dont_do: ['Не обещай снять legal risk целиком', 'Не говори как с операционным менеджером'], rendered_text: 'Сигнал: у Stellarpath совет директоров поставил задачу привести contractor arrangements в порядок до Series B. CFO видит риски в geo-структуре и частичных выплатах через личные счета.' }
  ]},
  alexey: { id: 'alexey', name: 'Алексей Громов', role: 'Founder / CEO — операционный и быстрый', intro: 'Быстрый founder. Любит коротко, конкретно, без маркетинговых клише.', archetype: 'ops', tone: 'speed', cards: [
    { card_id: 'alexey-card-1', signal_type: 'PAIN_SIGNAL', heat: 'warm', outreach_window: '72 часа', contact: { name: 'Алексей Громов', title: 'CEO / Founder', linkedin: 'linkedin.com/in/alexey-gromov' }, company: { name: 'OrbitFlow', industry: 'B2B SaaS', size: '140 сотрудников', hq: 'remote / Dubai', founded_year: 2021, latest_event: 'Команда активно нанимает и расширяет подрядчиков в Кавказе и Центральной Азии.' }, what_happened: 'Операционная команда жалуется на задержки выплат и постоянную ручную координацию через Wise / crypto.', apollo_context: ['Founder живёт вне ЕС, думает скоростью и execution', 'Подрядчики в Армении, Грузии, Казахстане и иногда РФ', 'Главная боль: бардак, задержки, ручная возня, а не legal detail'], target_profile: 'B', probable_pain: 'Операционный friction и потеря времени команды', recommended_product: 'CM', recommended_channel: 'email', first_touch_hint: 'Продавай операционный апгрейд, а не страх.', dont_do: ['Не душни compliance-нарративом', 'Не пиши длинно', 'Не используй маркетинговые клише'], rendered_text: 'Сигнал: у OrbitFlow растёт распределённая команда подрядчиков, а ops уже тонет в задержках выплат и ручной координации через Wise / crypto. Founder ценит скорость и не любит тяжёлые sales-процессы.' }
  ]},
  cfo_round: { id: 'cfo_round', name: 'София Ким', role: 'CFO — Series A / pre-B, investor diligence', intro: 'CFO перед раундом. Думает через diligence-readiness и audit story.', archetype: 'finance', tone: 'diligence', cards: [
    { card_id: 'cfo-round-card-1', signal_type: 'FUNDRAISING_DILIGENCE', heat: 'hot', outreach_window: '2 недели', contact: { name: 'София Ким', title: 'CFO', linkedin: 'linkedin.com/in/sofia-kim' }, company: { name: 'Vanta AI', industry: 'B2B SaaS', size: '210 сотрудников', hq: 'Berlin', founded_year: 2020, latest_event: 'Series A закрылась три недели назад. Investor запросил cleaner contractor controls.' }, what_happened: 'Investor запросил cleaner contractor controls и структурированную payment documentation перед следующим раундом.', apollo_context: ['Series A закрыта', 'Investor требует structured contractor documentation', 'Текущая схема: Wise + посредник'], target_profile: 'A', probable_pain: 'Слабая audit story перед следующим diligence', recommended_product: 'CoR', recommended_channel: 'email', first_touch_hint: 'Заходи через diligence-readiness, не через general fintech pitch.', dont_do: ['Не обещай снять legal risk', 'Не говори общими словами про compliance'], rendered_text: 'Сигнал: у Vanta AI после Series A investor запросил cleaner contractor controls перед следующим раундом. Текущая схема слабо defensible.' }
  ]},
  eng_manager: { id: 'eng_manager', name: 'Марк Дорошенко', role: 'Engineering Manager — мост между ops и finance', intro: 'Engineering manager. Хочет снять ручные эскалации, но должен занести решение в finance.', archetype: 'ops', tone: 'bridge', cards: [
    { card_id: 'eng-manager-card-1', signal_type: 'OPERATIONS_OVERLOAD', heat: 'warm', outreach_window: '1 неделя', contact: { name: 'Марк Дорошенко', title: 'Engineering Manager', linkedin: 'linkedin.com/in/mark-doroshenko' }, company: { name: 'Docklane', industry: 'DevTools / B2B SaaS', size: '180 сотрудников', hq: 'Kyiv / remote', founded_year: 2019, latest_event: 'Команда выросла на 30% за квартал, подрядчики в AM/GE/KZ.' }, what_happened: 'Engineering manager раз за разом становится операционным мостом между finance и подрядчиками по вопросам выплат.', apollo_context: ['15+ инженеров-подрядчиков в AM/GE/KZ', 'Регулярные задержки выплат и ручная координация', 'Finance требует документации, которую engineering собирает руками'], target_profile: 'B', probable_pain: 'Engineering manager тратит время на ручные эскалации вместо продукта', recommended_product: 'CM', recommended_channel: 'email', first_touch_hint: 'Продавай снятие ручных эскалаций и помощь в внутреннем pitch для finance.', dont_do: ['Не уходи в compliance-нарратив', 'Не игнорируй внутреннюю политику'], rendered_text: 'Сигнал: у Docklane engineering manager тратит время на ручные эскалации по contractor payments. Finance требует документов, команда жалуется на задержки.' }
  ]},
  ops_manager: { id: 'ops_manager', name: 'Ирина Соколова', role: 'Operations Manager — процесс и предсказуемость', intro: 'Ops manager. Ценит предсказуемость, не любит хаос и долгие sales-процессы.', archetype: 'ops', tone: 'process', cards: [
    { card_id: 'ops-manager-card-1', signal_type: 'PAIN_SIGNAL', heat: 'warm', outreach_window: '5 дней', contact: { name: 'Ирина Соколова', title: 'Operations Manager', linkedin: 'linkedin.com/in/irina-sokolova' }, company: { name: 'BlueMesa', industry: 'Marketplace / B2B', size: '120 сотрудников', hq: 'Almaty / remote', founded_year: 2020, latest_event: 'Команда выросла, coordinator payments через чаты и таблицы.' }, what_happened: 'Payout coordination размазана по чатам, почте и таблицам. Ops тратит 5+ часов в неделю на ручной follow-up.', apollo_context: ['30+ подрядчиков в KZ/GE/AM', 'Координация через Telegram + Excel + Wise', 'Постоянные ручные follow-ups по статусам'], target_profile: 'B', probable_pain: 'Ручная координация выплат, непредсказуемые статусы, потеря времени', recommended_product: 'CM', recommended_channel: 'email', first_touch_hint: 'Продавай предсказуемость и снятие ручного слоя.', dont_do: ['Не уходи в compliance', 'Не делай длинные презентации'], rendered_text: 'Сигнал: у BlueMesa ops тратит 5+ часов в неделю на ручной follow-up по contractor payments. Координация через чаты и таблицы.' }
  ]},
  head_finance: { id: 'head_finance', name: 'Елена Краснова', role: 'Head of Finance — контроль и отчётность', intro: 'Head of Finance. Думает через audit, explainability и контроль перед leadership.', archetype: 'finance', tone: 'control', cards: [
    { card_id: 'head-finance-card-1', signal_type: 'COMPLIANCE_PRESSURE', heat: 'warm', outreach_window: '2 недели', contact: { name: 'Елена Краснова', title: 'Head of Finance', linkedin: 'linkedin.com/in/elena-krasnova' }, company: { name: 'ClearHarbor', industry: 'Logistics / B2B', size: '250 сотрудников', hq: 'Warsaw', founded_year: 2017, latest_event: 'Идёт подготовка к annual audit, finance наводит порядок с contractor controls.' }, what_happened: 'Перед annual audit finance обнаружила неструктурированную contractor documentation и ручную сверку.', apollo_context: ['40+ contractors в PL/UA/GE', 'Ручная сверка 3-4 дня в месяц', 'Audit давление от leadership'], target_profile: 'A', probable_pain: 'Слабая explainability contractor scheme перед audit и leadership', recommended_product: 'CoR', recommended_channel: 'email', first_touch_hint: 'Заходи через audit readiness и explainability для leadership.', dont_do: ['Не обещай снять весь compliance риск', 'Не говори только про speed'], rendered_text: 'Сигнал: у ClearHarbor идёт подготовка к annual audit. Finance обнаружила неструктурированную contractor documentation и ручную сверку.' }
  ]},
  internal_legal: { id: 'internal_legal', name: 'Анна Белова', role: 'Internal Legal — traceability и серые зоны', intro: 'Internal legal counsel. Ищет чёткие границы зон ответственности и документальную traceability.', archetype: 'legal', tone: 'precision', cards: [
    { card_id: 'internal-legal-card-1', signal_type: 'COMPLIANCE_PRESSURE', heat: 'warm', outreach_window: '2 недели', contact: { name: 'Анна Белова', title: 'Legal Counsel', linkedin: 'linkedin.com/in/anna-belova' }, company: { name: 'SynthPort', industry: 'B2B SaaS', size: '190 сотрудников', hq: 'Riga', founded_year: 2018, latest_event: 'Компания пересобирает contractor documentation и хочет сократить серые зоны.' }, what_happened: 'Компания пересматривает contractor templates и хочет более чёткую границу между зонами ops, finance и legal.', apollo_context: ['35+ contractors в LV/UA/GE', 'Серые зоны между ops, finance и legal', 'Хотят traceability и меньше ручных исключений'], target_profile: 'A', probable_pain: 'Серые зоны в ответственности и слабая traceability', recommended_product: 'CoR', recommended_channel: 'email', first_touch_hint: 'Говори точно про границы, documents, audit trail. Без overclaiming.', dont_do: ['Не обещай юридической определённости', 'Не уходи в маркетинговые тезисы'], rendered_text: 'Сигнал: SynthPort пересобирает contractor documentation. Legal хочет более чёткую границу и traceability между ops, finance и посредниками.' }
  ]},
  external_legal: { id: 'external_legal', name: 'Давид Ларсен', role: 'External Legal Counsel — defensibility и review', intro: 'External counsel при expansion review. Глубокий скептик. Требует доказательств, не деклараций.', archetype: 'legal', tone: 'skeptical', cards: [
    { card_id: 'external-legal-card-1', signal_type: 'COMPLIANCE_PRESSURE', heat: 'warm', outreach_window: '10 дней', contact: { name: 'Давид Ларсен', title: 'External Counsel', linkedin: 'linkedin.com/in/david-larsen' }, company: { name: 'Westline Commerce', industry: 'E-commerce / retail', size: '300 сотрудников', hq: 'Copenhagen', founded_year: 2016, latest_event: 'External counsel подключён к expansion review contractor/payment setup.' }, what_happened: 'External counsel при expansion review нашёл несоответствие между contractor classification и реальной payment схемой.', apollo_context: ['External review подключён', '50+ contractors в EU + AM/GE', 'Текущая схема: смесь посредников и ручных исключений'], target_profile: 'H', probable_pain: 'Несоответствие между contractor classification и реальным payment flow создаёт regulatory exposure', recommended_product: 'CoR', recommended_channel: 'email + short call', first_touch_hint: 'Говори точно: что контролирует Mellow, где audit trail, где граница ответственности.', dont_do: ['Не обещай юридической определённости', 'Не уходи в маркетинговые тезисы'], rendered_text: 'Сигнал: external counsel при expansion review нашёл несоответствие между contractor classification и реальной payment схемой у Steelway Commerce.' }
  ]}
};

// Normalize all builtin personas once on load
export const BUILTIN_PERSONAS = Object.fromEntries(
  Object.entries(BUILTIN_PERSONAS_RAW).map(([id, p]) => [id, normalizePersona(p, id)])
);

// ==================== SIGNAL VARIANTS ====================

const signalVariantPresets = {
  COMPLIANCE_PRESSURE: [
    { what: 'Во время internal finance review всплыли два зависших contractor payout и слишком длинная ручная сверка по документам.', pain: 'Финансовый риск и ручной разбор исключений перед review.', render: 'Сигнал: finance review вскрыл зависшие contractor payout и длинную ручную сверку документов.' },
    { what: 'Новый controller эскалировал разрыв между payout-операциями и тем, что команда может быстро объяснить legal и leadership.', pain: 'Слабая explainability схемы и растущая нагрузка на finance.', render: 'Сигнал: новый controller увидел слабую explainability contractor flow и эскалировал вопрос до leadership.' },
    { what: 'Перед внешним review finance команда обнаружила старые исключения по подрядчикам и слишком много ручных обходных маршрутов.', pain: 'Серые зоны в payout flow и потеря контроля над исключениями.', render: 'Сигнал: перед внешним review вскрылись старые исключения и ручные обходные маршруты.' }
  ],
  PAIN_SIGNAL: [
    { what: 'Ops устал собирать статусы выплат по подрядчикам из чатов, почты и личных напоминаний.', pain: 'Потеря скорости команды и постоянные ручные follow-ups.', render: 'Сигнал: распределённая contractor-команда растёт, а ops уже тонет в статусах и ручных follow-ups.' },
    { what: 'Founder получил жалобы от team leads, что выплаты подрядчикам снова приходится разруливать вручную через несколько инструментов.', pain: 'Бардак в execution-слое и потеря времени ключевых людей.', render: 'Сигнал: team leads жалуются на ручное разруливание выплат через несколько инструментов.' }
  ]
};

function buildSignalVariant(baseCard) {
  const variantPool = signalVariantPresets[baseCard.signal_type] || [];
  const variant = chooseRandom(variantPool);
  if (!variant) return clone(baseCard);
  return { ...clone(baseCard), what_happened: variant.what || baseCard.what_happened, probable_pain: variant.pain || baseCard.probable_pain, rendered_text: variant.render || baseCard.rendered_text };
}

export function pickCard(personaId) {
  const persona = BUILTIN_PERSONAS[personaId];
  const baseCard = chooseRandom(persona?.cards || []);
  return buildSignalVariant(baseCard || normalizeCard({}, personaId, 0));
}

// ==================== PERSONA SEED ====================

export function buildPersonaSeed(personaId) {
  const seeds = {
    andrey: pick(['risk-first', 'blunt-skeptic', 'deal-weary', 'analytical']),
    alexey: pick(['speed-freak', 'pragmatist', 'exec-compressed', 'semi-open']),
    cfo_round: pick(['diligence-focused', 'cautious-timing', 'investor-aware', 'process-risk']),
    eng_manager: pick(['champion-potential', 'skeptical-vendor', 'bridge-seeker', 'tired-escalator']),
    ops_manager: pick(['chaos-averse', 'time-poor', 'process-fatigued', 'results-oriented']),
    head_finance: pick(['control-seeker', 'reporting-pressure', 'audit-focused', 'explainability-first']),
    internal_legal: pick(['precision-seeker', 'grey-zone-fatigued', 'methodical', 'overclaim-allergic']),
    external_legal: pick(['deeply-skeptical', 'defensibility-focused', 'rapid-assessor', 'evidence-first']),
  };
  return seeds[personaId] || 'default';
}

// ==================== CLAIMS / SESSION HELPERS ====================

export function sellerMessages(session) { return session.transcript.filter(m => m.role === 'seller').map(m => m.text); }
export function botMessages(session) { return session.transcript.filter(m => m.role === 'bot').map(m => m.text); }
export function personaMeta(session) { return BUILTIN_PERSONAS[session.bot_id]; }

export function isMisclassificationBlocker(text) {
  const lower = text.toLowerCase();
  if (!lower.includes('misclassification')) return false;
  const negativeFrames = ['не обещ', 'не бер', 'не берё', 'не снима', 'не защищ', 'не можем обещ'];
  if (negativeFrames.some(f => lower.includes(f))) return false;
  return ['защит', 'сним', 'бер', 'гарант'].some(f => lower.includes(f));
}

export function extractClaims(sellerText) {
  const lower = sellerText.toLowerCase();
  const found = {};
  const dayMatch = lower.match(/(\d+)\s*дн/);
  if (dayMatch) found.days = dayMatch[0].trim();
  for (const tool of ['wise', 'crypto', 'payoneer', 'swift', 'revolut']) { if (lower.includes(tool)) { found.tool = tool; break; } }
  if (lower.includes('sla')) found.sla = true;
  if (lower.includes('audit trail') || lower.includes('audit-trail')) found.auditTrail = true;
  const rubMatch = lower.match(/(\d[\d\s]*)\s*(тыс|млн|руб|₽|\$|€|usd|eur)/);
  if (rubMatch) found.amount = rubMatch[0].trim();
  if (hasAny(lower, ['срочно', 'deadline', 'дедлайн', 'до конца', 'до пятниц', 'до следующ'])) found.urgency = true;
  if (hasAny(lower, ['другой', 'конкурент', 'альтернатив', 'сравниваю', 'тоже смотрим'])) found.competitor = true;
  if (hasAny(lower, ['пилот', 'trial', 'тест', 'попробовать', 'проверить'])) found.trialMention = true;
  return found;
}

export function updateSessionClaims(session, sellerText) {
  session.meta.claims = { ...(session.meta.claims || {}), ...extractClaims(sellerText) };
}

// ==================== CONCERN SYSTEM ====================

export function buildConcernOrder(personaId, seed = null) {
  const archetype = BUILTIN_PERSONAS[personaId]?.archetype;
  if (archetype === 'finance') {
    const r = Math.random();
    let middle;
    if (r < 0.35) middle = ['scope', 'why_change', 'sla'];
    else if (r < 0.60) middle = ['why_change', 'scope', 'sla'];
    else if (r < 0.80) middle = ['scope', 'sla', 'why_change'];
    else middle = ['sla', 'scope', 'why_change'];
    const order = [...middle];
    if (['andrey', 'cfo_round'].includes(personaId)) order.push('geo_tax');
    return order;
  }
  if (archetype === 'ops') {
    if (personaId === 'eng_manager') {
      const r = Math.random();
      if (r < 0.30) return ['op_value', 'vendor_fatigue', 'internal_sell', 'cost'];
      if (r < 0.55) return ['vendor_fatigue', 'op_value', 'internal_sell', 'cost'];
      if (r < 0.75) return ['op_value', 'internal_sell', 'cost'];
      return ['op_value', 'internal_sell', 'vendor_fatigue'];
    }
    if (personaId === 'alexey') {
      if (seed === 'exec-compressed') return Math.random() > 0.4 ? ['cost', 'op_value', 'proof'] : ['op_value', 'cost', 'proof'];
      const r = Math.random();
      if (r < 0.35) return ['op_value', 'proof', 'cost'];
      if (r < 0.65) return ['op_value', 'cost', 'proof'];
      return ['cost', 'op_value', 'proof'];
    }
    if (personaId === 'ops_manager') {
      const r = Math.random();
      if (r < 0.40) return ['op_value', 'cost', 'proof'];
      if (r < 0.70) return ['op_value', 'proof', 'cost'];
      return ['proof', 'op_value', 'cost'];
    }
    return ['op_value', 'cost'];
  }
  if (archetype === 'legal') {
    const r = Math.random();
    if (personaId === 'external_legal') {
      if (r < 0.30) return ['scope', 'incident', 'grey_zones'];
      if (r < 0.55) return ['scope', 'grey_zones', 'incident'];
      if (r < 0.75) return ['incident', 'scope', 'grey_zones'];
      return ['grey_zones', 'scope', 'incident'];
    }
    if (r < 0.35) return ['scope', 'grey_zones', 'incident'];
    if (r < 0.60) return ['scope', 'incident', 'grey_zones'];
    if (r < 0.80) return ['grey_zones', 'scope', 'incident'];
    return ['incident', 'grey_zones', 'scope'];
  }
  return ['scope'];
}

function sellerAdvancesConcern(concern, lower) {
  const maps = {
    scope: ['документ', 'kyc', 'audit', 'trail', 'платеж', 'sla', 'цепоч', 'границ', 'ответствен', 'не снима', 'не берёт', 'огранич', 'warning'],
    why_change: ['риск', 'надёжн', 'надежн', 'документ', 'sla', 'системн', 'конкретн', 'не работа', 'сломает', 'уязвим'],
    sla: ['sla', 'эскалац', 'поддерж', 'инцидент', 'застр', 'статус', 'трекинг', '24 час', '48 час'],
    geo_tax: ['ндфл', 'налог', 'россий', 'рф', 'паспорт', 'diligence', 'инвест'],
    op_value: ['убирает', 'убрать', 'меньше', 'быстрее', 'конкретн', 'часов', 'минут', 'без ручн', 'статус', 'предсказ', 'процесс'],
    cost: ['стоим', 'цен', 'дорог', 'бюджет', 'trial', 'пилот', 'деньг', 'месяц'],
    internal_sell: ['finance', 'финансист', 'внутри', 'champion', 'материал', 'письм', 'pitch', 'аргумент', 'слайд'],
    grey_zones: ['серые зон', 'overlap', 'между', 'разделен', 'flow', 'chain', 'цепоч', 'границ'],
    incident: ['инцидент', 'исключен', 'flow', 'trail', 'эскалац', 'документ', 'в срок'],
    next_step: ['созвон', 'звон', '15 минут', '20 минут', 'follow', 'материал', 'memo', 'review', 'walkthrough', 'расч'],
    vendor_fatigue: ['другой vendor', 'обещал', 'другой сервис', 'пробовали', 'уже пробов', 'прошлый', 'раньше', 'до этого', 'похожий'],
    proof: ['кейс', 'пример', 'клиент', 'кто использует', 'референс', 'результат', 'покажи', 'сравни', 'тест', 'пилот', 'trial'],
  };
  return hasAny(lower, maps[concern] || []);
}

function getActiveConcern(session) {
  const order = session.meta.concern_order || [];
  const resolved = session.meta.resolved_concerns || {};
  for (const c of order) { if (!resolved[c]) return c; }
  return null;
}

export function updateBehaviorState(session, sellerText) {
  const lower = sellerText.toLowerCase();
  const archetype = personaMeta(session).archetype;
  const concern = getActiveConcern(session);
  const marketingSlang = hasAny(lower, ['лидер рынка', 'best-in-class', 'надежное решение', 'масштабируйтесь без проблем', 'инновационн']);
  const tooLong = archetype === 'ops' && countWords(sellerText) > 50;
  if (marketingSlang || tooLong) { session.meta.irritation = Math.min(3, (session.meta.irritation || 0) + 1.2); session.meta.miss_streak = (session.meta.miss_streak || 0) + 1; return; }
  const advances = concern ? sellerAdvancesConcern(concern, lower) : false;
  if (!advances) { session.meta.irritation = Math.min(3, (session.meta.irritation || 0) + 0.7); session.meta.miss_streak = (session.meta.miss_streak || 0) + 1; return; }
  const concernKeys = { scope: ['документ', 'kyc', 'audit', 'trail', 'sla', 'цепоч', 'границ', 'ответствен'], why_change: ['риск', 'документ', 'sla', 'системн', 'конкретн'], sla: ['sla', 'эскалац', 'поддерж', 'инцидент', 'статус'], geo_tax: ['ндфл', 'налог', 'россий'], op_value: ['убирает', 'меньше', 'быстрее', 'часов', 'конкретн'], cost: ['стоим', 'цен', 'trial', 'пилот'], internal_sell: ['материал', 'письм', 'pitch', 'финансист'], grey_zones: ['процесс', 'flow', 'разделен', 'границ'], incident: ['инцидент', 'flow', 'trail', 'эскалац'] };
  const hits = (concernKeys[concern] || []).filter(k => lower.includes(k)).length;
  const quality = hits >= 2 ? 'strong' : 'partial';
  if (quality === 'strong') { session.meta.irritation = Math.max(0, (session.meta.irritation || 0) - 0.8); session.meta.trust = Math.min(3, (session.meta.trust || 1) + 0.6); session.meta.miss_streak = 0; if (concern) session.meta.resolved_concerns = { ...(session.meta.resolved_concerns || {}), [concern]: 'strong' }; }
  else { session.meta.irritation = Math.max(0, (session.meta.irritation || 0) - 0.3); session.meta.miss_streak = 0; }
}

// ==================== FINANCE RESPONSES ====================

function respondFinanceNextStep(persona, claims, trust) {
  if (persona.id === 'cfo_round') return pick(['Хорошо. Пришлите коротко flow, audit story и что именно упростится перед diligence. Если там без магии, выделю 20 минут на неделе.', 'Пришлите written summary: что в зоне Mellow, что нет, как это выглядит перед diligence. Если аккуратно — найдём 20 минут.']);
  if (persona.id === 'head_finance') return pick(['Ок. Скиньте коротко flow, SLA и как сокращается ручная сверка. Если это приземлённо, выделю слот на неделе.', 'Пришлите summary: flow, SLA и что убирается из ручной сверки. Если реально — созвонимся.']);
  return pick(['Хорошо. Пришлите коротко структуру потока, SLA и пример расчёта. Если это выглядит приземлённо, выделю 20 минут на неделе.', 'Ладно. Flow, SLA и что происходит при инциденте — одним экраном. Если реально — созвонимся.', 'Пришлите memo: flow, зона контроля, SLA. Если без лишних обещаний — найдём 20 минут.']);
}

function respondFinanceByConcern(concern, session, persona, lower, claims, trust, irritation) {
  if (concern === 'scope') {
    if (irritation >= 2) return pick(['Всё равно не слышу, где ваша зона заканчивается.', 'Ещё раз: что именно в зоне Mellow? Без деклараций.', 'Стоп. За что вы отвечаете, за что нет?', 'Граница ответственности. Три раза уже прошу. Где она?']);
    if (trust >= 2) return pick(['Ладно, это уже ближе. Что конкретно Mellow берёт на себя — документы, платёжная цепочка, что ещё?', 'Ок, зона вырисовывается. Тогда уточните: а что именно Mellow не покрывает — где заканчивается контроль?']);
    if (persona.id === 'cfo_round') return pick(['Всё ещё не слышу чёткой зоны. Что конкретно в зоне Mellow перед diligence — docs, платёжная цепочка, что ещё?', 'Для diligence мне нужно знать точно: что у вас под контролем, что у меня. Без размытых формулировок.']);
    if (persona.id === 'head_finance') return pick(['Вы не ответили на вопрос про зону. Что именно в вашем контроле, что нет?', 'Неясная граница — это проблема при аудите. Что конкретно в зоне Mellow, что у меня?']);
    return pick(['Я уже спрашивал. Что именно Mellow контролирует, а где ваша ответственность заканчивается?', 'Не услышал ответа. Платёжная цепочка, документы, KYC — что в вашей зоне, что нет?', 'Ещё раз: зона контроля Mellow — что конкретно, без деклараций?', 'Половина ответа есть. Вторая: что именно вы не берёте — где моя сторона начинается?']);
  }
  if (concern === 'why_change') {
    if (persona.id === 'cfo_round') return pick(['Это ближе. Но следующий раунд — не завтра. Зачем мне менять схему сейчас, если текущая не взорвалась?', 'Слышу. Но текущая схема как-то держится. Что конкретно сломается без Mellow — и когда?', 'Текущая схема кривая, но живёт. Что именно не выдержит следующего diligence без изменений?']);
    if (claims.days) return pick([`Вы упоминали задержку в ${claims.days} — это конкретно. Но зачем мне менять схему целиком, если такое случилось один раз?`, `${claims.days} задержки — слышал. Это системная проблема или разовый инцидент? Почему Mellow это исправит?`]);
    if (irritation >= 2) return pick(['Ещё раз: текущая схема как-то живёт. Что конкретно сломается без Mellow?', 'Уже спрашивал. Почему именно сейчас? Что не работает?']);
    return pick(['Это уже ближе к делу. Но зачем мне менять текущего посредника, если схема пусть криво, но работает годами?', 'Текущая схема живёт года три. Что конкретно сломается без Mellow?', 'Допустим. Но у нас уже работает схема — не идеальная, но предсказуемая. Зачем менять?']);
  }
  if (concern === 'sla') {
    if (persona.id === 'head_finance') return pick(['Допустим. А если платёж застрянет или документ не тот — как это выглядит операционно с моей стороны?', 'Мне надо это объяснять вверх. Есть ли SLA по инцидентам — конкретные часы, кто отвечает?']);
    if (irritation >= 2) return pick(['Сбой. Платёж завис. Что дальше? Кто, в каком сроке?', 'Операционно — что происходит при инциденте? Конкретика.', 'Сценарий: платёж завис на три дня. Мои действия? Ваши действия?']);
    return pick(['Допустим. А если платёж снова застрянет, что у вас происходит операционно? Есть SLA или это тоже общие обещания?', 'Понял. Но конкретно: если платёж повиснет на неделю, что происходит? Кто эскалирует, в каком сроке?', 'Мне важно понять не ideal path, а failure path. Что происходит при инциденте — кто, что, за сколько?', 'SLA — это не только обещание, это процесс. Есть ли у вас конкретный escalation path при сбое?']);
  }
  if (concern === 'geo_tax') {
    if (persona.id === 'cfo_round') return pick(['И отдельно: contractor docs, НДФЛ и как это объясняется следующему инвестору на diligence?', 'Инвестор спросит про contractor classification в РФ. Как Mellow помогает с этим нарративом?']);
    return pick(['И отдельно, как вы работаете с НДФЛ и выплатами по людям с российским паспортом? Мне нужна граница, а не витрина.', 'Половина команды с РФ-паспортами. Это не абстракция. Что именно Mellow делает с НДФЛ в такой конфигурации?', 'Geo-риск — это отдельная история. Как вы работаете с подрядчиками из санкционных или серых юрисдикций?']);
  }
  if (irritation >= 2) return pick(['Не убедительно. Где конкретика по документам, зоне контроля и следующему шагу?', 'Опять без конкретики. Что именно меняется в моём процессе?', 'Декларации слышу. Механизмы — нет. Что реально меняется?']);
  return pick(['Я пока не услышал достаточно конкретики. Что именно вы меняете в процессе, кроме красивых слов про compliance?', 'Пока много деклараций. Что конкретно меняется в моём процессе, в каком сроке?', 'Всё звучит правильно. Но правильные слова — не аргумент. Что конкретно изменится?']);
}

function respondFinance(session, sellerText) {
  const lower = sellerText.toLowerCase();
  const turn = session.meta.bot_turns || 0;
  const claims = session.meta.claims || {};
  const persona = personaMeta(session);
  const trust = session.meta.trust || 1;
  const irritation = session.meta.irritation || 0;
  const flags = session.meta.flags || {};
  const seed = session.meta.persona_seed || 'analytical';

  if (persona.id === 'head_finance' && turn >= 1 && ['reporting-pressure', 'audit-focused', 'explainability-first'].includes(seed) && !session.meta._hf_report_done) {
    session.meta._hf_report_done = true;
    return pick(['Я должна отчитаться перед советом за каждого vendor, которого вводим. Что именно я им говорю — в двух предложениях, без pitch?', 'У меня встреча с CEO через месяц. Что им сказать: почему Mellow, почему сейчас, что именно берёт на себя?', 'Каждый vendor — это вопрос от leadership. Что именно я им объясняю про Mellow и почему это надёжнее текущей схемы?']);
  }
  if (turn === 2 && seed === 'deal-weary' && irritation < 1) {
    session.meta._seed_comment_done = (session.meta._seed_comment_done || 0) + 1;
    if (session.meta._seed_comment_done === 1) return pick(['Слышу. Но у меня в очереди ещё три vendor-разговора на этой неделе. Что именно выделяет вас?', 'Понятно. Только у меня уже была похожая история с другим vendor — и закончилась ничем. Почему здесь иначе?']);
  }
  if (turn === 2 && seed === 'risk-first' && trust < 1.5) {
    session.meta._seed_comment_done = (session.meta._seed_comment_done || 0) + 1;
    if (session.meta._seed_comment_done === 1) return pick(['Подождите. Прежде чем идти дальше — что происходит, если всё пойдёт не по плану? Это моя главная точка.', 'Мне важно понять failure mode до того, как двигаться дальше. Что происходит при инциденте?']);
  }
  if (isMisclassificationBlocker(sellerText)) {
    session.meta.flags = { ...flags, blocker: true };
    return pick(['То есть вы сейчас обещаете снять misclassification риск? Именно такие обещания и подрывают доверие. Где у вас заканчивается ответственность?', 'Стоп. Если вы обещаете снять misclassification risk — на этом разговор заканчивается. Где именно ваша зона контроля?', 'Misclassification вы не можете снять, и если обещаете — это красный флаг. Что именно в вашей зоне, без расширенных обещаний?']);
  }
  if (turn === 0) {
    if (!hasAny(lower, ['audit', 'review', 'дью', 'due', 'раунд', 'инвест', '23', 'wise', 'payoneer', 'подряд', 'сверк'])) {
      return pick(['Пока слишком общо. Что именно вы увидели в нашем контексте, и почему пишете именно сейчас?', 'Это звучит как стандартный открывающий питч. Что конкретно из нашей ситуации вас зацепило?', 'Непонятно, почему вы пишете именно сейчас. Что в нашем контексте подтолкнуло к этому письму?', 'Слишком общий заход. Что именно вы знаете про нашу ситуацию, прежде чем писать?']);
    }
    if (persona.id === 'cfo_round') return pick(['Ок, контекст раунда вы заметили. Тогда сразу: что именно Mellow делает управляемее перед diligence, а где ваша зона заканчивается?', 'Понял, что вы отслеживаете раунд. Конкретно: что именно упрощается перед следующим diligence, и где ваша зона контроля заканчивается?']);
    if (persona.id === 'head_finance') return pick(['Контекст понятен. Мне нужна граница: что именно в вашей зоне, что у меня — чётко, без деклараций.', 'Хорошо, контекст finance operations вы увидели. Что именно вы контролируете в цепочке, а что остаётся на стороне клиента?']);
    return pick(['Ок, контекст вы хотя бы увидели. Тогда сразу: что именно Mellow контролирует, а где ваша ответственность заканчивается?', 'Нормально. Сразу к делу: что именно в вашей зоне, а что — нет? Платёжная цепочка, документы, НДФЛ?', 'Вижу, что подготовились. Сразу вопрос: платёжная цепочка, документы, KYC — что в вашей зоне, что нет?']);
  }
  if (hasAny(lower, ['созвон', 'звон', '15 минут', '20 минут', 'follow', 'материал', 'расч', 'memo'])) {
    if (session.meta._memo_requested) return pick(['Жду материалы. Когда скинете?', 'Договорились. Жду письмо.', 'Хорошо. Присылайте — посмотрю.']);
    session.meta._memo_requested = true;
    return respondFinanceNextStep(persona, claims, trust);
  }
  const order = session.meta.concern_order || [];
  const resolved = session.meta.resolved_concerns || {};
  for (const futureConcern of order) {
    if (!resolved[futureConcern] && futureConcern !== getActiveConcern(session) && sellerAdvancesConcern(futureConcern, lower)) {
      session.meta.resolved_concerns = { ...resolved, [futureConcern]: 'partial' };
    }
  }
  const concern = getActiveConcern(session);
  return respondFinanceByConcern(concern, session, persona, lower, claims, trust, irritation);
}

// ==================== OPS RESPONSES ====================

function respondOpsNextStep(persona, claims, trust, activeConcern) {
  if (persona.id === 'eng_manager') {
    if (activeConcern === 'vendor_fatigue') return pick(['Ладно. Пришли конкретный материал, который объясняет, чем Mellow структурно отличается от того, что у нас уже не взлетело. Не pitch — факты по механике.', 'Ок. Один вопрос после всего разговора: можешь дать мне кейс с похожей командой, где это реально работает? Конкретный, не абстрактный.']);
    if (activeConcern === 'internal_sell') return pick(['Ладно. Мне нужно что-то, что я могу показать команде без долгих объяснений. Одностраничник: что убирается, что остаётся, какой следующий шаг. Можешь?', 'Пришли pilot proposal — не pitch. Что именно тестируем, в каком сроке, как измеряем. Если разумно, смогу занести.']);
    return pick(['Ок. Скинь короткий follow-up, который я реально смогу перекинуть в finance: что меняется, что убирается из ручных эскалаций и какой следующий шаг.', 'Нормально. Пришли короткое письмо или слайд для finance: что меняется, что убирается, что нужно от них.']);
  }
  if (persona.id === 'ops_manager') {
    if (activeConcern === 'proof') return pick(['Пришли реальный кейс — похожая команда по размеру и географии. Если это не фикция, поговорим.', 'Ок. Кейс или пилот — ничего другого не убедит. Что можешь дать конкретно для нашего типа setup?']);
    if (activeConcern === 'cost') return pick(['Пришли короткий расчёт или хотя бы benchmark — что это стоит для нашего объёма. Без цифр разговора нет.', 'Ладно. Скинь что-то по стоимости и условиям — без этого я не могу двигаться внутри.']);
    return pick(['Ок. Скинь короткий follow-up: как выглядит поток, что убирается из ручной возни и что нужно от моей ops. Если там без воды, можно созвониться.', 'Нормально. Пришли flow и что именно исчезает у меня из ежедневного списка. Если реально, созвонимся.']);
  }
  return pick(['Ок. Скинь короткий follow-up: как выглядит поток, что убирается из ручной возни и что нужно от моей ops. Если там без воды, можно созвониться.', 'Нормально. Скинь flow на один экран, и если реально убирает ручную возню — найдём 15 минут.']);
}

function respondOpsByConcern(concern, session, persona, lower, claims, trust, irritation) {
  if (concern === 'op_value') {
    if (irritation >= 2) return pick(['Ещё раз: что именно убирается из моего дня?', 'Конкретно — что я перестаю делать руками?', 'Не слышу апгрейда. Одна фраза: что меняется для меня?', 'Третий раз прошу. Что конкретно убирается — часы, шаги, чаты?']);
    if (trust >= 2) return pick(['Это уже ближе. А конкретно — какой процесс исчезает, сколько времени это занимает сейчас?', 'Слышу. Ещё конкретнее: что именно убирается из ежедневного списка?']);
    if (persona.id === 'eng_manager') return pick(['Хорошо. А как это помогает мне занести разговор в finance без тяжёлого enterprise theatre?', 'Ок. Но мне надо показать это финансистам. Что мне сказать им в двух предложениях?']);
    if (persona.id === 'ops_manager') return pick(['Нормально. Только не веди меня в долгий sales process. Что следующий шаг, чтобы быстро понять fit?', 'Ок. Но у меня нет времени на долгий онбординг. Что нужно от меня, чтобы понять, работает ли это?']);
    return pick(['Пока много слов. Где конкретный апгрейд по скорости, процессу или удобству?', 'Не слышу апгрейда. Одна фраза: что меняется для меня?', 'Слова правильные. Но где конкретный процессный апгрейд?']);
  }
  if (concern === 'vendor_fatigue') {
    if (irritation >= 2) return pick(['Всё ещё не слышу, чем это отличается от прошлого vendor.', 'Три раза уже спрашиваю. Чем Mellow структурно другой?', 'Не убедительно. Что конкретно не сломается в этот раз?']);
    return pick(['Понимаю логику. Но у меня уже был vendor, которого я продавал внутри — не взлетел, и я полгода объяснял почему. Что именно здесь другой риск?', 'У нас уже был vendor, которого я сам занёс в finance. Не взлетел — и я за это ответил. Почему этот разговор другой?', 'Мы уже выбирали похожий инструмент полтора года назад. Внедряли три месяца. Потом выбросили. Почему сейчас иначе?']);
  }
  if (concern === 'proof') {
    if (irritation >= 2) return pick(['Кейс или нет разговора. Что есть?', 'Три раза прошу конкретный пример. Есть или нет?', 'Без кейса — всё это декларации.']);
    return pick(['Слова правильные. Только покажи: кто уже использует и с каким результатом?', 'Всё это звучит хорошо на словах. Есть конкретный кейс — похожая команда, что убралось, что осталось?', 'Покажи один кейс: компания с похожей структурой, что убралось, что осталось.']);
  }
  if (concern === 'internal_sell') {
    if (irritation >= 2) return pick(['Finance не пропустит без аргументов. Что им сказать — конкретно?', 'Уже спросил: как занести это в finance? Где материал?']);
    return pick(['Хорошо. А как мне занести это в finance? Что им показать — один слайд, письмо, что-то конкретное?', 'Слышу. Только мне надо продать это внутри. Какой материал вы можете дать?', 'Finance смотрит на ROI. Что конкретно им показать — во времени, в деньгах, в рисках?']);
  }
  if (concern === 'cost') {
    if (persona.id === 'ops_manager') return pick(['И сколько это стоит в деньгах или времени команды? Мне не нужна ещё одна ручная система поверх старой.', 'Сколько стоит и как быстро запускается? Мне не нужен долгий onboarding.']);
    return pick(['И сколько это будет стоить? Мне не нужна ещё одна прослойка ради прослойки.', 'Понятно. А по деньгам как? Мне надо занести цифры в разговор с finance.', 'И сколько? И конкретно: есть ли trial, или сразу контракт?']);
  }
  return persona.id === 'ops_manager'
    ? pick(['Пока много слов. Где конкретный апгрейд по скорости, процессу или удобству?', 'Не слышу конкретики. Что именно убирается из моего дня?'])
    : persona.id === 'eng_manager'
    ? pick(['Пока много слов. Где конкретный апгрейд по скорости, процессу или удобству?', 'Хорошо звучит. Но finance будет скептичен. Что конкретно им показать?'])
    : pick(['Пока много слов. Где конкретный апгрейд по скорости, процессу или удобству?', 'Не слышу апгрейда. Одна фраза: что меняется для меня?']);
}

function respondOps(session, sellerText) {
  const lower = sellerText.toLowerCase();
  const turn = session.meta.bot_turns || 0;
  const wordCount = countWords(sellerText);
  const claims = session.meta.claims || {};
  const persona = personaMeta(session);
  const trust = session.meta.trust || 1;
  const irritation = session.meta.irritation || 0;

  const lengthLimit = persona.id === 'eng_manager' ? 65 : 50;
  if (wordCount > lengthLimit) return persona.id === 'ops_manager' ? pick(['Слишком длинно. В чём апгрейд для меня, одной-двумя фразами?', 'Много букв. Я живу процессами, не питчами. Одна фраза про апгрейд.']) : pick(['Слишком длинно. В чём апгрейд для меня, одной-двумя фразами?', 'Кратко. Что именно меняется для меня?', 'Коротко, пожалуйста. Суть в одном предложении.']);

  if (turn === 0) {
    if (hasAny(lower, ['санк', 'compliance', 'комплаенс', 'юрид']) && persona.id !== 'eng_manager') return pick(['Compliance не моя главная боль. Где реальный операционный апгрейд?', 'Это не мой язык. Мне нужен процесс, а не legal framing.', 'Legal не моя сторона. Что именно убирается из ежедневной координации?']);
    if (!hasAny(lower, ['wise', 'crypto', 'задерж', 'ручн', 'ops', 'выплат', 'эскалац', 'команд'])) {
      if (persona.id === 'ops_manager') return pick(['Пока похоже на обычный pitch. Что вы увидели у нас конкретно?', 'Такое мне пишут каждую неделю. Что именно вы знаете про нашу операционную ситуацию?', 'Слишком общо. Что конкретно у нас сломано, что вы решаете?']);
      if (persona.id === 'eng_manager') return pick(['Пока похоже на обычный pitch. Что вы увидели у нас конкретно?', 'Без конкретики это просто ещё один vendor. Что именно вы знаете про нас?']);
      return pick(['Пока похоже на обычный pitch. Что вы увидели у нас конкретно?', 'Звучит как template. Что у нас конкретно зацепило?']);
    }
    if (persona.id === 'eng_manager') {
      const emSeed = session.meta.persona_seed || 'champion-potential';
      if (emSeed === 'tired-escalator') return pick(['Устал быть прокладкой между finance и contractors. Если это реально снимает ручные эскалации — что именно убирается и за сколько?']);
      if (emSeed === 'skeptical-vendor') return pick(['Слышал такое раньше. Предыдущий vendor обещал то же самое и не поехал. Что у вас конкретно другое — операционно?']);
      if (emSeed === 'bridge-seeker') return pick(['Finance помнит прошлый vendor, который не поехал. Как объяснить им, что это другой разговор?']);
      return pick(['Нормально. Но у меня уже был один vendor, который обещал то же самое. Почему это другой разговор?', 'Проблему вы угадали. Но мне надо донести это до finance — как вы мне в этом поможете?']);
    }
    if (persona.id === 'ops_manager') {
      const opsSeed = session.meta.persona_seed || 'chaos-averse';
      if (opsSeed === 'time-poor') return pick(['У меня десять минут. Что конкретно убирается из дня — одной фразой?', 'Нет времени на долгий pitch. Одно предложение: что именно перестаю делать руками?']);
      if (opsSeed === 'process-fatigued') return pick(['Ещё один vendor. Что именно убирается из процесса — не слова, а конкретный шаг?']);
      return pick(['Нормально. Тогда коротко: что именно упростится у меня в ежедневной координации?', 'Ок. Конкретно: что перестаю делать я руками, если ставим Mellow?']);
    }
    const alexeySeed = session.meta.persona_seed || 'pragmatist';
    if (alexeySeed === 'speed-freak') return pick(['Ок, коротко. Что конкретно убирается из ручного — одной фразой?']);
    if (alexeySeed === 'exec-compressed') return pick(['Не надо про compliance. Что именно убирается из моей ручной работы?']);
    return pick(['Хорошо. Но crypto + Wise работает уже два года. Почему именно сейчас мне это нужно?', 'Понял. А что реально сломается, если я ничего не меняю?', 'Контекст понял. Но пока работает — зачем менять? Что конкретно это разблокирует?']);
  }

  if (hasAny(lower, ['созвон', 'звон', '15 минут', '20 минут', 'follow', 'материал', 'кейс', 'расч'])) {
    if (session.meta._memo_requested) return pick(['Жду материалы. Когда скинете?', 'Договорились. Жду письмо.', 'Хорошо. Присылайте — посмотрю.', 'Присылайте. Если конкретно — отвечу.']);
    if (trust < 1.5 && (session.meta.bot_turns || 0) < 2) {
      const activeConcern = getActiveConcern(session);
      if (activeConcern === 'vendor_fatigue') return pick(['Рано. Вы ещё не убедили меня, что это не очередной vendor. Сначала этот вопрос.']);
      if (activeConcern === 'internal_sell') return pick(['Не торопитесь. Я ещё не понял, как это объяснять finance. Сначала этот вопрос.']);
    }
    session.meta._memo_requested = true;
    return respondOpsNextStep(persona, claims, trust, getActiveConcern(session));
  }

  const order = session.meta.concern_order || [];
  const resolved = session.meta.resolved_concerns || {};
  for (const futureConcern of order) {
    if (!resolved[futureConcern] && futureConcern !== getActiveConcern(session) && sellerAdvancesConcern(futureConcern, lower)) {
      session.meta.resolved_concerns = { ...resolved, [futureConcern]: 'partial' };
    }
  }
  const concern = getActiveConcern(session);

  if (persona.id === 'alexey' && turn >= 1 && turn <= 2 && !session.meta._alexey_cbe_done) {
    if (Math.random() > 0.4) { session.meta._alexey_cbe_done = true; return pick(['Я уже инвестировал год в текущую схему — что именно теряю, если подожду ещё квартал?', 'Перестраивались под Wise + crypto год назад. Переключение тоже стоит времени команды. Что именно перевешивает прямо сейчас?', 'Слышу. Но текущий процесс — кривой, но предсказуемый. Сколько времени уйдёт на переход, и кто его тащит?']); }
  }
  if (persona.id === 'ops_manager' && turn >= 1 && turn <= 2 && !session.meta._ops_cbe_done) {
    if (Math.random() > 0.25) { session.meta._ops_cbe_done = true; return pick(['Текущая схема — кривая, но я её знаю. Переход на новый vendor — это время, настройка, риск сбоев. Что конкретно стоит этих затрат?', 'Понимаю логику. Но честно: у меня в голове срабатывает "менять то, что хоть как-то работает — опасно". Чем именно ты это перевешиваешь?']); }
  }
  if (persona.id === 'eng_manager' && turn >= 1 && turn <= 2 && !session.meta._eng_cbe_done) {
    if (Math.random() > 0.25) { session.meta._eng_cbe_done = true; return pick(['Понимаю логику. Но у меня уже был vendor, которого я продавал внутри — не взлетел, и я полгода объяснял почему. Это создаёт предвзятость. Почему здесь риск другой?', 'У нас уже был vendor, которого я сам занёс в finance. Не взлетел — и я за это ответил. Почему этот разговор другой?']); }
  }

  return respondOpsByConcern(concern, session, persona, lower, claims, trust, irritation);
}

// ==================== LEGAL RESPONSES ====================

function respondLegalNextStep(persona, trust, activeConcern) {
  if (persona.id === 'external_legal') return pick(['Хорошо. Пришлите короткий written follow-up с зоной контроля, process safeguards и примером flow. Если формулировки аккуратные, подключусь на короткий review call.', 'Пришлите memo: зона контроля, документы, safeguards, пример инцидента. Если формулировки чёткие — найдём 20 минут.']);
  if (persona.id === 'internal_legal') {
    if (activeConcern === 'scope') return pick(['Ок. Пришлите одностраничный document с чёткой разбивкой зон: что Mellow, что наш legal, что у клиента — без overlap.', 'Скиньте service boundary map — конкретно где Mellow заканчивается. Если читабельно — найдём 15 минут.']);
    if (activeConcern === 'grey_zones') return pick(['Пришлите схему: три слоя — Mellow, наш legal, наш finance — и где проходят границы.', 'Скиньте пример конкретного flow — как выглядит зона ответственности на практике. Если там без пробелов — можем созвониться.']);
    if (activeConcern === 'incident') return pick(['Пришлите incident playbook или хотя бы описание типичного кейса — кто что делает при сбое, в каком срок, с каким trail.', 'Скиньте пример real incident — что произошло, как Mellow отреагировал, что было задокументировано.']);
    return pick(['Ок. Пришлите короткий memo: documents, audit trail, ограничения, процесс инцидента. Если это аккуратно, можно сделать короткий walkthrough.', 'Скиньте memo: что именно в зоне Mellow, что нет, как выглядит audit trail. Если чётко — созвонимся.']);
  }
  return pick(['Ок. Пришлите короткий memo: documents, audit trail, ограничения, процесс инцидента. Если это аккуратно, можно сделать короткий walkthrough.', 'Хорошо. Скиньте summary: documents, audit trail, границы. Если там без overclaim, обсудим детали.']);
}

function respondLegalByConcern(concern, session, persona, lower, trust, irritation) {
  if (concern === 'scope') {
    if (irritation >= 2) return pick(['Граница ответственности — ещё раз. Что берёте на себя, что нет?', 'Три раза уже спрашиваю. Зона контроля Mellow — конкретно.', 'Без декораций: что берёте, что не берёте. Одним предложением.']);
    if (trust >= 2) return pick(['Это уже аккуратно. А что именно остаётся на стороне клиента — где ваша зона заканчивается?', 'Хорошо. Зона понятна. А где граница — что вы не берёте?']);
    if (persona.id === 'external_legal') return pick(['Хорошо. Тогда сразу: что именно контролирует Mellow, что не контролирует, и где это подтверждается процессно?', 'Нужны три вещи: что берёте, что не берёте, как подтверждается. Процессно, не декларативно.']);
    if (persona.id === 'internal_legal') return pick(['Ок. Конкретно: KYC, документы, платёжная цепочка — что именно в зоне Mellow, и где граница с нашей internal legal?', 'Аккуратно. Три вещи: что берёт Mellow, что остаётся у нашего legal, и как это задокументировано без overclaim?', 'Мне важна traceability, не обещания. Что конкретно подтверждается в документах — KYC, trail, границы зон?']);
    return pick(['Ок. Что именно Mellow даёт по documents, audit trail и process discipline, и где вы не делаете overclaim?', 'Хорошо начали. Но мне нужна точная граница: документы, платёжная цепочка, KYC — что именно ваше?']);
  }
  if (concern === 'grey_zones') {
    if (persona.id === 'external_legal') {
      const defCount = session.meta._ext_legal_defensible_count || 0;
      const archetype = session.meta.persona_seed || '';
      const isDeeplySkeptical = archetype === 'deeply-skeptical';
      const gateCount = 2;
      const gateTrust = isDeeplySkeptical ? 1.0 : 1.5;
      if (defCount >= gateCount && trust >= gateTrust) {
        session.meta.resolved_concerns = { ...(session.meta.resolved_concerns || {}), grey_zones: 'strong' };
        if (isDeeplySkeptical) return pick(['Ладно. Я слышу аргумент — и он более аккуратный, чем большинство. Но мне нужно проверить это письменно перед тем, как двигаться. Пришлите scope, safeguards, пример инцидента. Посмотрю без обещаний.', 'Слышу. Убеждать меня словами — это тупик. Но вы не пытаетесь убеждать, а описываете процесс. Это другое. Пришлите письменное summary для изучения.']);
        return pick(['Хорошо. Аргумент про процессную подтверждённость слышу. Пришлите письменный follow-up — scope, safeguards, пример инцидента.', 'Ладно. Если это операционно подтверждается — это другой разговор. Пришлите memo: зона, документы, flow.']);
      }
      session.meta._ext_legal_defensible_count = defCount + 1;
      if (isDeeplySkeptical && defCount >= 1) return pick(['Слышу позицию. Но "задокументировано" — это широкое слово. Что именно я смогу взять в руки и проверить? Audit trail, договор, процесс инцидента — конкретно?', 'Это более аккуратно, чем большинство pitch. Но мне нужен следующий уровень: как выглядит ваша зона при реальном dispute?']);
      return pick(['Звучит аккуратно. Тогда почему эта схема более defensible, чем текущая смесь посредников и ручных исключений?', 'Ок. Но defensibility требует доказательств, не деклараций. Чем это подтверждается операционно?', 'Хорошо. Но добавление vendor само создаёт серые зоны в ответственности. Как вы с этим работаете?']);
    }
    if (persona.id === 'internal_legal') return pick(['Хорошо. Но добавление Mellow — это новый слой между нашим internal legal и ops. Как именно он не создаёт новые серые зоны?', 'Ок. Три слоя: Mellow, наш legal, наш finance. Где именно границы — и кто несёт trail, если что-то проваливается между ними?', 'Мне нужно понять: если у нас спорная ситуация с подрядчиком — кто ведёт документацию, Mellow или наш legal?']);
    if (irritation >= 2) return pick(['Серые зоны между legal, ops и finance — как они убираются? Конкретно.', 'Ещё раз: как это не создаёт новых overlap между слоями?']);
    return pick(['Хорошо. Но как это уменьшает серые зоны между legal, ops и finance, а не просто добавляет новый слой?', 'Звучит аккуратно. Но добавление нового vendor само по себе создаёт новые серые зоны. Как вы их убираете?']);
  }
  if (concern === 'incident') {
    if (persona.id === 'external_legal') return pick(['Ок. Тогда следующий шаг должен быть очень конкретным. Что именно вы предлагаете: review, flow walkthrough или written follow-up?', 'Пришлите written summary — мне нужно что-то, что я могу отнести на следующий review.']);
    if (persona.id === 'internal_legal') return pick(['Хорошо. А как выглядит incident documentation в вашей схеме — что именно Mellow оформляет, что остаётся у нашего internal legal?', 'Важно: если что-то пошло не так с платёжной цепочкой — кто несёт audit trail? Что именно у вас, что у нас?']);
    if (irritation >= 2) return pick(['Инцидент. Документ не тот. Что происходит? Кто что делает?', 'Конкретный сценарий: что-то пошло не так. Кто, что, за сколько?']);
    return pick(['А как вы описываете инциденты, исключения и границы ответственности клиенту без ложных обещаний?', 'Ладно. Как именно выглядит документация инцидента — кто что делает, в каком сроке, с каким trail?', 'Важно: как выглядит сценарий инцидента — документ потерян, платёж завис? Кто что делает, в какой срок?']);
  }
  if (irritation >= 2) return pick(['Пока недостаточно точности. Формулировки про границы, документы, safeguards — не общие обещания.', 'Не хватает точности. Где конкретные формулировки про зону контроля, документы, audit trail?']);
  return pick(['Пока недостаточно точности. Мне нужны формулировки про границы, документы и process safeguards, а не общие обещания.', 'Слишком размыто. Мне нужна точность: что именно в зоне Mellow, что нет, и как это подтверждается?', 'Общие слова я слышал уже. Где конкретные формулировки про зону, документы, safeguards?']);
}

function respondLegal(session, sellerText) {
  const lower = sellerText.toLowerCase();
  const turn = session.meta.bot_turns || 0;
  const persona = personaMeta(session);
  const trust = session.meta.trust || 1;
  const irritation = session.meta.irritation || 0;
  const flags = session.meta.flags || {};

  if (isMisclassificationBlocker(sellerText)) {
    session.meta.flags = { ...flags, blocker: true };
    return pick(['Если вы обещаете снять misclassification risk, на этом доверие заканчивается. Сформулируйте границу ответственности корректно.', 'Это тот самый overclaim, который уничтожает доверие. Где именно заканчивается зона Mellow?']);
  }
  if (turn === 0) {
    if (!hasAny(lower, ['audit', 'trail', 'документ', 'границ', 'ответствен', 'review', 'legal', 'traceability'])) {
      return pick(['Пока звучит как vendor pitch. Что именно вы увидели в legal context и как формулируете свою зону контроля?', 'Слишком общо. Как именно вы формулируете зону своего контроля — что берёте на себя, что нет?', 'Стандартный заход. Что именно у нас в legal context вас зацепило перед отправкой?']);
    }
    if (persona.id === 'external_legal') return pick(['Хорошо. Тогда сразу: что именно контролирует Mellow, что не контролирует, и где это подтверждается процессно?', 'Контекст видите. Сразу к делу: что именно в зоне Mellow, что нет, и как это подтверждается документами?']);
    return pick(['Ок. Что именно Mellow даёт по documents, audit trail и process discipline, и где вы не делаете overclaim?', 'Хорошо. Конкретно по documents и audit trail: что в зоне Mellow, и где заканчивается ваша ответственность?']);
  }
  if (hasAny(lower, ['созвон', 'review', 'walkthrough', '15 минут', '20 минут', 'follow-up', 'memo', 'материал'])) {
    if (session.meta._memo_requested) return pick(['Жду материалы. Когда скинете?', 'Договорились. Жду письмо.', 'Присылайте. Если там аккуратно — найдём время.']);
    if (trust < 1.5 && (session.meta.bot_turns || 0) < 2) return pick(['Подождите. Вы ещё не ответили на мой вопрос про границы ответственности. Сначала это — потом next step.', 'Рано. Я ещё не закончила с вопросами про зону контроля. Что именно Mellow берёт, что нет?']);
    session.meta._memo_requested = true;
    return respondLegalNextStep(persona, trust, getActiveConcern(session));
  }
  const order = session.meta.concern_order || [];
  const resolved = session.meta.resolved_concerns || {};
  for (const futureConcern of order) {
    if (!resolved[futureConcern] && futureConcern !== getActiveConcern(session) && sellerAdvancesConcern(futureConcern, lower)) {
      if (persona.id === 'external_legal' && futureConcern === 'grey_zones') continue;
      session.meta.resolved_concerns = { ...resolved, [futureConcern]: 'partial' };
    }
  }
  const concern = getActiveConcern(session);
  return respondLegalByConcern(concern, session, persona, lower, trust, irritation);
}

// ==================== CONTRADICTION RESOLUTION ====================

function detectContradictionProbe(sellerText) {
  const lower = sellerText.toLowerCase();
  return ['вы сказали', 'только что вы', 'раньше вы', 'вы же говорили', 'вы же упоминали', 'но раньше', 'но вы говорили', 'противоречит', 'но вы же', 'вы написали', 'вы упоминали', 'сначала вы', 'вы же только что'].some(p => lower.includes(p));
}

function resolveContradiction(session) {
  const responses = {
    andrey: ['Я не говорил, что готов к переходу — я говорил, что хочу понять границу риска прежде чем двигаться дальше. Это разные вещи.', 'Не противоречие. "Схема работает" — это не "схема надёжна". Меня интересует второе, а не первое.'],
    alexey: ['Я не говорил, что менять не надо. Я говорил, что текущая схема пока тащит. "Пока тащит" — это не "всё устраивает". Вопрос — когда именно перестанет.', 'Схема работает — да. Это не значит, что она меня устраивает. Разные вещи. Продолжай.'],
    cfo_round: ['Я говорила, что схема "как-то работает". Это не значит, что она defensible для следующего diligence. Это разные критерии.', 'Текущая схема функционирует. Это не означает, что она готова к investor-level scrutiny. Разные вещи.'],
    eng_manager: ['Я не говорил, что ничего менять не буду — я говорил, что мне нужно занести это в finance без лишнего геморроя. Это условие, не отказ.', 'Не противоречие. Проблема есть — факт. Вопрос в том, как донести решение внутри без enterprise theatre.'],
    ops_manager: ['Я не говорила, что текущее устраивает — я говорила, что пока тащу процесс. "Тащу" — не "доволен". Если убираете ручной слой реально — разговор другой.', 'Я не сказала, что хорошо. Я сказала, что справляюсь. "Справляюсь руками" — это именно то, что я хочу убрать.'],
    head_finance: ['Я не говорила, что готова менять без понимания структуры. Я говорила, что нужно понять, что именно уходит на вашу сторону — и только потом можно говорить об изменениях.', 'Не противоречие. То, что текущая схема "работает" — не значит, что её легко объяснять leadership. Именно это меня и беспокоит.'],
    internal_legal: ['Я не говорила, что текущая схема устраивает. Я говорила, что добавление нового vendor само создаёт новые риски. Это разные вещи.', 'Вопрос был про серые зоны в текущей схеме. Отдельный вопрос — появятся ли новые серые зоны с Mellow. Оба вопроса важны.'],
    external_legal: ['Я не говорил, что текущая схема defensible — я говорил, что Mellow тоже нужно оценивать с той же строгостью. Требование одинаковое. Это не противоречие.', 'Не противоречие. Текущая схема хрупкая — это факт. Mellow тоже нужно проверить на те же вопросы. Я оцениваю оба варианта по одному стандарту.'],
  };
  return pick(responses[session.bot_id] || ['Не противоречие. Держите разделение: что я сказал про текущую ситуацию — и что именно мне нужно от вас. Это разные вещи.']);
}

// ==================== ROUTING ====================

function deduplicateReply(reply, session, responderFn) {
  const recent = session.meta._recent_bot_replies || [];
  let finalReply = reply;
  if (recent.includes(reply)) {
    session.meta.irritation = Math.min(3, (session.meta.irritation || 0) + 0.5);
    if (responderFn) {
      let found = false, bestAlt = null, bestAltAge = Infinity;
      for (let attempt = 0; attempt < 5; attempt++) {
        const alt = responderFn();
        if (!recent.includes(alt)) { finalReply = alt; found = true; break; }
        const idx = recent.indexOf(alt);
        if (idx < bestAltAge) { bestAltAge = idx; bestAlt = alt; }
      }
      if (!found) finalReply = bestAlt !== null ? bestAlt : reply;
    }
  }
  session.meta._recent_bot_replies = [...recent.slice(-3), finalReply];
  return finalReply;
}

export function generateBotReply(session, sellerText) {
  if (detectContradictionProbe(sellerText) && (session.meta.bot_turns || 0) >= 1) {
    const contraFn = () => resolveContradiction(session);
    return deduplicateReply(contraFn(), session, contraFn);
  }
  const archetype = personaMeta(session).archetype;
  let responder;
  if (archetype === 'finance') responder = () => respondFinance(session, sellerText);
  else if (archetype === 'legal') responder = () => respondLegal(session, sellerText);
  else responder = () => respondOps(session, sellerText);
  const reply = responder();
  return deduplicateReply(reply, session, responder);
}

// ==================== ASSESSMENT ====================

function firstContactMatchers(personaId) {
  return { andrey: ['23', 'legal', 'review', 'wise', 'payoneer', 'подряд', 'сверк'], alexey: ['wise', 'crypto', 'задерж', 'ручн', 'ops', 'выплат'], cfo_round: ['раунд', 'series', 'invest', 'diligence', 'due', 'audit', 'contractor'], eng_manager: ['эскалац', 'команд', 'engineer', 'engineering', 'подряд', 'выплат'], ops_manager: ['ops', 'статус', 'ручн', 'follow', 'выплат', 'хаос'], head_finance: ['audit', 'сверк', 'control', 'контрол', 'finance', 'документ'], internal_legal: ['legal', 'документ', 'audit', 'trail', 'границ', 'traceability'], external_legal: ['counsel', 'review', 'defensible', 'audit', 'trail', 'границ'] }[personaId] || ['контекст'];
}
function verdictLabel(v) { return { PASS: 'Готово к следующему шагу', PASS_WITH_NOTES: 'Хорошо, но можно сильнее', FAIL: 'Нужна доработка', BLOCKER: 'Критическая ошибка' }[v] || v; }
function criterionLabel(id) { return { K1: 'Заход через реальный контекст', K2: 'Границы ответственности и контроль', K3: 'Попадание в язык собеседника', K4: 'Работа с ключевыми возражениями', K5: 'Чёткий следующий шаг' }[id] || id; }
function recommendationLabel(code, persona) {
  if (code === 'advance_followup') return 'Можно переходить к follow-up: коротко зафиксируй flow, следующий шаг и зачем продолжать разговор.';
  if (code.startsWith('repeat_') && code.endsWith('_boundary')) return `Повтори прогон с ${persona.name}: держи разговор через зону контроля, документы, платёжный flow и без обещаний снять чужой риск.`;
  if (code.startsWith('repeat_') && code.endsWith('_conciseness')) return `Повтори прогон с ${persona.name}: укороти подачу и продавай через speed, predictability и снятие ручной возни.`;
  if (code.startsWith('repeat_') && code.endsWith('_legal_scope')) return `Повтори прогон с ${persona.name}: говори точнее про документы, audit trail, process safeguards и границы ответственности.`;
  return 'Повтори прогон и доведи разговор до более конкретного, доверительного next step.';
}

export function assess(session) {
  const seller = sellerMessages(session);
  const sellerText = seller.join('\n').toLowerCase();
  const firstMessage = (seller[0] || '').toLowerCase();
  const persona = personaMeta(session);
  const personaId = session.bot_id;

  const k1Pass = hasAny(firstMessage, firstContactMatchers(personaId));
  const blocker = seller.some(m => isMisclassificationBlocker(m));
  const k2Pass = !blocker && hasAny(sellerText, ['документ', 'kyc', 'audit', 'trail', 'платеж', 'цепоч', 'sla', 'налог', 'огранич', 'warning', 'предупреж', 'ответствен']);
  const marketingSlang = hasAny(sellerText, ['лидер рынка', 'best-in-class', 'надежное решение', 'надёжное решение', 'масштабируйтесь без проблем']);
  const avgWords = seller.length ? seller.reduce((s, m) => s + countWords(m), 0) / seller.length : 0;
  const k3Pass = persona.archetype === 'finance'
    ? hasAny(sellerText, ['риск', 'ответствен', 'документ', 'sla', 'налог', 'tco', 'процесс', 'audit', 'control'])
    : persona.archetype === 'legal'
    ? hasAny(sellerText, ['границ', 'ответствен', 'audit', 'trail', 'документ', 'огранич', 'warning']) && !marketingSlang
    : avgWords <= 40 && !marketingSlang && hasAny(sellerText, ['быстр', 'ручн', 'бардак', 'ops', 'время', 'удоб', 'эскалац', 'процесс']);

  let objectionHits = 0;
  if (persona.archetype === 'finance') {
    if (hasAny(sellerText, ['документ', 'kyc', 'audit', 'цепоч', 'ответствен', 'control'])) objectionHits++;
    if (hasAny(sellerText, ['sla', 'эскалац', 'статус', 'застр', 'поддерж', 'инцидент'])) objectionHits++;
    if (hasAny(sellerText, ['риск', 'ручн', 'сверк', 'tco', 'дорог', 'стоим'])) objectionHits++;
    if (hasAny(sellerText, ['ндфл', 'налог', 'россий', 'diligence', 'инвест'])) objectionHits++;
  } else if (persona.archetype === 'legal') {
    if (hasAny(sellerText, ['границ', 'ответствен', 'misclassification', 'overclaim'])) objectionHits++;
    if (hasAny(sellerText, ['audit', 'trail', 'trace', 'документ', 'warning', 'огранич'])) objectionHits++;
    if (hasAny(sellerText, ['процесс', 'flow', 'цепоч', 'инцидент', 'эскалац'])) objectionHits++;
    if (hasAny(sellerText, ['review', 'memo', 'walkthrough', 'follow-up', '15 минут', '20 минут'])) objectionHits++;
  } else {
    if (hasAny(sellerText, ['быстр', 'ручн', 'бардак', 'ops', 'выплат', 'эскалац'])) objectionHits++;
    if (hasAny(sellerText, ['15 минут', '20 минут', 'коротк', 'без долг', 'быстрый', 'follow-up'])) objectionHits++;
    if (hasAny(sellerText, ['стоим', 'эконом', 'время', 'команд', 'день', 'час'])) objectionHits++;
    if (hasAny(sellerText, ['wise', 'crypto', 'апгрейд', 'процесс', 'статус'])) objectionHits++;
  }
  const k4Pass = objectionHits >= 2;
  const k5Pass = hasAny(sellerText, ['созвон', 'звон', '15 минут', '20 минут', 'follow-up', 'follow up', 'на неделе', 'завтра', 'материал', 'расч', 'memo', 'walkthrough', 'review']);

  const passCount = [k1Pass, k2Pass, k3Pass, k4Pass, k5Pass].filter(Boolean).length;
  const verdict = blocker ? 'BLOCKER' : passCount >= 4 ? 'PASS' : passCount === 3 ? 'PASS_WITH_NOTES' : 'FAIL';

  function quote(matchers, fallback) { const found = seller.find(m => hasAny(m.toLowerCase(), matchers)); return found || fallback; }

  const criteria = [
    { id: 'K1', name: 'Contextual first contact', status: k1Pass ? 'PASS' : 'FAIL', short_reason: k1Pass ? 'Первое касание опирается на конкретный сигнал из карточки.' : 'Первое сообщение слишком общее и теряет контекст сигнала.', evidence_quote: seller[0] || 'Нет первого сообщения.' },
    { id: 'K2', name: 'Compliance and boundary of responsibility', status: k2Pass ? 'PASS' : 'FAIL', short_reason: blocker ? 'Продавец дал ложное обещание про misclassification.' : k2Pass ? 'Продавец обозначил зону контроля Mellow без магических обещаний.' : 'Нет ясной границы ответственности.', evidence_quote: quote(['misclassification', 'документ', 'kyc', 'audit', 'sla', 'налог', 'trail', 'ответствен'], seller[1] || seller[0] || 'Нет данных.'), blocking: blocker },
    { id: 'K3', name: 'Language fit', status: k3Pass ? 'PASS' : 'FAIL', short_reason: k3Pass ? 'Язык адаптирован под выбранную персону.' : 'Тон и подача не адаптированы под выбранную персону.', evidence_quote: quote(['риск', 'ответствен', 'бардак', 'быстр', 'ops', 'audit', 'trail', 'эскалац'], seller[0] || 'Нет данных.') },
    { id: 'K4', name: 'Handling core objections', status: k4Pass ? 'PASS' : 'FAIL', short_reason: k4Pass ? 'Минимум два ключевых возражения закрыты содержательно.' : 'Возражения закрыты слабо или не дожаты.', evidence_quote: quote(['sla', 'риск', 'ручн', 'стоим', 'время', 'апгрейд', 'trail', 'процесс'], seller[1] || seller[0] || 'Нет данных.'), objections: botMessages(session).slice(0, 4).map(text => ({ objection: text, result: k4Pass ? 'answered' : 'partial' })) },
    { id: 'K5', name: 'Next step', status: k5Pass ? 'PASS' : 'FAIL', short_reason: k5Pass ? 'Следующий шаг зафиксирован конкретно.' : 'Разговор закончился без чёткого next step.', evidence_quote: quote(['созвон', '15 минут', '20 минут', 'follow', 'материал', 'расч', 'memo', 'review'], seller[seller.length - 1] || 'Нет данных.') }
  ];

  const turningPointQuote = quote(['sla', 'бардак', 'ручн', '20 минут', '15 минут', 'документ', 'audit', 'trail', 'процесс'], seller[1] || seller[0] || 'Переломного момента не было.');
  const turningPointWhy = turningPointQuote === 'Переломного момента не было.' ? 'Продавец не дал реплику, которая заметно усилила доверие.' : 'Здесь продавец ушёл в конкретику и начал говорить на языке боли собеседника.';

  const failCriteria = criteria.filter(c => c.status === 'FAIL');
  const coaching_points = (failCriteria.length ? failCriteria : criteria.slice(0, 2)).slice(0, 2).map(c => ({
    quote: c.evidence_quote,
    what_is_wrong: c.short_reason,
    better_version: c.id === 'K2' ? 'Скажи прямо, что Mellow контролирует документы, KYC, платёжную цепь и audit trail, но не берёт на себя misclassification риск.'
      : c.id === 'K5' ? 'Зафиксируй next step явно: например, 20-минутный созвон на неделе, review memo или walkthrough с нужной функцией.'
      : c.id === 'K1' ? 'Открой диалог конкретной деталью из сигнала, а не общим pitch.'
      : c.id === 'K3' ? persona.archetype === 'finance' ? 'Говори языком риска, процесса, ответственности и стоимости ошибки.' : persona.archetype === 'legal' ? 'Говори аккуратно: границы, документы, audit trail и без overclaiming.' : 'Укороти сообщение и продавай speed/ops upgrade без marketing slang.'
      : 'Ответь на возражение механизмом, а не повтором общих тезисов.'
  }));

  const recommended_next_drill = blocker || (persona.archetype === 'finance' && !k2Pass) ? `repeat_${personaId}_boundary`
    : persona.archetype === 'ops' && !k3Pass ? `repeat_${personaId}_conciseness`
    : persona.archetype === 'legal' && !k2Pass ? `repeat_${personaId}_legal_scope`
    : 'advance_followup';

  return {
    assessment_id: randomId('assessment'),
    session_id: session.session_id,
    bot_id: personaId,
    verdict,
    verdict_label: verdictLabel(verdict),
    criteria: criteria.map(c => ({ ...c, label: criterionLabel(c.id) })),
    turning_point: { quote: turningPointQuote, why: turningPointWhy },
    coaching_points,
    summary_for_seller: verdict === 'PASS' ? 'Хороший прогон: ты держал контекст, отвечал по делу и довёл разговор до следующего шага.'
      : verdict === 'BLOCKER' ? 'Есть блокирующая ошибка: ты пообещал то, что Mellow не должен обещать.'
      : 'Прогон рабочий, но доверие и next step пока держатся не на всех ключевых местах.',
    recommended_next_drill,
    recommended_next_drill_label: recommendationLabel(recommended_next_drill, persona),
    created_at: now()
  };
}

// ==================== LANGUAGE DETECTION ====================

export function detectLanguage(text) {
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  return text.length > 0 && cyrillic / text.length > 0.25 ? 'ru' : 'en';
}

// ==================== COMPLETION TRIGGER ====================

export function isCompletionTrigger(text) {
  const t = text.trim().toLowerCase();
  return t === '/end' || t === '/стоп' || /\[финал:\s*\d+\]/i.test(text) || /\[final:\s*\d+\]/i.test(text);
}

// ==================== OPENING GREETING ====================

export function buildPersonaGreeting(personaId) {
  const greetings = {
    andrey: ['Слушаю.', 'Чем могу помочь?', 'Да, говорите.'],
    alexey: ['Привет.', 'Слушаю, быстро.', 'Говори — у меня минуты три.'],
    cfo_round: ['Слушаю вас.', 'Да, чем могу помочь?', 'Добрый день. Слушаю.'],
    eng_manager: ['Привет. Чем могу помочь?', 'Слушаю.', 'Да, говорите.'],
    ops_manager: ['Слушаю.', 'Да? Чем могу помочь?', 'Привет. Слушаю, коротко если можно.'],
    head_finance: ['Добрый день. Слушаю вас.', 'Слушаю.', 'Чем могу помочь?'],
    internal_legal: ['Слушаю.', 'Добрый день. Чем могу помочь?', 'Да, говорите.'],
    external_legal: ['Слушаю.', 'Добрый день.', 'Чем могу помочь?'],
  };
  return pick(greetings[personaId] || ['Слушаю.']);
}
