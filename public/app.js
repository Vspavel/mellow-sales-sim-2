const state = {
  personas: [],
  selectedPersonaId: '',
  session: null,
  lastHint: null,
  appliedHintId: null,
  editorMode: 'create',
  dialogueType: 'messenger',
  // Randomizer & random-factor settings (persisted to localStorage)
  randomizerConfig: {
    variability: 'medium',       // 'off' | 'low' | 'medium' | 'high'
    signal_types: [],            // [] = all types allowed
    random_factor_enabled: false,
    ghost_probability: 0.15,
    busy_probability: 0.10,
    defer_probability: 0.10,
  }
};

const personaSelect = document.getElementById('personaSelect');
const createPersonaBtn = document.getElementById('createPersonaBtn');
const personaEditor = document.getElementById('personaEditor');
const personaEditorTitle = document.getElementById('personaEditorTitle');
const personaForm = document.getElementById('personaForm');
const promptExtractBtn = document.getElementById('promptExtractBtn');
const promptExtractStatus = document.getElementById('promptExtractStatus');
const cancelPersonaBtn = document.getElementById('cancelPersonaBtn');
const savePersonaBtn = document.getElementById('savePersonaBtn');
const setupPanel = document.getElementById('setupPanel');
const selectedPersonaMeta = document.getElementById('selectedPersonaMeta');
const selectedPersonaPrompt = document.getElementById('selectedPersonaPrompt');
const requiredFieldsList = document.getElementById('requiredFieldsList');
const signalBrief = document.getElementById('signalBrief');
const signalCard = document.getElementById('signalCard');
const setupCta = document.getElementById('setupCta');
const startConvBtn = document.getElementById('startConversationBtn');
const runPanel = document.getElementById('runPanel');
const transcript = document.getElementById('transcript');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const reviewPanel = document.getElementById('reviewPanel');
const assessment = document.getElementById('assessment');
const finishBtn = document.getElementById('finishBtn');
const resetBtn = document.getElementById('resetBtn');
const openAnalyticsBtn = document.getElementById('openAnalyticsBtn');
const analyticsPanel = document.getElementById('analyticsPanel');
const analyticsGeneratedAt = document.getElementById('analyticsGeneratedAt');
const analyticsSuccessRate = document.getElementById('analyticsSuccessRate');
const analyticsFinishedRuns = document.getElementById('analyticsFinishedRuns');
const analyticsSuccessfulDialogs = document.getElementById('analyticsSuccessfulDialogs');
const analyticsPersonaTable = document.getElementById('analyticsPersonaTable');
const analyticsRecentRuns = document.getElementById('analyticsRecentRuns');
const analyticsDialogueCount = document.getElementById('analyticsDialogueCount');
const filterPersona = document.getElementById('filterPersona');
const filterOutcome = document.getElementById('filterOutcome');
const filterVerdict = document.getElementById('filterVerdict');
const sortDialogues = document.getElementById('sortDialogues');
const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
const backFromAnalyticsBtn = document.getElementById('backFromAnalyticsBtn');
const runStatus = document.getElementById('runStatus');
const runFocus = document.getElementById('runFocus');
const suggestBtn = document.getElementById('suggestBtn');
const hintLangSelect = document.getElementById('hintLangSelect');
const suggestionPanel = document.getElementById('suggestionPanel');
const suggestionMeta = document.getElementById('suggestionMeta');
const suggestionText = document.getElementById('suggestionText');
const useSuggestionBtn = document.getElementById('useSuggestionBtn');
const editPersonaBtn = document.getElementById('editPersonaBtn');
const deletePersonaBtn = document.getElementById('deletePersonaBtn');
const cancelPersonaBtn2 = document.getElementById('cancelPersonaBtn2');
const sendResultBtn = document.getElementById('sendResultBtn');
const sendResultStatus = document.getElementById('sendResultStatus');
const reviewTitle = document.getElementById('reviewTitle');
const dialogueTypeMessengerBtn = document.getElementById('dialogueTypeMessenger');
const dialogueTypeEmailBtn = document.getElementById('dialogueTypeEmail');
const dialogueTypeHint = document.getElementById('dialogueTypeHint');
const channelBadge = document.getElementById('channelBadge');
const selectedPersonaEmailPrompt = document.getElementById('selectedPersonaEmailPrompt');
const startAnotherBtn = document.getElementById('startAnotherBtn');
const addPersonaInlineBtn = document.getElementById('addPersonaInlineBtn');
const randomizerToggle = document.getElementById('randomizerToggle');
const randomizerPanel = document.getElementById('randomizerPanel');
const variabilitySelect = document.getElementById('variabilitySelect');
const signalTypeCheckboxes = () => [...document.querySelectorAll('.signal-type-cb')];
const randomFactorToggle = document.getElementById('randomFactorToggle');
const randomFactorPanel = document.getElementById('randomFactorPanel');
const ghostProbInput = document.getElementById('ghostProbInput');
const busyProbInput = document.getElementById('busyProbInput');
const deferProbInput = document.getElementById('deferProbInput');
const runSignalBadge = document.getElementById('runSignalBadge');
const runSignalPanel = document.getElementById('runSignalPanel');
const buyerStateTurnMeta = document.getElementById('buyerStateTurnMeta');
const buyerStateLivePanel = document.getElementById('buyerStateLivePanel');
const personaSummaryPanel = document.getElementById('personaSummaryPanel');
const personaSummaryCard = document.getElementById('personaSummaryCard');
const runSignalCard = document.getElementById('runSignalCard');
const composerFocus = document.getElementById('composerFocus');

let analyticsData = null;

const historyPanel = document.getElementById('historyPanel');
const historyMeta = document.getElementById('historyMeta');
const historyList = document.getElementById('historyList');
const historyBulkActions = document.getElementById('historyBulkActions');
const openHistoryBtn = document.getElementById('openHistoryBtn');
const backFromHistoryBtn = document.getElementById('backFromHistoryBtn');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const historySelectAllBtn = document.getElementById('historySelectAllBtn');
const historyDeselectAllBtn = document.getElementById('historyDeselectAllBtn');
const historyDownloadSelectedBtn = document.getElementById('historyDownloadSelectedBtn');
const historyDownloadAllBtn = document.getElementById('historyDownloadAllBtn');
const historyViewModal = document.getElementById('historyViewModal');
const historyViewTitle = document.getElementById('historyViewTitle');
const historyViewMeta = document.getElementById('historyViewMeta');
const historyViewVerdict = document.getElementById('historyViewVerdict');
const historyViewCriteria = document.getElementById('historyViewCriteria');
const historyViewTranscript = document.getElementById('historyViewTranscript');
const historyViewDownloadJson = document.getElementById('historyViewDownloadJson');
const historyViewDownloadMd = document.getElementById('historyViewDownloadMd');
const historyViewClose = document.getElementById('historyViewClose');
const backToHistoryBtn = document.getElementById('backToHistoryBtn');
const downloadResultBtn = document.getElementById('downloadResultBtn');
const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');

let historyData = [];
let historySelectedIds = new Set();

const LIVE_BUYER_STATE_DIMENSIONS = [
  ['patience', 'Patience'],
  ['trust', 'Trust'],
  ['interest', 'Interest'],
  ['perceived_value', 'Perceived value'],
  ['conversation_capacity', 'Conversation capacity'],
  ['clarity', 'Clarity'],
];

const LIVE_BUYER_METRIC_KEYS = [
  ['reply_likelihood', 'Reply likelihood'],
  ['next_step_likelihood', 'Next-step likelihood'],
  ['disengagement_risk', 'Disengagement risk'],
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sellerMessages() {
  return state.session?.transcript?.filter((m) => m.role === 'seller') || [];
}

function showPhase(phase) {
  setupPanel.classList.toggle('hidden', phase !== 'setup');
  runPanel.classList.toggle('hidden', phase !== 'run');
  reviewPanel.classList.toggle('hidden', phase !== 'review');
  analyticsPanel.classList.toggle('hidden', phase !== 'analytics');
  historyPanel.classList.toggle('hidden', phase !== 'history');
}

function badgeClass(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'PASS_WITH_NOTES') return 'note';
  return status === 'BLOCKER' ? 'blocker' : 'fail';
}

function signalTypeLabel(value) {
  return {
    COMPLIANCE_PRESSURE: 'Compliance check before legal review',
    PAIN_SIGNAL: 'Operational payment failure',
    FUNDRAISING_DILIGENCE: 'Post-round diligence preparation',
    TEAM_SCALING: 'Team growth and payment overload',
    OPERATIONS_OVERLOAD: 'Ops no longer coping manually',
    FINANCE_CONTROL_GAP: 'Finance needs more control and explainability',
    LEGAL_REVIEW_TRIGGER: 'Internal legal review of contractor process',
    OUTSIDE_COUNSEL_CHECK: 'External counsel checking current scheme'
  }[value] || value;
}

