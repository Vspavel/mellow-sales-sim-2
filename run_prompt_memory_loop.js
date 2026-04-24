import fs from 'fs';
import path from 'path';
import pg from 'pg';

const BASE_URL = process.env.SALES_SIM_BASE_URL || 'http://127.0.0.1:3210';
const ROOT = path.resolve(process.cwd());
const DATA_DIR = path.join(ROOT, 'data');
const RUNS_DIR = path.join(DATA_DIR, 'prompt_memory_runs');
const HINT_MEMORY_FILE = path.join(DATA_DIR, 'hint_memory.json');
const { Pool } = pg;

fs.mkdirSync(RUNS_DIR, { recursive: true });

function resolvePostgresConnection() {
  return process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || '';
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

async function createPool() {
  const connectionString = resolvePostgresConnection();
  if (!connectionString) return null;
  return new Pool({
    connectionString,
    ssl: shouldUsePostgresSsl(connectionString) ? { rejectUnauthorized: false } : false,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });
}

async function api(urlPath, options = {}) {
  const response = await fetch(`${BASE_URL}${urlPath}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function groupSummary(cycles) {
  const verdictCounts = cycles.reduce((acc, cycle) => {
    acc[cycle.verdict] = (acc[cycle.verdict] || 0) + 1;
    return acc;
  }, {});
  return {
    count: cycles.length,
    avgNextStepLikelihood: average(cycles.map((cycle) => cycle.nextStepLikelihood)),
    avgReplyLikelihood: average(cycles.map((cycle) => cycle.replyLikelihood)),
    avgDisengagementRisk: average(cycles.map((cycle) => cycle.disengagementRisk)),
    meetingProgressRate: average(cycles.map((cycle) => cycle.meetingProgress ? 1 : 0)),
    avgSuccessfulMemoriesSeen: average(cycles.map((cycle) => cycle.memorySeen.successful)),
    avgUnsuccessfulMemoriesSeen: average(cycles.map((cycle) => cycle.memorySeen.unsuccessful)),
    verdictCounts,
  };
}

function topPatternCounts(records, outcomeLabels) {
  const labels = Array.isArray(outcomeLabels) ? outcomeLabels : [outcomeLabels];
  const counts = new Map();
  for (const record of records.filter((record) => labels.includes(record.outcome_label))) {
    for (const pattern of record.patterns || []) {
      counts.set(pattern, (counts.get(pattern) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([pattern, count]) => ({ pattern, count }));
}

function founderReport({ personaId, cycles, memoryRecords, reportPathJson }) {
  const early = groupSummary(cycles.slice(0, 10));
  const late = groupSummary(cycles.slice(-10));
  const all = groupSummary(cycles);
  const helped = topPatternCounts(memoryRecords, ['meeting_progress', 'positive']);
  const hurt = topPatternCounts(memoryRecords, ['weak', 'failed']);

  const lines = [
    '# Sales Simulator prompt-memory loop, 30-cycle report',
    '',
    `- Persona 1 used in this run: ${personaId}`,
    `- Cycles completed: ${cycles.length}`,
    `- Report JSON: ${reportPathJson}`,
    '',
    '## Outcome',
    '',
    `- Meeting-oriented progress rate: ${pct(all.meetingProgressRate)}`,
    `- Avg next-step likelihood: ${pct(all.avgNextStepLikelihood)}`,
    `- Avg reply likelihood: ${pct(all.avgReplyLikelihood)}`,
    `- Avg disengagement risk: ${pct(all.avgDisengagementRisk)}`,
    `- Verdict mix: ${Object.entries(all.verdictCounts).map(([key, value]) => `${key} ${value}`).join(', ') || 'n/a'}`,
    '',
    '## Early vs late signal',
    '',
    `- Early 10 meeting-progress rate: ${pct(early.meetingProgressRate)}`,
    `- Late 10 meeting-progress rate: ${pct(late.meetingProgressRate)}`,
    `- Early 10 avg next-step likelihood: ${pct(early.avgNextStepLikelihood)}`,
    `- Late 10 avg next-step likelihood: ${pct(late.avgNextStepLikelihood)}`,
    `- Early 10 avg successful memories seen before hinting: ${early.avgSuccessfulMemoriesSeen.toFixed(1)}`,
    `- Late 10 avg successful memories seen before hinting: ${late.avgSuccessfulMemoriesSeen.toFixed(1)}`,
    '',
    '## What helped',
    '',
    ...helped.map((item) => `- ${item.pattern}: ${item.count} successful hints`),
    '',
    '## What hurt',
    '',
    ...hurt.map((item) => `- ${item.pattern}: ${item.count} unsuccessful hints`),
    '',
    '## Representative cycles',
    '',
    ...cycles.slice(0, 3).map((cycle) => `- Cycle ${cycle.cycle}: opener="${cycle.firstHint}" | verdict=${cycle.verdict} | next-step=${pct(cycle.nextStepLikelihood)} | memories seen=${cycle.memorySeen.successful}/${cycle.memorySeen.unsuccessful}`),
    '',
    ...cycles.slice(-3).map((cycle) => `- Cycle ${cycle.cycle}: opener="${cycle.firstHint}" | verdict=${cycle.verdict} | next-step=${pct(cycle.nextStepLikelihood)} | memories seen=${cycle.memorySeen.successful}/${cycle.memorySeen.unsuccessful}`),
  ];

  return lines.join('\n');
}

async function run() {
  const personas = await api('/api/personas');
  if (!Array.isArray(personas) || !personas.length) throw new Error('No personas available');
  const personaId = process.env.PERSONA_ID || personas[0].id;
  const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `prompt_memory_run_${runStamp}`;
  const cycles = [];

  for (let cycle = 1; cycle <= 30; cycle += 1) {
    const session = await api('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ personaId, dialogueType: 'messenger', language: 'en' }),
    });

    let currentSession = session;
    let turns = 0;
    while (turns < 4) {
      const step = await api(`/api/sessions/${currentSession.session_id}/auto-message`, { method: 'POST' });
      currentSession = step.session;
      turns += 1;
      const nextStepLikelihood = Number(currentSession?.buyer_state?.next_step_likelihood || 0);
      const disengagementRisk = Number(currentSession?.buyer_state?.disengagement_risk || 0);
      if ((turns >= 3 && nextStepLikelihood >= 0.45) || disengagementRisk >= 0.72) break;
    }

    const finished = await api(`/api/sessions/${currentSession.session_id}/finish`, { method: 'POST' });
    const sellerTurns = (finished.transcript || []).filter((entry) => entry.role === 'seller');
    const firstMemoryContext = sellerTurns[0]?.hint_memory_context || { successful: [], unsuccessful: [] };
    cycles.push({
      cycle,
      sessionId: finished.session_id,
      verdict: finished.assessment?.verdict || 'UNKNOWN',
      nextStepLikelihood: Number(finished?.buyer_state?.next_step_likelihood || 0),
      replyLikelihood: Number(finished?.buyer_state?.reply_likelihood || 0),
      disengagementRisk: Number(finished?.buyer_state?.disengagement_risk || 0),
      meetingProgress: Boolean(finished.assessment?.criteria?.find((item) => item.id === 'K5' && item.status === 'PASS')),
      firstHint: sellerTurns[0]?.text || '',
      lastHint: sellerTurns[sellerTurns.length - 1]?.text || '',
      sellerTurns: sellerTurns.length,
      memorySeen: {
        successful: (firstMemoryContext.successful || []).length,
        unsuccessful: (firstMemoryContext.unsuccessful || []).length,
      },
      summary: finished.assessment?.summary_for_seller || '',
    });
  }

  const summary = await api(`/api/hint-memory/summary?personaId=${encodeURIComponent(personaId)}`);
  const memoryRecords = Array.isArray(summary?.recent_records) ? summary.recent_records : [];
  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    personaId,
    cycleCount: cycles.length,
    cycles,
    memoryRecordCount: memoryRecords.length,
    helpedPatterns: topPatternCounts(memoryRecords, ['meeting_progress', 'positive']),
    hurtPatterns: topPatternCounts(memoryRecords, ['weak', 'failed']),
    early: groupSummary(cycles.slice(0, 10)),
    late: groupSummary(cycles.slice(-10)),
    overall: groupSummary(cycles),
  };

  const reportPathJson = path.join(RUNS_DIR, `${runId}.json`);
  const reportPathMd = path.join(RUNS_DIR, `${runId}.md`);
  const markdown = founderReport({ personaId, cycles, memoryRecords, reportPathJson });
  fs.writeFileSync(reportPathJson, JSON.stringify(report, null, 2));
  fs.writeFileSync(reportPathMd, markdown);

  const pool = await createPool();
  if (pool) {
    try {
      await pool.query(`
        insert into prompt_memory_runs (run_id, persona_id, generated_at, report_json, report_markdown, payload)
        values ($1, $2, now(), $3::jsonb, $4, $5::jsonb)
        on conflict (run_id) do update
        set persona_id = excluded.persona_id,
            generated_at = now(),
            report_json = excluded.report_json,
            report_markdown = excluded.report_markdown,
            payload = excluded.payload
      `, [runId, personaId, JSON.stringify(report), markdown, JSON.stringify({ reportPathJson, reportPathMd, cycleCount: cycles.length })]);
    } finally {
      await pool.end();
    }
  }

  console.log(JSON.stringify({ runId, personaId, reportPathJson, reportPathMd, cycleCount: cycles.length, persisted: pool ? 'postgres+file' : 'file' }, null, 2));
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