function heatLabel(value) {
  return {
    hot: 'Hot',
    warm: 'Warm',
    cold: 'Cold'
  }[String(value || '').toLowerCase()] || value;
}

function statusLabel(status) {
  return {
    PASS: 'Strong',
    PASS_WITH_NOTES: 'Good',
    FAIL: 'Weak',
    BLOCKER: 'Critical'
  }[status] || status;
}

function formatSignedDelta(value) {
  const numeric = Number(value || 0);
  if (!numeric) return '0';
  return numeric > 0 ? `+${numeric}` : `${numeric}`;
}

function formatProbability(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return `${Math.round(numeric * 100)}%`;
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${(numeric * 100).toFixed(1)}%`;
}

function buyerSignalLabel(signal) {
  return {
    healthy: 'Healthy',
    watch: 'Watch',
    risk: 'Risk',
    steady: 'Steady'
  }[signal] || signal;
}

function hintStageLabel(value) {
  return {
    opening: 'opening',
    follow_up: 'follow-up',
    closing: 'next-step'
  }[value] || value;
}

function latestBuyerStateTransition() {
  const sellerTurns = (state.session?.transcript || []).filter((message) => message.role === 'seller' && message.buyer_state_transition);
  return sellerTurns.length ? sellerTurns[sellerTurns.length - 1].buyer_state_transition : null;
}

function verdictBadgeClass(verdict) {
  if (verdict === 'PASS') return 'pass';
  if (verdict === 'PASS_WITH_NOTES') return 'note';
  if (verdict === 'BLOCKER') return 'blocker';
  return 'fail';
}

function renderDialogueCards(items, total) {
  if (!items.length) {
    analyticsRecentRuns.innerHTML = '<p class="muted">No dialogues match the current filter.</p>';
    analyticsDialogueCount.textContent = '';
    return;
  }
  const shown = items.length;
  const totalCount = total != null ? total : shown;
  analyticsDialogueCount.textContent = shown < totalCount
    ? `Showing ${shown} of ${totalCount} dialogues (most recent)`
    : `${shown} dialogue${shown !== 1 ? 's' : ''}`;

  const html = items.map((item) => {
    const successCriteria = (item.assessment_criteria || []).filter((c) => c.status === 'PASS' || c.status === 'PASS_WITH_NOTES');
    const failCriteria = (item.assessment_criteria || []).filter((c) => c.status === 'FAIL' || c.status === 'BLOCKER');
    const hasTactics = successCriteria.length > 0 || failCriteria.length > 0;
    const turningPoint = item.turning_point;

    const successList = successCriteria.length
      ? `<ul class="tactics-list tactics-list--success">${successCriteria.map((c) =>
          `<li><strong>${escapeHtml(c.label)}</strong>${c.short_reason ? ` — <span class="muted">${escapeHtml(c.short_reason)}</span>` : ''}</li>`
        ).join('')}</ul>`
      : '';

    const failList = failCriteria.length
      ? `<ul class="tactics-list tactics-list--fail">${failCriteria.map((c) =>
          `<li><strong>${escapeHtml(c.label)}</strong>${c.short_reason ? ` — <span class="muted">${escapeHtml(c.short_reason)}</span>` : ''}</li>`
        ).join('')}</ul>`
      : '';

    const tacticsSection = hasTactics ? `
      <div class="dialogue-tactics">
        ${successList ? `<div class="tactics-section"><span class="tactics-label tactics-label--success">What worked</span>${successList}</div>` : ''}
        ${failList ? `<div class="tactics-section"><span class="tactics-label tactics-label--fail">What didn't work</span>${failList}</div>` : ''}
      </div>` : '';

    const turningPointSection = turningPoint?.quote
      ? `<div class="turning-point-block"><span class="tactics-label">Turning point</span><blockquote class="turning-point-quote">${escapeHtml(turningPoint.quote)}</blockquote>${turningPoint.why ? `<p class="muted turning-point-why">${escapeHtml(turningPoint.why)}</p>` : ''}</div>`
      : '';

    const summarySection = item.assessment_summary
      ? `<p class="dialogue-assessment-summary muted">${escapeHtml(item.assessment_summary)}</p>`
      : '';

    const dialogueTypeBadge = item.dialogue_type === 'email'
      ? '<span class="channel-badge channel-badge--email">Email</span>'
      : '<span class="channel-badge channel-badge--messenger">Messenger</span>';

    const signalBadge = item.signal_type
      ? `<span class="signal-type-badge">${escapeHtml(item.signal_type.replace(/_/g, ' ').toLowerCase())}</span>`
      : '';

    const progressionScore = Number(item.progression_score);
    const progressionBadge = Number.isFinite(progressionScore)
      ? `<span class="progression-score-badge progression-score-badge--${progressionScore >= 70 ? 'high' : progressionScore >= 40 ? 'mid' : 'low'}">Score ${Math.round(progressionScore)}</span>`
      : '';

    const failureReasonBadge = item.failure_reason && item.failure_reason !== 'none' && !item.meeting_booked
      ? `<span class="signal-type-badge">${escapeHtml(item.failure_reason.replace(/_/g, ' '))}</span>`
      : '';

    return `
      <div class="analytics-dialogue-card">
        <div class="dialogue-card-header">
          <div class="dialogue-card-title">
            <strong>${escapeHtml(item.persona_name || item.persona_id || 'Unknown')}</strong>
            <div class="dialogue-card-meta muted">${escapeHtml(item.session_id || '')} · Turns: ${Number(item.seller_turns || 0)} · ${item.finished_at ? new Date(item.finished_at).toLocaleString() : ''}</div>
          </div>
          <div class="dialogue-card-badges">
            ${item.meeting_booked ? '<span class="badge pass">Meeting booked</span>' : '<span class="badge fail">No meeting</span>'}
            <span class="badge ${verdictBadgeClass(item.assessment_verdict)}">${escapeHtml(item.assessment_verdict || 'N/A')}</span>
            ${progressionBadge}
          </div>
        </div>
        <div class="dialogue-card-tags">${dialogueTypeBadge}${signalBadge}${failureReasonBadge}</div>
        ${summarySection}
        ${tacticsSection}
        ${turningPointSection}
        <details class="transcript-drilldown">
          <summary class="transcript-drilldown-toggle" data-session-id="${escapeHtml(item.session_id)}">Show transcript</summary>
          <div class="transcript-drilldown-body" id="transcript-body-${escapeHtml(item.session_id)}">
            <p class="muted">Loading…</p>
          </div>
        </details>
      </div>
    `;
  }).join('');

  analyticsRecentRuns.innerHTML = html;

  // Client-side sort within the loaded slice
  const sortVal = sortDialogues?.value || 'date_desc';
  const cards = analyticsRecentRuns.querySelectorAll('.analytics-dialogue-card');
  const cardArray = [...cards];
  const sortedItems = [...items];
  if (sortVal === 'date_asc') {
    sortedItems.sort((a, b) => new Date(a.finished_at || 0) - new Date(b.finished_at || 0));
  } else if (sortVal === 'persona') {
    sortedItems.sort((a, b) => (a.persona_name || '').localeCompare(b.persona_name || ''));
  } else if (sortVal === 'outcome') {
    sortedItems.sort((a, b) => Number(b.meeting_booked) - Number(a.meeting_booked));
  } else if (sortVal === 'score_desc') {
    sortedItems.sort((a, b) => Number(b.progression_score || 0) - Number(a.progression_score || 0));
  } else if (sortVal === 'score_asc') {
    sortedItems.sort((a, b) => Number(a.progression_score || 0) - Number(b.progression_score || 0));
  }
  // Re-order DOM if sort changed from default
  if (sortVal !== 'date_desc') {
    const indexMap = new Map(sortedItems.map((item, i) => [item.session_id, i]));
    cardArray.sort((a, b) => {
      const ia = indexMap.get(a.querySelector('[data-session-id]')?.dataset.sessionId) ?? 0;
      const ib = indexMap.get(b.querySelector('[data-session-id]')?.dataset.sessionId) ?? 0;
      return ia - ib;
    });
    cardArray.forEach((card) => analyticsRecentRuns.appendChild(card));
  }

  analyticsRecentRuns.querySelectorAll('.transcript-drilldown').forEach((details) => {
    details.addEventListener('toggle', async () => {
      if (!details.open) return;
      const summary = details.querySelector('summary');
      const sessionId = summary?.dataset.sessionId;
      if (!sessionId) return;
      const body = document.getElementById(`transcript-body-${sessionId}`);
      if (!body || body.dataset.loaded) return;
      try {
        const session = await api(`api/sessions/${sessionId}`);
        const messages = (session.transcript || []).filter((m) => m.role !== 'system');
        body.innerHTML = messages.length
          ? `<div class="transcript-messages">${messages.map((m) => `
              <div class="transcript-msg transcript-msg--${m.role}">
                <span class="transcript-msg-role">${m.role === 'seller' ? 'Seller' : 'Buyer'}</span>
                <p>${escapeHtml(m.text || '')}</p>
              </div>`).join('')}</div>`
          : '<p class="muted">No messages.</p>';
        body.dataset.loaded = '1';
      } catch {
        body.innerHTML = '<p class="muted">Failed to load transcript.</p>';
      }
    });
  });
}

function applyAnalyticsFilters() {
  const personaVal = filterPersona?.value || '';
  const outcomeVal = filterOutcome?.value || '';
  const verdictVal = filterVerdict?.value || '';

  // Server-side filters (persona, outcome, verdict) — re-fetch with new params
  loadAnalytics({
    personaId: personaVal || undefined,
    outcome: outcomeVal || undefined,
    verdict: verdictVal || undefined,
  }).catch((err) => {
    if (analyticsGeneratedAt) analyticsGeneratedAt.textContent = err.message || 'Failed to filter';
  });
}

async function loadAnalytics(options = {}) {
  analyticsGeneratedAt.textContent = 'Loading analytics...';
  analyticsPersonaTable.innerHTML = '';
  analyticsRecentRuns.innerHTML = '';
  analyticsData = null;

  const params = new URLSearchParams({ limit: '100' });
  if (options.personaId) params.set('personaId', options.personaId);
  if (options.outcome) params.set('outcome', options.outcome);
  if (options.verdict) params.set('verdict', options.verdict);

  const data = await api(`api/analytics?${params}`);
  analyticsData = data;

  analyticsGeneratedAt.textContent = `Updated ${new Date(data.generated_at).toLocaleString()}`;
  analyticsSuccessRate.textContent = formatPercent(data.totals?.meeting_booked_rate);
  analyticsFinishedRuns.textContent = String(data.totals?.finished_sessions ?? 0);
  analyticsSuccessfulDialogs.textContent = String(data.totals?.meeting_booked_count ?? 0);

  // Populate persona filter
  if (filterPersona) {
    const currentPersonaVal = options.personaId || '';
    const personas = data.persona_stats || [];
    filterPersona.innerHTML = '<option value="">All personas</option>' +
      personas.map((p) => `<option value="${escapeHtml(p.persona_id)}"${p.persona_id === currentPersonaVal ? ' selected' : ''}>${escapeHtml(p.persona_name || p.persona_id)}</option>`).join('');
  }
  if (filterOutcome && options.outcome) filterOutcome.value = options.outcome;
  if (filterVerdict && options.verdict) filterVerdict.value = options.verdict;

  const personaRows = (data.persona_stats || []).map((item) => `
    <div class="analytics-row">
      <div>
        <strong>${escapeHtml(item.persona_name || item.persona_id)}</strong>
        <div class="muted">${escapeHtml(item.persona_id || '')}</div>
      </div>
      <div>${item.runs}</div>
      <div>${formatPercent(item.meeting_booked_rate)}</div>
      <div>${item.meeting_booked_count}</div>
      <div>${item.avg_turns}</div>
      <div>${formatPercent(item.pass_rate)}</div>
    </div>
  `).join('');

  analyticsPersonaTable.innerHTML = personaRows
    ? `<div class="analytics-table analytics-table--personas">
        <div class="analytics-row analytics-row--head">
          <div>Persona</div>
          <div>Runs</div>
          <div>Booked %</div>
          <div>Meetings</div>
          <div>Avg turns</div>
          <div>Pass rate</div>
        </div>
        ${personaRows}
      </div>`
    : '<p class="muted">No finished runs yet.</p>';

  renderDialogueCards(data.recent_finished || [], data.recent_finished_total ?? (data.recent_finished || []).length);
}

function buyerStateSignalForMetric(key, value, buyerState = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'steady';
  if (key === 'conversation_capacity') {
    return numeric <= 1 ? 'risk' : numeric <= 2 ? 'watch' : 'healthy';
  }
  if (key === 'reply_likelihood' || key === 'next_step_likelihood') {
    return numeric < 0.2 ? 'risk' : numeric < 0.45 ? 'watch' : 'healthy';
  }
  if (key === 'disengagement_risk') {
    return numeric >= 0.7 ? 'risk' : numeric >= 0.4 ? 'watch' : 'healthy';
  }
  return numeric <= 25 ? 'risk' : numeric <= 45 ? 'watch' : 'healthy';
}

function formatBuyerMetricValue(key, value, buyerState = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  if (key === 'conversation_capacity') {
    const capacityMax = Number(buyerState.capacity_max);
    return Number.isFinite(capacityMax) ? `${Math.round(numeric)}/${Math.round(capacityMax)}` : String(Math.round(numeric));
  }
  if (key === 'reply_likelihood' || key === 'next_step_likelihood' || key === 'disengagement_risk') {
    return formatProbability(numeric);
  }
  return String(Math.round(numeric));
}

function formatBuyerMetricDelta(key, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Baseline';
  if (key === 'reply_likelihood' || key === 'next_step_likelihood' || key === 'disengagement_risk') {
    const points = Math.round(numeric * 100);
    return points > 0 ? `+${points}pp` : points < 0 ? `${points}pp` : '0pp';
  }
  return formatSignedDelta(Math.round(numeric));
}

function actualBuyerStateDelta(transition, key) {
  if (!transition) return null;
  const before = Number(transition.state_before?.[key]);
  const after = Number(transition.state_after?.[key]);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return Math.round(after - before);
}

function renderPersonaSummaryPanel() {
  if (!personaSummaryPanel) return;
  const card = state.session?.sde_card;
  if (!card) {
    personaSummaryPanel.innerHTML = '<p class="muted">Start a session to see the persona.</p>';
    return;
  }
  const contact = card.contact || {};
  const company = card.company || {};
  const persona = selectedPersona();
  const rows = [
    contact.name ? ['Name', contact.name] : null,
    contact.title ? ['Profession', contact.title] : null,
    persona?.role && persona.role !== contact.title ? ['Role', persona.role] : null,
    company.name ? ['Company', company.name] : null,
    company.hq ? ['Location', company.hq] : null,
  ].filter(Boolean);
  personaSummaryPanel.innerHTML = `
    <div class="meta-grid">
      ${rows.map(([label, value]) => `<div class="meta-item"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join('')}
    </div>
  `;
}

function renderRunSignalPanel() {
  if (!runSignalPanel) return;
  const card = state.session?.sde_card;
  if (!card) {
    runSignalPanel.innerHTML = '<p class="muted">Start a session to see the active signal.</p>';
    if (runSignalBadge) runSignalBadge.textContent = 'No active session';
    return;
  }

  if (runSignalBadge) runSignalBadge.textContent = 'Actual session signal';
  const hasSellerTurnsForSignal = (state.session?.transcript || []).some((m) => m.role === 'seller');
  runSignalPanel.innerHTML = `
    <div class="meta-grid run-signal-meta">
      <div class="meta-item"><strong>Signal type</strong><span>${escapeHtml(signalTypeLabel(card.signal_type))}</span></div>
      <div class="meta-item"><strong>Heat</strong><span>${escapeHtml(heatLabel(card.heat))}</span></div>
      <div class="meta-item"><strong>Outreach window</strong><span>${escapeHtml(card.outreach_window)}</span></div>
    </div>
    <p class="run-signal-text">${escapeHtml(card.rendered_text || card.what_happened || '')}</p>
    <div class="run-signal-details">
      <div class="detail-row"><strong>What happened</strong><span>${escapeHtml(card.what_happened)}</span></div>
      <div class="detail-row"><strong>Probable pain</strong><span>${escapeHtml(card.probable_pain)}</span></div>
      ${!hasSellerTurnsForSignal ? `<div class="detail-row"><strong>First-touch hint</strong><span>${escapeHtml(card.first_touch_hint)}</span></div>` : ''}
    </div>
  `;
}

function renderBuyerStateLivePanel() {
  if (!buyerStateLivePanel) return;
  const buyerState = state.session?.buyer_state;
  if (!buyerState) {
    buyerStateLivePanel.innerHTML = '<p class="muted">Start a session to see live buyer-state metrics.</p>';
    if (buyerStateTurnMeta) buyerStateTurnMeta.textContent = 'No active session';
    return;
  }

  const latestTransition = latestBuyerStateTransition();
  const turnIndex = Number(latestTransition?.turn_index || 0);
  if (buyerStateTurnMeta) {
    buyerStateTurnMeta.textContent = turnIndex
      ? `Synced to engine state after seller turn ${turnIndex}`
      : 'Baseline before first seller turn';
  }

  const hasSellerTurns = sellerMessages().length > 0;

  buyerStateLivePanel.innerHTML = `
    <div class="buyer-state-summary buyer-state-summary--live">
      <div class="buyer-state-grid">
        ${LIVE_BUYER_METRIC_KEYS.map(([key, label]) => {
          const currentValue = buyerState[key];
          const deltaValue = latestTransition?.derived_metrics_delta?.[key];
          const signal = buyerStateSignalForMetric(key, currentValue, buyerState);
          return `
            <article class="buyer-state-card">
              <div class="buyer-state-card-top">
                <strong>${escapeHtml(label)}</strong>
                <span class="badge ${signal === 'risk' ? 'blocker' : signal === 'watch' ? 'note' : 'pass'}">${escapeHtml(buyerSignalLabel(signal))}</span>
              </div>
              <div class="buyer-state-value-row">
                <span class="buyer-state-value">${escapeHtml(formatBuyerMetricValue(key, currentValue, buyerState))}</span>
                <span class="buyer-state-delta ${Number(deltaValue) > 0 ? 'buyer-state-delta--up' : Number(deltaValue) < 0 ? 'buyer-state-delta--down' : ''}">${escapeHtml(formatBuyerMetricDelta(key, deltaValue))}</span>
              </div>
            </article>
          `;
        }).join('')}
      </div>
      <details class="buyer-state-breakdown"${hasSellerTurns ? '' : ' open'}>
        <summary>State breakdown</summary>
        <div class="buyer-state-grid">
          ${LIVE_BUYER_STATE_DIMENSIONS.map(([key, label]) => {
            const currentValue = buyerState[key];
            const deltaValue = actualBuyerStateDelta(latestTransition, key);
            const signal = buyerStateSignalForMetric(key, currentValue, buyerState);
            return `
              <article class="buyer-state-card">
                <div class="buyer-state-card-top">
                  <strong>${escapeHtml(label)}</strong>
                  <span class="badge ${signal === 'risk' ? 'blocker' : signal === 'watch' ? 'note' : 'pass'}">${escapeHtml(buyerSignalLabel(signal))}</span>
                </div>
                <div class="buyer-state-value-row">
                  <span class="buyer-state-value">${escapeHtml(formatBuyerMetricValue(key, currentValue, buyerState))}</span>
                  <span class="buyer-state-delta ${Number(deltaValue) > 0 ? 'buyer-state-delta--up' : Number(deltaValue) < 0 ? 'buyer-state-delta--down' : ''}">${escapeHtml(formatBuyerMetricDelta(key, deltaValue))}</span>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </details>
    </div>
  `;
}

function renderRunOverview() {
  renderPersonaSummaryPanel();
  renderRunSignalPanel();
  renderBuyerStateLivePanel();
}

function formatHintMemoryMeta(memoryContext) {
  if (!memoryContext || typeof memoryContext !== 'object') {
    return 'Memory loop: no prior examples yet.';
  }
  const wins = Array.isArray(memoryContext.successful) ? memoryContext.successful.length : 0;
  const losses = Array.isArray(memoryContext.unsuccessful) ? memoryContext.unsuccessful.length : 0;
  const best = wins ? memoryContext.successful[0] : null;
  const avoid = losses ? memoryContext.unsuccessful[0] : null;
  const parts = [`Memory loop: ${wins} win${wins === 1 ? '' : 's'}, ${losses} loss${losses === 1 ? '' : 'es'}.`];
  if (best) {
    parts.push(`Best match: ${hintStageLabel(best.turn_stage)}${best.active_concern ? ` / ${best.active_concern}` : ''}.`);
  }
  if (avoid) {
    parts.push(`Avoid repeating: ${hintStageLabel(avoid.turn_stage)}${avoid.active_concern ? ` / ${avoid.active_concern}` : ''}.`);
  }
  return parts.join(' ');
}

function roleEssence(persona) {
  return persona.intro || persona.prompt_style?.[0] || 'Custom buyer persona';
}

function renderPersonaDropdown() {
  const current = personaSelect.value;
  personaSelect.innerHTML = '<option value="">Choose a role...</option>';
  state.personas.forEach((persona) => {
    const opt = document.createElement('option');
    opt.value = persona.id;
    opt.textContent = persona.role;
    if (persona.id === state.selectedPersonaId) opt.selected = true;
    personaSelect.appendChild(opt);
  });
  if (!state.selectedPersonaId && current) personaSelect.value = current;
}

function selectedPersona() {
  return state.personas.find((persona) => persona.id === state.selectedPersonaId) || null;
}

function renderSetupPersona() {
  const persona = selectedPersona();
  if (!persona) {
    selectedPersonaMeta.textContent = '';
    setupCta.classList.add('hidden');
    editPersonaBtn.classList.add('hidden');
    signalBrief.classList.add('hidden');
    if (selectedPersonaPrompt) selectedPersonaPrompt.textContent = '';
    if (selectedPersonaEmailPrompt) selectedPersonaEmailPrompt.textContent = '';
    requiredFieldsList.innerHTML = '';
    return;
  }

  selectedPersonaMeta.textContent = roleEssence(persona);
  editPersonaBtn.classList.remove('hidden');
  if (selectedPersonaPrompt) {
    selectedPersonaPrompt.textContent = persona.system_prompt || 'No system prompt yet. Add one in the persona editor.';
  }
  if (selectedPersonaEmailPrompt) {
    selectedPersonaEmailPrompt.textContent = persona.email_prompt || 'No email behavior layer. Add one in the persona editor.';
  }
  requiredFieldsList.innerHTML = (persona.required_fields || []).length
    ? persona.required_fields.map((field) => `<li><strong>${escapeHtml(field.label)}</strong><span>${escapeHtml(field.helpText || 'Required field for managed editing.')}</span></li>`).join('')
    : '<li><span>No field schema yet.</span></li>';
}

function setDialogueType(type) {
  state.dialogueType = type === 'email' ? 'email' : 'messenger';
  dialogueTypeMessengerBtn?.classList.toggle('is-active', state.dialogueType === 'messenger');
  dialogueTypeEmailBtn?.classList.toggle('is-active', state.dialogueType === 'email');
  if (dialogueTypeHint) {
    dialogueTypeHint.textContent = state.dialogueType === 'email'
      ? 'Formal email format. Include greeting, structured body, and sign-off in every message.'
      : 'Short, conversational turns. Think LinkedIn DM or Telegram.';
  }
  // Recreate session with new dialogue type if persona already selected
  if (state.selectedPersonaId) {
    selectPersona(state.selectedPersonaId);
  }
}

function renderSignalCard() {
  const { sde_card: card, bot_name } = state.session;
  signalCard.innerHTML = `
    <div class="meta-grid">
      <div class="meta-item"><strong>Persona</strong><span>${escapeHtml(bot_name)}</span></div>
      <div class="meta-item"><strong>Signal</strong><span>${escapeHtml(signalTypeLabel(card.signal_type))}</span></div>
      <div class="meta-item"><strong>Outreach window</strong><span>${escapeHtml(card.outreach_window)}</span></div>
      <div class="meta-item"><strong>Heat</strong><span>${escapeHtml(heatLabel(card.heat))}</span></div>
    </div>
    <div class="detail-cols">
      <div class="detail-section">
        <h3>Context</h3>
        <div class="detail-row"><strong>What happened</strong><span>${escapeHtml(card.what_happened)}</span></div>
        <div class="detail-row"><strong>Probable pain</strong><span>${escapeHtml(card.probable_pain)}</span></div>
        <div class="detail-row"><strong>First touch hint</strong><span>${escapeHtml(card.first_touch_hint)}</span></div>
        <p class="context-note">${escapeHtml(card.rendered_text)}</p>
      </div>
      <div class="detail-section">
        <h3>Boundaries</h3>
        <div class="detail-row"><strong>Company</strong><span>${escapeHtml(card.company.name)}, ${escapeHtml(card.company.industry)}, ${escapeHtml(card.company.size)}</span></div>
        <div class="detail-row"><strong>Channel</strong><span>${escapeHtml(card.recommended_channel)}</span></div>
        <div class="detail-row"><strong>Don't do</strong><ul class="dont-list">${(card.dont_do || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
      </div>
    </div>
  `;
}

function bubble(message) {
  const frag = document.createDocumentFragment();
  const el = document.createElement('div');
  if (message.role === 'system') {
    el.className = 'bubble system-note';
    el.textContent = message.text;
    frag.appendChild(el);
    return frag;
  }
  el.className = `bubble ${message.role}`;
  el.textContent = message.text;
  frag.appendChild(el);

  if (message.role === 'seller' && message.buyer_state_transition) {
    const t = message.buyer_state_transition;
    const notes = t.coaching_notes || [];
    const flags = t.risk_flags || [];
    const isCritical = flags.includes('overclaim_scope');
    const isNearDisengage = flags.includes('near_disengagement');
    if (notes.length || isCritical || isNearDisengage) {
      const coaching = document.createElement('div');
      coaching.className = 'turn-coaching' + (isCritical ? ' turn-coaching--critical' : '');
      if (isCritical) {
        const s = document.createElement('span');
        s.className = 'turn-coaching-flag';
        s.textContent = 'Overclaim — trust dropped sharply';
        coaching.appendChild(s);
      } else if (isNearDisengage) {
        const s = document.createElement('span');
        s.className = 'turn-coaching-flag turn-coaching-flag--warn';
        s.textContent = 'Buyer near disengagement';
        coaching.appendChild(s);
      }
      notes.forEach((note) => {
        const p = document.createElement('p');
        p.textContent = note;
        coaching.appendChild(p);
      });
      frag.appendChild(coaching);
    }
  }

  return frag;
}

function updateRunState() {
  const count = sellerMessages().length;
  finishBtn.disabled = count === 0;
  const persona = selectedPersona();
  const isEmail = state.session?.dialogue_type === 'email';

  runStatus.textContent = !state.session
    ? 'Prepare your signal'
    : count === 0
    ? 'Ready, send your first message'
    : count === 1
    ? 'First touch sent'
    : `Conversation active · ${count} messages`;

  if (isEmail) {
    runFocus.textContent = count === 0
      ? 'Email mode: include greeting, substantive body, and sign-off in every message.'
      : 'Email: formal greeting · structured body · sign-off. Keep it under 150 words.';
  } else {
    runFocus.textContent = !state.session || count === 0
      ? 'Open through a specific signal, not a generic pitch.'
      : persona?.archetype === 'finance'
      ? 'Language of control, responsibility boundaries, and explainability.'
      : persona?.archetype === 'legal'
      ? 'Documents, traceability, process safeguards, no overclaiming.'
      : 'Keep it short, specific, operational-first.';
  }

  if (channelBadge) {
    const type = state.session?.dialogue_type || 'messenger';
    channelBadge.textContent = type === 'email' ? 'Email' : 'Messenger';
    channelBadge.className = `channel-badge channel-badge--${type}`;
  }

  if (composerFocus) composerFocus.textContent = runFocus.textContent;

  if (count === 0) {
    personaSummaryCard?.classList.remove('is-collapsed');
    runSignalCard?.classList.remove('is-collapsed');
  } else if (count === 1 && !personaSummaryCard?.classList.contains('is-collapsed')) {
    personaSummaryCard?.classList.add('is-collapsed');
    runSignalCard?.classList.add('is-collapsed');
  }

  renderRunOverview();
}

function renderTranscript() {
  transcript.innerHTML = '';
  (state.session?.transcript || []).forEach((m) => transcript.appendChild(bubble(m)));
  transcript.scrollTop = transcript.scrollHeight;
  updateRunState();
}

function renderAssessment(fromHistory = false) {
  const a = state.session.assessment;
  reviewTitle.textContent = 'Run result';
  // sendResultBtn replaced by native artifact download
  sendResultStatus.textContent = '';

  // History-aware buttons
  downloadResultBtn?.classList.remove('hidden');
  copyShareLinkBtn?.classList.remove('hidden');
  if (fromHistory) {
    backToHistoryBtn?.classList.remove('hidden');
    startAnotherBtn?.classList.add('hidden');
  } else {
    backToHistoryBtn?.classList.add('hidden');
    startAnotherBtn?.classList.remove('hidden');
  }

  const strengths = a.criteria.filter((c) => c.status === 'PASS' || c.status === 'PASS_WITH_NOTES').slice(0, 3);
  const weaknesses = a.criteria.filter((c) => c.status === 'FAIL' || c.status === 'BLOCKER').slice(0, 3);

  const coachingItemHtml = (c) => `
    <div class="coaching-item">
      <div class="coaching-item-head">
        <span class="badge ${badgeClass(c.status)}">${escapeHtml(statusLabel(c.status))}</span>
        <strong>${escapeHtml(c.label || c.name || c.id)}</strong>
      </div>
      <p>${escapeHtml(c.short_reason)}</p>
      ${c.evidence_quote ? `<p class="muted">Evidence: ${escapeHtml(c.evidence_quote)}</p>` : ''}
    </div>
  `;

  const buyerStateReport = a.buyer_state_report;
  const buyerStateSection = buyerStateReport ? `
    <section class="assessment-block">
      <p class="coaching-section-title">Buyer state</p>
      <div class="buyer-state-summary">
        <div class="buyer-state-grid">
          ${buyerStateReport.dimension_summary.map((item) => `
            <article class="buyer-state-card">
              <div class="buyer-state-card-top">
                <strong>${escapeHtml(item.label)}</strong>
                <span class="badge ${item.signal === 'risk' ? 'blocker' : item.signal === 'watch' ? 'note' : 'pass'}">${escapeHtml(buyerSignalLabel(item.signal))}</span>
              </div>
              <div class="buyer-state-value-row">
                <span class="buyer-state-value">${escapeHtml(String(item.end))}</span>
                <span class="buyer-state-delta ${item.delta > 0 ? 'buyer-state-delta--up' : item.delta < 0 ? 'buyer-state-delta--down' : ''}">${escapeHtml(formatSignedDelta(item.delta))}</span>
              </div>
              <p class="muted">Start ${escapeHtml(String(item.start))}</p>
            </article>
          `).join('')}
        </div>
        <div class="buyer-state-metrics">
          <div class="meta-item"><strong>Reply likelihood</strong><span>${escapeHtml(formatProbability(buyerStateReport.final_metrics.reply_likelihood))}</span></div>
          <div class="meta-item"><strong>Next-step likelihood</strong><span>${escapeHtml(formatProbability(buyerStateReport.final_metrics.next_step_likelihood))}</span></div>
          <div class="meta-item"><strong>Disengagement risk</strong><span>${escapeHtml(formatProbability(buyerStateReport.final_metrics.disengagement_risk))}</span></div>
        </div>
      </div>
    </section>

    <section class="assessment-block">
      <p class="coaching-section-title">Buyer-state moments</p>
      <div class="coaching-list">
        ${buyerStateReport.strongest_positive_turn ? `
          <div class="coaching-item">
            <div class="coaching-item-head">
              <span class="badge pass">Best turn</span>
              <strong>Turn ${escapeHtml(String(buyerStateReport.strongest_positive_turn.turn_index))}</strong>
            </div>
            <p>${escapeHtml(buyerStateReport.strongest_positive_turn.seller_message)}</p>
            <p class="muted">${escapeHtml((buyerStateReport.strongest_positive_turn.explanation || []).join(' '))}</p>
          </div>
        ` : ''}
        ${buyerStateReport.biggest_damage_turn ? `
          <div class="coaching-item">
            <div class="coaching-item-head">
              <span class="badge blocker">Damage turn</span>
              <strong>Turn ${escapeHtml(String(buyerStateReport.biggest_damage_turn.turn_index))}</strong>
            </div>
            <p>${escapeHtml(buyerStateReport.biggest_damage_turn.seller_message)}</p>
            <p class="muted">${escapeHtml((buyerStateReport.biggest_damage_turn.explanation || []).join(' '))}</p>
          </div>
        ` : ''}
        ${buyerStateReport.highest_risk_turn ? `
          <div class="coaching-item">
            <div class="coaching-item-head">
              <span class="badge note">Highest risk</span>
              <strong>Turn ${escapeHtml(String(buyerStateReport.highest_risk_turn.turn_index))}</strong>
            </div>
            <p>${escapeHtml(buyerStateReport.highest_risk_turn.seller_message)}</p>
            <p class="muted">${escapeHtml((buyerStateReport.highest_risk_turn.explanation || []).join(' '))}</p>
          </div>
        ` : ''}
      </div>
    </section>
  ` : '';

  const sellerTurnsWithCoaching = (state.session?.transcript || [])
    .filter((m) => m.role === 'seller' && m.buyer_state_transition)
    .filter((m) => (m.buyer_state_transition.coaching_notes || []).length > 0 || (m.buyer_state_transition.risk_flags || []).includes('overclaim_scope'));

  const turnCoachingSection = sellerTurnsWithCoaching.length ? `
    <details class="criteria-details">
      <summary>Turn-by-turn coaching (${sellerTurnsWithCoaching.length} note${sellerTurnsWithCoaching.length > 1 ? 's' : ''})</summary>
      <div class="coaching-list" style="margin-top:12px">
        ${sellerTurnsWithCoaching.map((m) => {
          const t = m.buyer_state_transition;
          const notes = t.coaching_notes || [];
          const flags = t.risk_flags || [];
          const delta = t.predicted_delta || {};
          const trustLabel = delta.trust ? (delta.trust > 0 ? `Trust +${delta.trust}` : `Trust ${delta.trust}`) : '';
          const clarityLabel = delta.clarity ? (delta.clarity > 0 ? `Clarity +${delta.clarity}` : `Clarity ${delta.clarity}`) : '';
          return `
            <div class="coaching-item${flags.includes('overclaim_scope') ? ' coaching-item--critical' : ''}">
              <div class="coaching-item-head">
                <span class="badge ${flags.includes('overclaim_scope') ? 'blocker' : 'note'}">Turn ${escapeHtml(String(t.turn_index))}</span>
                ${trustLabel ? `<span class="turn-delta ${delta.trust > 0 ? 'turn-delta--up' : 'turn-delta--down'}">${escapeHtml(trustLabel)}</span>` : ''}
                ${clarityLabel ? `<span class="turn-delta ${delta.clarity > 0 ? 'turn-delta--up' : 'turn-delta--down'}">${escapeHtml(clarityLabel)}</span>` : ''}
              </div>
              <p class="muted">${escapeHtml(m.text.length > 130 ? m.text.slice(0, 127) + '…' : m.text)}</p>
              ${notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('')}
            </div>`;
        }).join('')}
      </div>
    </details>
  ` : '';

  assessment.innerHTML = `
    <div class="assessment-layout">
      <section class="assessment-block coaching-verdict">
        <span class="badge ${badgeClass(a.verdict)}">${escapeHtml(a.verdict_label || a.verdict)}</span>
        <p>${escapeHtml(a.summary_for_seller)}</p>
      </section>

      ${buyerStateSection}

      ${strengths.length ? `
      <section class="assessment-block">
        <p class="coaching-section-title">Strongest moves</p>
        <div class="coaching-list">${strengths.map(coachingItemHtml).join('')}</div>
      </section>` : ''}

      ${weaknesses.length ? `
      <section class="assessment-block">
        <p class="coaching-section-title">Weak moves</p>
        <div class="coaching-list">${weaknesses.map(coachingItemHtml).join('')}</div>
      </section>` : ''}

      <section class="assessment-block">
        <p class="coaching-section-title">Coaching note</p>
        <p>${escapeHtml(a.turning_point.quote)}</p>
        <p class="muted">${escapeHtml(a.turning_point.why)}</p>
      </section>

      ${turnCoachingSection}

      <details class="criteria-details">
        <summary>Full breakdown</summary>
        <div class="criteria">
          ${a.criteria.map((c) => `
            <article class="criterion">
              <div class="criterion-head">
                <strong>${escapeHtml(c.id)}. ${escapeHtml(c.label || c.name || c.id)}</strong>
                <span class="badge ${badgeClass(c.status)}">${escapeHtml(statusLabel(c.status))}</span>
              </div>
              <p>${escapeHtml(c.short_reason)}</p>
              <p class="muted">Evidence: ${escapeHtml(c.evidence_quote)}</p>
            </article>
          `).join('')}
        </div>
      </details>
    </div>
  `;
}

async function loadPersonas() {
  state.personas = await api('api/personas');
  if (!state.selectedPersonaId && state.personas[0]) {
    state.selectedPersonaId = state.personas[0].id;
  }
  renderPersonaDropdown();
  renderSetupPersona();
}

async function selectPersona(personaId) {
  state.selectedPersonaId = personaId;
  state.session = null;
  state.lastHint = null;
  state.appliedHintId = null;
  transcript.innerHTML = '';
  assessment.innerHTML = '';
  signalBrief.classList.add('hidden');
  setupCta.classList.add('hidden');
  suggestionPanel.classList.add('hidden');
  if (suggestionMeta) suggestionMeta.textContent = '';
  resetBtn.classList.add('hidden');
  renderPersonaDropdown();
  renderSetupPersona();
  showPhase('setup');
  updateRunState();

  if (!personaId) return;

  try {
    state.session = await api('api/sessions', {
      method: 'POST',
      body: JSON.stringify({ personaId, dialogueType: state.dialogueType, randomizerConfig: state.randomizerConfig })
    });
    renderSignalCard();
    signalBrief.classList.remove('hidden');
    setupCta.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
  } catch (error) {
    signalCard.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
    signalBrief.classList.remove('hidden');
  }
}

function defaultNewCard() {
  return [{
    signal_type: 'PAIN_SIGNAL',
    heat: 'warm',
    outreach_window: '7 days',
    contact: { name: 'New Contact', title: 'Decision maker', linkedin: '' },
    company: { name: 'NewCo', industry: 'Technology', size: '50 employees', hq: 'Remote', founded_year: 2026, latest_event: 'Team is looking for a more manageable contractor flow.' },
    what_happened: 'Manual coordination and unpredictable payout statuses appeared.',
    apollo_context: ['Describe 2-3 facts that make the signal plausible'],
    target_profile: 'A',
    probable_pain: 'Manual overhead and loss of predictability.',
    recommended_product: 'CM',
    recommended_channel: 'email',
    first_touch_hint: 'Open with a specific pain, not a generic pitch.',
    dont_do: ['Do not overpromise'],
    rendered_text: 'Signal: team is tired of manual contractor/payment flow and wants a more manageable scenario.'
  }];
}

function fillPersonaForm(persona) {
  personaForm.elements.id.value = persona?.id || '';
  personaForm.elements.name.value = persona?.name || '';
  personaForm.elements.role.value = persona?.role || '';
  personaForm.elements.intro.value = persona?.intro || '';
  personaForm.elements.archetype.value = persona?.archetype || 'custom';
  personaForm.elements.tone.value = persona?.tone || 'balanced';
  personaForm.elements.system_prompt.value = persona?.system_prompt || '';
  if (personaForm.elements.email_prompt) personaForm.elements.email_prompt.value = persona?.email_prompt || '';
  personaForm.elements.required_fields.value = JSON.stringify(persona?.required_fields || [], null, 2);
  personaForm.elements.cards.value = JSON.stringify(persona?.cards || defaultNewCard(), null, 2);
  promptExtractStatus.textContent = '';
}

function openPersonaEditor(mode) {
  state.editorMode = mode;
  const persona = mode === 'edit' ? selectedPersona() : null;
  personaEditorTitle.textContent = mode === 'edit' ? 'Edit role' : 'Add role';
  fillPersonaForm(persona);
  deletePersonaBtn.classList.toggle('hidden', mode !== 'edit');
  personaEditor.classList.remove('hidden');
  if (mode === 'create') personaForm.elements.system_prompt.focus();
}

function closePersonaEditor() {
  personaEditor.classList.add('hidden');
}

async function extractFromPrompt() {
  const systemPrompt = personaForm.elements.system_prompt.value.trim();
  if (!systemPrompt) {
    promptExtractStatus.textContent = 'Add a system prompt first.';
    return;
  }

  promptExtractBtn.disabled = true;
  try {
    const result = await api('api/personas/extract-from-prompt', {
      method: 'POST',
      body: JSON.stringify({ system_prompt: systemPrompt })
    });
    const draft = result.draft || {};
    if (!personaForm.elements.name.value.trim() && draft.name) personaForm.elements.name.value = draft.name;
    if (draft.role) personaForm.elements.role.value = draft.role;
    if (draft.intro) personaForm.elements.intro.value = draft.intro;
    personaForm.elements.required_fields.value = JSON.stringify(draft.required_fields || [], null, 2);
    if (!personaForm.elements.cards.value.trim()) {
      personaForm.elements.cards.value = JSON.stringify(defaultNewCard(), null, 2);
    }
    promptExtractStatus.textContent = result.extracted
      ? 'Prompt variables extracted and defaults applied.'
      : 'Extraction was weak, role #1 defaults were applied.';
  } catch (error) {
    promptExtractStatus.textContent = error.message;
  } finally {
    promptExtractBtn.disabled = false;
  }
}

// Persona dropdown
personaSelect.addEventListener('change', () => {
  selectPersona(personaSelect.value);
});

// Persona editor
personaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  savePersonaBtn.disabled = true;
  try {
    if (state.editorMode === 'create' && !personaForm.elements.required_fields.value.trim()) {
      await extractFromPrompt();
    }

    const payload = {
      id: personaForm.elements.id.value.trim() || undefined,
      name: personaForm.elements.name.value.trim(),
      role: personaForm.elements.role.value.trim(),
      intro: personaForm.elements.intro.value.trim(),
      archetype: personaForm.elements.archetype.value.trim(),
      tone: personaForm.elements.tone.value.trim(),
      system_prompt: personaForm.elements.system_prompt.value.trim(),
      email_prompt: personaForm.elements.email_prompt?.value?.trim() || '',
      required_fields: JSON.parse(personaForm.elements.required_fields.value || '[]'),
      cards: JSON.parse(personaForm.elements.cards.value || '[]')
    };

    const result = state.editorMode === 'edit'
      ? await api(`api/personas/${state.selectedPersonaId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await api('api/personas', { method: 'POST', body: JSON.stringify(payload) });

    await loadPersonas();
    await selectPersona(result.id);
    closePersonaEditor();
  } catch (error) {
    alert(`Failed to save persona: ${error.message}`);
  } finally {
    savePersonaBtn.disabled = false;
  }
});

promptExtractBtn.addEventListener('click', extractFromPrompt);
createPersonaBtn.addEventListener('click', () => openPersonaEditor('create'));
openAnalyticsBtn?.addEventListener('click', async () => {
  showPhase('analytics');
  try {
    await loadAnalytics();
  } catch (error) {
    analyticsGeneratedAt.textContent = error.message || 'Failed to load analytics';
  }
});
refreshAnalyticsBtn?.addEventListener('click', async () => {
  try {
    await loadAnalytics();
  } catch (error) {
    analyticsGeneratedAt.textContent = error.message || 'Failed to refresh analytics';
  }
});
backFromAnalyticsBtn?.addEventListener('click', () => showPhase('setup'));
filterPersona?.addEventListener('change', applyAnalyticsFilters);
filterOutcome?.addEventListener('change', applyAnalyticsFilters);
filterVerdict?.addEventListener('change', applyAnalyticsFilters);
sortDialogues?.addEventListener('change', () => {
  // Sort within currently loaded items without re-fetching
  if (!analyticsData?.recent_finished?.length) return;
  const items = [...(analyticsData.recent_finished || [])];
  renderDialogueCards(items, analyticsData.recent_finished_total);
});
addPersonaInlineBtn?.addEventListener('click', () => openPersonaEditor('create'));
editPersonaBtn.addEventListener('click', () => openPersonaEditor('edit'));
cancelPersonaBtn.addEventListener('click', closePersonaEditor);
cancelPersonaBtn2.addEventListener('click', closePersonaEditor);

deletePersonaBtn.addEventListener('click', async () => {
  const persona = selectedPersona();
  if (!persona) return;
  if (!confirm(`Delete persona "${persona.role}"? This cannot be undone.`)) return;
  deletePersonaBtn.disabled = true;
  try {
    await api(`api/personas/${persona.id}`, { method: 'DELETE' });
    closePersonaEditor();
    state.selectedPersonaId = '';
    await loadPersonas();
    if (state.personas[0]) {
      await selectPersona(state.personas[0].id);
    } else {
      renderSetupPersona();
    }
  } catch (error) {
    alert(`Failed to delete persona: ${error.message}`);
  } finally {
    deletePersonaBtn.disabled = false;
  }
});

// Segmented control
dialogueTypeMessengerBtn?.addEventListener('click', () => setDialogueType('messenger'));
dialogueTypeEmailBtn?.addEventListener('click', () => setDialogueType('email'));

// Run phase
startConvBtn.addEventListener('click', () => {
  showPhase('run');
  updateRunState();
  const isEmail = state.session?.dialogue_type === 'email';
  messageInput.placeholder = isEmail
    ? 'Hi [Name],\n\n[Your message here]\n\nBest, [Your name]'
    : 'Write your first touch or next message';
  messageInput.focus();
});

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.session) return;
  const text = messageInput.value.trim();
  if (!text) return;
  messageInput.value = '';
  const result = await api(`api/sessions/${state.session.session_id}/message`, {
    method: 'POST',
    body: JSON.stringify({ text, hintId: state.appliedHintId })
  });
  state.appliedHintId = null;
  state.session = result.session;
  renderTranscript();
});

finishBtn.addEventListener('click', async () => {
  if (!state.session || sellerMessages().length === 0) return;
  state.session = await api(`api/sessions/${state.session.session_id}/finish`, { method: 'POST' });
  renderTranscript();
  renderAssessment();
  showPhase('review');
});

suggestBtn.addEventListener('click', async () => {
  if (!state.session) return;
  suggestBtn.disabled = true;
  try {
    const lang = hintLangSelect ? hintLangSelect.value : 'ru';
    const result = await api(`api/sessions/${state.session.session_id}/seller-suggest?lang=${lang}`);
    state.lastHint = {
      id: result.hint_id || null,
      text: result.suggestion || '',
      memoryContext: result.memory_context || null
    };
    state.appliedHintId = null;
    if (suggestionMeta) suggestionMeta.textContent = formatHintMemoryMeta(result.memory_context);
    suggestionText.textContent = result.suggestion;
    suggestionPanel.classList.remove('hidden');
  } catch {
    state.lastHint = null;
    state.appliedHintId = null;
    if (suggestionMeta) suggestionMeta.textContent = '';
    suggestionText.textContent = 'Could not get a hint.';
    suggestionPanel.classList.remove('hidden');
  } finally {
    suggestBtn.disabled = false;
  }
});

useSuggestionBtn.addEventListener('click', () => {
  messageInput.value = suggestionText.textContent;
  state.appliedHintId = state.lastHint?.id || null;
  suggestionPanel.classList.add('hidden');
  messageInput.focus();
});

// Reset / start another run
function resetToSetup() {
  state.session = null;
  state.lastHint = null;
  state.appliedHintId = null;
  transcript.innerHTML = '';
  assessment.innerHTML = '';
  sendResultBtn.classList.add('hidden');
  sendResultStatus.textContent = '';
  downloadResultBtn?.classList.add('hidden');
  copyShareLinkBtn?.classList.add('hidden');
  backToHistoryBtn?.classList.add('hidden');
  signalBrief.classList.add('hidden');
  setupCta.classList.add('hidden');
  suggestionPanel.classList.add('hidden');
  if (suggestionMeta) suggestionMeta.textContent = '';
  resetBtn.classList.add('hidden');
  if (state.selectedPersonaId) {
    selectPersona(state.selectedPersonaId);
  } else {
    showPhase('setup');
  }
}

resetBtn.addEventListener('click', resetToSetup);
startAnotherBtn?.addEventListener('click', resetToSetup);

sendResultBtn.addEventListener('click', async () => {
  if (!state.session) return;
  sendResultBtn.disabled = true;
  sendResultStatus.textContent = '';
  try {
    const result = await api(`api/sessions/${state.session.session_id}/send-result`, { method: 'POST' });
    sendResultStatus.textContent = `Sent to ${result.sent_to}`;
  } catch (err) {
    sendResultStatus.textContent = err.message || 'Failed to send';
  } finally {
    sendResultBtn.disabled = false;
  }
});

// ── История бесед ────────────────────────────────────────────────────────────

async function loadHistory() {
  historyMeta.textContent = 'Загрузка...';
  historySelectedIds = new Set();
  try {
    const result = await api('api/artifacts');
    historyData = result.artifacts || [];
    historyMeta.textContent = `${historyData.length} ${
      historyData.length === 1 ? 'беседа' : historyData.length >= 2 && historyData.length <= 4 ? 'беседы' : 'бесед'
    }`;
    renderHistoryList();
    historyBulkActions?.classList.toggle('hidden', historyData.length === 0);
  } catch (err) {
    historyMeta.textContent = err.message || 'Ошибка загрузки';
  }
}

function verdictLabel(verdict) {
  return { PASS: 'Pass', PASS_WITH_NOTES: 'Pass w/ notes', FAIL: 'Fail', BLOCKER: 'Blocker' }[verdict] || (verdict || '—');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function renderHistoryList() {
  if (!historyList) return;
  if (historyData.length === 0) {
    historyList.innerHTML = '<p class="muted">Нет сохранённых бесед. Завершите симуляцию, чтобы увидеть её здесь.</p>';
    return;
  }
  historyList.innerHTML = historyData.map((item) => {
    const sid = item.session_id;
    const isChecked = historySelectedIds.has(sid);
    const publicLink = `${window.location.origin}/download/${encodeURIComponent(sid)}`;
    return `
      <div class="history-item run-insight-card" data-session-id="${escapeHtml(sid)}">
        <div class="history-item-row">
          <label class="history-checkbox-label">
            <input type="checkbox" class="history-cb" data-id="${escapeHtml(sid)}" ${isChecked ? 'checked' : ''} />
          </label>
          <div class="history-item-meta">
            <div class="history-item-top">
              <strong class="history-persona">${escapeHtml(item.persona?.name || '—')}</strong>
              ${item.verdict ? `<span class="badge ${verdictBadgeClass(item.verdict)}">${escapeHtml(verdictLabel(item.verdict))}</span>` : ''}
            </div>
            <p class="muted history-item-detail">
              ${escapeHtml(item.signal_card?.signal_type || '—')} · ${escapeHtml(item.dialogue_type || '—')} · ${escapeHtml(formatDateTime(item.finished_at || item.saved_at))}
              ${item.seller_username ? ` · ${escapeHtml(item.seller_username)}` : ''}
            </p>
          </div>
          <div class="history-item-actions detail-actions">
            <button class="ghost-btn history-view-btn" data-id="${escapeHtml(sid)}">Открыть</button>
            <a class="ghost-btn" href="api/artifacts/${encodeURIComponent(sid)}/download" download="mellow-sim-${escapeHtml(sid)}.json">JSON</a>
            <a class="ghost-btn" href="api/artifacts/${encodeURIComponent(sid)}/export" download="mellow-sim-${escapeHtml(sid)}.md">MD</a>
            <button class="ghost-btn history-copy-link-btn" data-link="${escapeHtml(publicLink)}" title="Копировать ссылку">🔗</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  historyList.querySelectorAll('.history-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) historySelectedIds.add(cb.dataset.id);
      else historySelectedIds.delete(cb.dataset.id);
    });
  });

  historyList.querySelectorAll('.history-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => openHistoryView(btn.dataset.id));
  });

  historyList.querySelectorAll('.history-copy-link-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.link).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }).catch(() => {
        prompt('Публичная ссылка:', btn.dataset.link);
      });
    });
  });
}

async function openHistoryView(sessionId) {
  if (!historyViewModal) return;
  historyViewTitle.textContent = 'Загрузка...';
  historyViewMeta.textContent = '';
  historyViewVerdict.innerHTML = '';
  historyViewCriteria.innerHTML = '';
  historyViewTranscript.innerHTML = '';
  historyViewModal.classList.remove('hidden');

  try {
    const resp = await fetch(`api/artifacts/${encodeURIComponent(sessionId)}/download`);
    if (!resp.ok) throw new Error('Not found');
    const art = await resp.json();

    historyViewTitle.textContent = art.persona?.name || sessionId;
    historyViewMeta.textContent = [
      formatDateTime(art.finished_at || art.saved_at),
      art.seller_username,
      art.signal_card?.signal_type,
      art.dialogue_type
    ].filter(Boolean).join(' · ');

    historyViewDownloadJson.href = `api/artifacts/${encodeURIComponent(sessionId)}/download`;
    historyViewDownloadJson.download = `mellow-sim-${sessionId}.json`;
    historyViewDownloadMd.href = `api/artifacts/${encodeURIComponent(sessionId)}/export`;
    historyViewDownloadMd.download = `mellow-sim-${sessionId}.md`;

    const v = art.assessment?.verdict;
    if (v) {
      historyViewVerdict.innerHTML = `<span class="badge ${verdictBadgeClass(v)}">${escapeHtml(verdictLabel(v))}</span>`;
    }

    const criteria = art.assessment?.criteria || [];
    historyViewCriteria.innerHTML = criteria.map((c) => `
      <div class="coaching-item">
        <div class="coaching-item-head">
          <span class="badge ${badgeClass(c.status)}">${escapeHtml(statusLabel(c.status))}</span>
          <strong>${escapeHtml(c.label || c.id)}</strong>
        </div>
        ${c.short_reason ? `<p>${escapeHtml(c.short_reason)}</p>` : ''}
      </div>
    `).join('');

    const msgs = (art.transcript || []).filter((m) => m.role !== 'system');
    historyViewTranscript.innerHTML = msgs.map((m) => {
      const cls = m.role === 'seller' ? 'bubble bubble--seller' : 'bubble bubble--bot';
      return `<div class="${escapeHtml(cls)}"><p>${escapeHtml(m.text)}</p></div>`;
    }).join('');
  } catch (err) {
    historyViewTitle.textContent = 'Ошибка загрузки';
    historyViewMeta.textContent = err.message;
  }
}

async function bulkDownload(ids) {
  try {
    const body = ids ? JSON.stringify({ ids }) : '{}';
    const resp = await fetch('api/artifacts/bulk-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      alert(j.error || 'Ошибка при скачивании');
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mellow-sim-conversations-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || 'Ошибка при скачивании');
  }
}

openHistoryBtn?.addEventListener('click', async () => {
  showPhase('history');
  await loadHistory();
});
backFromHistoryBtn?.addEventListener('click', () => showPhase('setup'));
refreshHistoryBtn?.addEventListener('click', () => loadHistory());
historySelectAllBtn?.addEventListener('click', () => {
  historyData.forEach((item) => historySelectedIds.add(item.session_id));
  renderHistoryList();
});
historyDeselectAllBtn?.addEventListener('click', () => {
  historySelectedIds.clear();
  renderHistoryList();
});
historyDownloadSelectedBtn?.addEventListener('click', () => {
  if (historySelectedIds.size === 0) { alert('Выберите хотя бы одну беседу'); return; }
  bulkDownload([...historySelectedIds]);
});
historyDownloadAllBtn?.addEventListener('click', () => bulkDownload(null));
historyViewClose?.addEventListener('click', () => historyViewModal?.classList.add('hidden'));

backToHistoryBtn?.addEventListener('click', async () => {
  showPhase('history');
  if (!historyData.length) await loadHistory();
});

downloadResultBtn?.addEventListener('click', () => {
  if (!state.session?.session_id) return;
  const a = document.createElement('a');
  a.href = `api/sessions/${state.session.session_id}/download`;
  a.download = '';
  a.click();
});

copyShareLinkBtn?.addEventListener('click', () => {
  if (!state.session?.session_id) return;
  const url = `${location.origin}/share/${state.session.session_id}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = copyShareLinkBtn.textContent;
    copyShareLinkBtn.textContent = 'Copied!';
    setTimeout(() => { copyShareLinkBtn.textContent = orig; }, 2000);
  }).catch(() => {
    prompt('Share link:', url);
  });
});

// Handle /share/:sessionId URL — load and show that session on page load
(async () => {
  const match = location.pathname.match(/^\/share\/([^/]+)$/);
  if (!match) return;
  const sessionId = match[1];
  try {
    const session = await api(`api/sessions/${sessionId}`);
    if (session && session.status === 'finished') {
      state.session = session;
      renderAssessment(false);
      showPhase('review');
    }
  } catch {
    // fall through to normal setup
  }
})();

// ── Randomizer settings ──────────────────────────────────────────────────────

const ALL_SIGNAL_TYPES = [
  'COMPLIANCE_PRESSURE', 'PAIN_SIGNAL', 'FUNDRAISING_DILIGENCE',
  'TEAM_SCALING', 'OPERATIONS_OVERLOAD', 'FINANCE_CONTROL_GAP',
  'LEGAL_REVIEW_TRIGGER', 'OUTSIDE_COUNSEL_CHECK'
];

function loadRandomizerConfig() {
  try {
    const raw = localStorage.getItem('mellow_randomizer_config');
    if (raw) Object.assign(state.randomizerConfig, JSON.parse(raw));
  } catch {}
}

function saveRandomizerConfig() {
  try {
    localStorage.setItem('mellow_randomizer_config', JSON.stringify(state.randomizerConfig));
  } catch {}
}

function syncRandomizerUI() {
  if (!randomizerToggle) return;
  const cfg = state.randomizerConfig;
  // Variability
  if (variabilitySelect) variabilitySelect.value = cfg.variability || 'medium';
  // Signal type checkboxes
  signalTypeCheckboxes().forEach((cb) => {
    cb.checked = cfg.signal_types.length === 0 || cfg.signal_types.includes(cb.value);
  });
  // Random factor
  if (randomFactorToggle) randomFactorToggle.checked = cfg.random_factor_enabled;
  if (randomFactorPanel) randomFactorPanel.classList.toggle('hidden', !cfg.random_factor_enabled);
  if (ghostProbInput) ghostProbInput.value = Math.round((cfg.ghost_probability ?? 0.15) * 100);
  if (busyProbInput) busyProbInput.value = Math.round((cfg.busy_probability ?? 0.10) * 100);
  if (deferProbInput) deferProbInput.value = Math.round((cfg.defer_probability ?? 0.10) * 100);
}

function readRandomizerUI() {
  const cfg = state.randomizerConfig;
  if (variabilitySelect) cfg.variability = variabilitySelect.value;
  const checked = signalTypeCheckboxes().filter((cb) => cb.checked).map((cb) => cb.value);
  cfg.signal_types = checked.length === ALL_SIGNAL_TYPES.length ? [] : checked;
  if (randomFactorToggle) cfg.random_factor_enabled = randomFactorToggle.checked;
  if (ghostProbInput) cfg.ghost_probability = Math.min(1, parseInt(ghostProbInput.value, 10) || 0) / 100;
  if (busyProbInput) cfg.busy_probability = Math.min(1, parseInt(busyProbInput.value, 10) || 0) / 100;
  if (deferProbInput) cfg.defer_probability = Math.min(1, parseInt(deferProbInput.value, 10) || 0) / 100;
  saveRandomizerConfig();
}

randomizerToggle?.addEventListener('click', () => {
  randomizerPanel?.classList.toggle('hidden');
});

variabilitySelect?.addEventListener('change', () => { readRandomizerUI(); });
signalTypeCheckboxes().forEach((cb) => cb.addEventListener('change', () => { readRandomizerUI(); }));

randomFactorToggle?.addEventListener('change', () => {
  readRandomizerUI();
  syncRandomizerUI();
});

[ghostProbInput, busyProbInput, deferProbInput].forEach((el) => {
  el?.addEventListener('input', readRandomizerUI);
});

// Collapsible context cards
personaSummaryCard?.addEventListener('click', () => {
  if (sellerMessages().length > 0) personaSummaryCard.classList.toggle('is-collapsed');
});
runSignalCard?.addEventListener('click', () => {
  if (sellerMessages().length > 0) runSignalCard.classList.toggle('is-collapsed');
});

// Init
loadRandomizerConfig();
setDialogueType('messenger');
showPhase('setup');
updateRunState();
syncRandomizerUI();
loadPersonas().then(() => state.selectedPersonaId && selectPersona(state.selectedPersonaId)).catch((error) => {
  setupPanel.innerHTML = `<p class="muted">Failed to load application: ${escapeHtml(error.message)}</p>`;
});
