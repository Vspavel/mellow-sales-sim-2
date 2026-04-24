#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const RUN_DIR = '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258';
const REPO_DIR = '/home/vspavel/.openclaw/workspace/mellow-sales-sim';
const CHECKPOINT_FILE = path.join(RUN_DIR, 'checkpoint.json');
const HINT_TUNING_FILE = path.join(REPO_DIR, 'data', 'sdr_hint_tuning.json');
const API_BASE = 'http://127.0.0.1:3210';

const TARGET_CYCLES = 30;
const SIMS_PER_PERSONA = 10;
const TURNS_PER_SIM = 5;

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function appendUnique(list, value) {
  if (!value || typeof value !== 'string') return false;
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

function ensureDir() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
}

async function api(pathname, options = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${options.method || 'GET'} ${pathname} failed: ${res.status} ${txt.slice(0, 400)}`);
  }
  return res.json();
}

async function assertApiHealthy() {
  const personas = await api('/api/personas');
  if (!Array.isArray(personas) || personas.length < 9) {
    throw new Error('Persona API did not return expected persona list.');
  }
  return personas;
}

function criterionPassRate(simulations, criterionId) {
  if (!simulations.length) return 0;
  const passCount = simulations.reduce((acc, sim) => {
    const crit = (sim.assessment?.criteria || []).find((c) => c.id === criterionId);
    return acc + (crit?.status === 'PASS' ? 1 : 0);
  }, 0);
  return passCount / simulations.length;
}

function summarizePersona(simulations) {
  const total = simulations.length;
  const verdictCounts = { PASS: 0, PASS_WITH_NOTES: 0, FAIL: 0, BLOCKER: 0 };
  for (const sim of simulations) {
    const v = sim.assessment?.verdict || 'FAIL';
    verdictCounts[v] = (verdictCounts[v] || 0) + 1;
  }
  return {
    total,
    passRate: total ? verdictCounts.PASS / total : 0,
    goodRate: total ? (verdictCounts.PASS + verdictCounts.PASS_WITH_NOTES) / total : 0,
    blockerRate: total ? verdictCounts.BLOCKER / total : 0,
    verdictCounts,
    criteria: {
      K1: criterionPassRate(simulations, 'K1'),
      K2: criterionPassRate(simulations, 'K2'),
      K3: criterionPassRate(simulations, 'K3'),
      K4: criterionPassRate(simulations, 'K4'),
      K5: criterionPassRate(simulations, 'K5')
    }
  };
}

function summarizeCycle(personaResults) {
  const personaIds = Object.keys(personaResults);
  const summary = {};
  let totalSims = 0;
  let totalPass = 0;
  let totalGood = 0;

  for (const id of personaIds) {
    const p = summarizePersona(personaResults[id]);
    summary[id] = p;
    totalSims += p.total;
    totalPass += p.verdictCounts.PASS;
    totalGood += p.verdictCounts.PASS + p.verdictCounts.PASS_WITH_NOTES;
  }

  return {
    personas: summary,
    overall: {
      totalSims,
      passRate: totalSims ? totalPass / totalSims : 0,
      goodRate: totalSims ? totalGood / totalSims : 0
    }
  };
}

function weakAreas(cycleSummary) {
  const weak = [];
  for (const [personaId, stats] of Object.entries(cycleSummary.personas)) {
    const c = stats.criteria;
    if (c.K1 < 0.8) weak.push({ personaId, criterion: 'K1', score: c.K1 });
    if (c.K2 < 0.8) weak.push({ personaId, criterion: 'K2', score: c.K2 });
    if (c.K3 < 0.8) weak.push({ personaId, criterion: 'K3', score: c.K3 });
    if (c.K4 < 0.75) weak.push({ personaId, criterion: 'K4', score: c.K4 });
    if (c.K5 < 0.8) weak.push({ personaId, criterion: 'K5', score: c.K5 });
  }
  return weak;
}

async function runSimulation(personaId, sellerId) {
  const session = await api('/api/sessions', { method: 'POST', body: { personaId, sellerId } });
  for (let t = 0; t < TURNS_PER_SIM; t += 1) {
    await api(`/api/sessions/${session.session_id}/auto-message`, { method: 'POST' });
  }
  const finished = await api(`/api/sessions/${session.session_id}/finish`, { method: 'POST' });
  return {
    session_id: finished.session_id,
    bot_id: finished.bot_id,
    persona_seed: finished?.meta?.persona_seed || null,
    concern_order: finished?.meta?.concern_order || [],
    assessment: finished.assessment,
    turns: finished.transcript?.length || 0
  };
}

async function runCycle(cycleNumber, personaIds) {
  const personaResults = {};
  for (const personaId of personaIds) {
    personaResults[personaId] = [];
    for (let i = 0; i < SIMS_PER_PERSONA; i += 1) {
      const sim = await runSimulation(personaId, `longrun_cycle_${cycleNumber}`);
      personaResults[personaId].push(sim);
    }
  }
  return personaResults;
}

function baseHintTuning() {
  return {
    openers: {},
    concerns: {},
    next_steps: {}
  };
}

function ensureHintPersonaMap(map, personaId) {
  if (!map[personaId] || typeof map[personaId] !== 'object' || Array.isArray(map[personaId])) {
    map[personaId] = {};
  }
  return map[personaId];
}

function applyHintTuningFromWeakness(weak, hintTuning) {
  let changed = false;
  for (const item of weak) {
    const { personaId, criterion } = item;
    if (criterion === 'K1') {
      if (!Array.isArray(hintTuning.openers[personaId])) hintTuning.openers[personaId] = [];
      changed = appendUnique(
        hintTuning.openers[personaId],
        'I am writing based on a specific signal from your setup, not a template: a recent payout/control friction point that is already creating review risk. Is it useful if I map it to one concrete fix path in two lines?'
      ) || changed;
    }

    if (criterion === 'K2') {
      if (!Array.isArray(hintTuning.openers[personaId])) hintTuning.openers[personaId] = [];
      changed = appendUnique(
        hintTuning.openers[personaId],
        'Concrete boundary from line one: Mellow handles contractor documents, KYC, payment chain operations, and audit trail; legal qualification and strategic risk decisions remain on your side.'
      ) || changed;

      const concerns = ensureHintPersonaMap(hintTuning.concerns, personaId);
      if (!Array.isArray(concerns.scope)) concerns.scope = [];
      changed = appendUnique(
        concerns.scope,
        'Scope boundary in one line: Mellow owns contractor docs, KYC, payment-chain operations, and audit trail; your legal/finance team owns legal qualification and strategic risk decisions. No overclaiming beyond that line.'
      ) || changed;

      if (!Array.isArray(concerns.op_value)) concerns.op_value = [];
      changed = appendUnique(
        concerns.op_value,
        'Ops impact with boundaries: manual payment follow-ups and reconciliation are replaced by Mellow-owned flow plus audit trail, while your team still owns legal qualification decisions.'
      ) || changed;
    }

    if (criterion === 'K3') {
      const concerns = ensureHintPersonaMap(hintTuning.concerns, personaId);
      if (!Array.isArray(concerns.op_value)) concerns.op_value = [];
      changed = appendUnique(
        concerns.op_value,
        'Concretely for ops: less manual status chasing, less reconciliation overhead, and a named owner for incidents. That is the before/after change, not a generic platform claim.'
      ) || changed;
    }

    if (criterion === 'K4') {
      const concerns = ensureHintPersonaMap(hintTuning.concerns, personaId);
      if (!Array.isArray(concerns.incident)) concerns.incident = [];
      changed = appendUnique(
        concerns.incident,
        'Objection answer with mechanism: define incident trigger, named owner, response SLA, and the exact artifact trail produced after each escalation.'
      ) || changed;
    }

    if (criterion === 'K5') {
      const concerns = ensureHintPersonaMap(hintTuning.concerns, personaId);
      if (!Array.isArray(concerns.next_step)) concerns.next_step = [];
      changed = appendUnique(
        concerns.next_step,
        'Proposed next step: I send a one-page flow with scope boundary, incident path, and before/after manual workload; if it is concrete, we do a focused 20-minute review this week.'
      ) || changed;

      if (!Array.isArray(hintTuning.next_steps[personaId])) hintTuning.next_steps[personaId] = [];
      changed = appendUnique(
        hintTuning.next_steps[personaId],
        'I will send a one-page summary with scope boundary, SLA, and a concrete process before/after for your setup. If it is specific enough, can we lock a 20-minute review slot this week?'
      ) || changed;
    }
  }
  return changed;
}

function addUniqueLine(lines, marker, line) {
  if (!Array.isArray(lines)) return false;
  if (lines.some((l) => String(l).includes(marker))) return false;
  lines.push(`${line} ${marker}`);
  return true;
}

function appendPromptDirective(prompt, marker, line) {
  const source = String(prompt || '');
  if (source.includes(marker)) return { prompt: source, changed: false };
  const next = `${source.trim()}\\n\\nLONGRUN_TUNING\\n- ${line} ${marker}\\n`;
  return { prompt: next, changed: true };
}

async function applyPersonaPromptTuning(weak) {
  const personas = await api('/api/personas');
  const personaMap = Object.fromEntries(personas.map((p) => [p.id, p]));
  const byPersona = new Map();
  for (const item of weak) {
    if (!byPersona.has(item.personaId)) byPersona.set(item.personaId, new Set());
    byPersona.get(item.personaId).add(item.criterion);
  }

  const changedIds = [];

  for (const [personaId, criteriaSet] of byPersona.entries()) {
    const persona = personaMap[personaId];
    if (!persona) continue;

    let systemPrompt = String(persona.system_prompt || '');
    let changed = false;

    if (criteriaSet.has('K1')) {
      const updated = appendPromptDirective(
        systemPrompt,
        '[LR-K1]',
        'Reject generic opener language and force opening anchored to a concrete observed signal from context.'
      );
      systemPrompt = updated.prompt;
      changed = updated.changed || changed;
    }
    if (criteriaSet.has('K2')) {
      const updated = appendPromptDirective(
        systemPrompt,
        '[LR-K2]',
        'Demand explicit boundary language: what Mellow controls, what client legal/finance controls, and no overclaiming.'
      );
      systemPrompt = updated.prompt;
      changed = updated.changed || changed;
    }
    if (criteriaSet.has('K3')) {
      const updated = appendPromptDirective(
        systemPrompt,
        '[LR-K3]',
        'Push concise, role-fit language and penalize long or generic wording.'
      );
      systemPrompt = updated.prompt;
      changed = updated.changed || changed;
    }
    if (criteriaSet.has('K4')) {
      const updated = appendPromptDirective(
        systemPrompt,
        '[LR-K4]',
        'Keep objection pressure on mechanism: process step, owner, SLA, and evidence trail.'
      );
      systemPrompt = updated.prompt;
      changed = updated.changed || changed;
    }
    if (criteriaSet.has('K5')) {
      const updated = appendPromptDirective(
        systemPrompt,
        '[LR-K5]',
        'Do not accept vague closure; require a concrete next step with format, stakeholders, and timing.'
      );
      systemPrompt = updated.prompt;
      changed = updated.changed || changed;
    }

    if (!changed) continue;

    await api(`/api/personas/${personaId}`, {
      method: 'PATCH',
      body: {
        system_prompt: systemPrompt
      }
    });
    changedIds.push(personaId);
  }

  return changedIds;
}

function checkpointTemplate() {
  return {
    status: 'bootstrapping',
    completedCycles: 0,
    targetCycles: TARGET_CYCLES,
    personas: 9,
    simsPerPersonaPerCycle: SIMS_PER_PERSONA,
    currentStatus: 'ready',
    keyFindings: [],
    filesChanged: []
  };
}

function writeCheckpoint(partial) {
  const current = readJson(CHECKPOINT_FILE, checkpointTemplate()) || checkpointTemplate();
  const next = {
    ...current,
    ...partial
  };
  writeJson(CHECKPOINT_FILE, next);
}

function cycleSummaryMarkdown(cycleNumber, cycleSummary, keyFindings, filesChanged) {
  const lines = [];
  lines.push(`# Cycle ${cycleNumber} Summary`);
  lines.push('');
  lines.push(`- Timestamp: ${nowIso()}`);
  lines.push(`- Overall pass rate: ${(cycleSummary.overall.passRate * 100).toFixed(1)}%`);
  lines.push(`- Overall pass-or-notes rate: ${(cycleSummary.overall.goodRate * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('## Persona Quality');
  lines.push('');
  for (const [personaId, stats] of Object.entries(cycleSummary.personas)) {
    lines.push(`- ${personaId}: PASS ${(stats.passRate * 100).toFixed(1)}%, GOOD ${(stats.goodRate * 100).toFixed(1)}%, BLOCKER ${(stats.blockerRate * 100).toFixed(1)}%, K1 ${(stats.criteria.K1 * 100).toFixed(0)} / K2 ${(stats.criteria.K2 * 100).toFixed(0)} / K3 ${(stats.criteria.K3 * 100).toFixed(0)} / K4 ${(stats.criteria.K4 * 100).toFixed(0)} / K5 ${(stats.criteria.K5 * 100).toFixed(0)}`);
  }
  lines.push('');
  lines.push('## Key Findings');
  lines.push('');
  for (const finding of keyFindings) {
    lines.push(`- ${finding}`);
  }
  lines.push('');
  lines.push('## Files Changed This Cycle');
  lines.push('');
  if (!filesChanged.length) {
    lines.push('- none');
  } else {
    for (const file of filesChanged) lines.push(`- ${file}`);
  }
  lines.push('');
  return lines.join('\n');
}

function roundPct(value) {
  return Math.round(value * 1000) / 10;
}

function buildFinalSummary(cycleSummaries) {
  const firstWindow = cycleSummaries.slice(0, 5);
  const lastWindow = cycleSummaries.slice(-5);
  const personas = Object.keys(cycleSummaries[cycleSummaries.length - 1].summary.personas);

  function avgPass(window, personaId) {
    if (!window.length) return 0;
    return window.reduce((acc, c) => acc + (c.summary.personas[personaId]?.passRate || 0), 0) / window.length;
  }

  const lines = [];
  lines.push('# FINAL SUMMARY: 30-Cycle Durable Training Run');
  lines.push('');
  lines.push(`- Run directory: ${RUN_DIR}`);
  lines.push(`- Completed at: ${nowIso()}`);
  lines.push(`- Cycles: ${TARGET_CYCLES}`);
  lines.push(`- Simulations per cycle: ${9 * SIMS_PER_PERSONA} (10 per each of 9 personas)`);
  lines.push('');
  lines.push('## Final Quality By Persona');
  lines.push('');
  const final = cycleSummaries[cycleSummaries.length - 1].summary;
  for (const personaId of personas) {
    const p = final.personas[personaId];
    lines.push(`- ${personaId}: PASS ${roundPct(p.passRate)}%, GOOD ${roundPct(p.goodRate)}%, BLOCKER ${roundPct(p.blockerRate)}%, K1 ${roundPct(p.criteria.K1)} / K2 ${roundPct(p.criteria.K2)} / K3 ${roundPct(p.criteria.K3)} / K4 ${roundPct(p.criteria.K4)} / K5 ${roundPct(p.criteria.K5)}`);
  }
  lines.push('');
  lines.push('## Materially Changed And Evidenced Improvements');
  lines.push('');
  for (const personaId of personas) {
    const early = avgPass(firstWindow, personaId);
    const late = avgPass(lastWindow, personaId);
    const delta = late - early;
    if (delta > 0.02) {
      lines.push(`- ${personaId}: PASS rate improved from ${roundPct(early)}% (cycles 1-5 avg) to ${roundPct(late)}% (cycles 26-30 avg), delta +${roundPct(delta)}pp.`);
    }
  }
  if (!lines.some((l) => l.includes('delta +'))) {
    lines.push('- No persona crossed +2.0pp average PASS improvement threshold between cycles 1-5 and cycles 26-30.');
  }
  lines.push('');
  lines.push('## Remaining Weak Spots');
  lines.push('');
  for (const personaId of personas) {
    const p = final.personas[personaId];
    const weak = Object.entries(p.criteria)
      .filter(([, v]) => v < 0.85)
      .map(([k, v]) => `${k} ${roundPct(v)}%`);
    if (weak.length) lines.push(`- ${personaId}: ${weak.join(', ')}`);
  }
  lines.push('');
  lines.push('## Exact Changed Files');
  lines.push('');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/server.js');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/personas.json');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/sdr_hint_tuning.json');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/longrun_runner.mjs');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/checkpoint.json');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/cycle_XX_results.json (30 files)');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/cycle_XX_summary.md (30 files)');
  lines.push('- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/FINAL_SUMMARY.md');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  ensureDir();

  const personas = await assertApiHealthy();
  const personaIds = personas.map((p) => p.id).slice(0, 9);

  const checkpoint = readJson(CHECKPOINT_FILE, checkpointTemplate()) || checkpointTemplate();
  const completed = Number(checkpoint.completedCycles || 0);

  if (!fs.existsSync(HINT_TUNING_FILE) || completed === 0) {
    writeJson(HINT_TUNING_FILE, baseHintTuning());
  }

  const cycleSummaries = [];

  for (let cycle = 1; cycle <= TARGET_CYCLES; cycle += 1) {
    const existing = readJson(path.join(RUN_DIR, `cycle_${String(cycle).padStart(2, '0')}_results.json`), null);
    if (cycle <= completed && existing) {
      cycleSummaries.push({ cycle, summary: existing.summary });
      continue;
    }

    writeCheckpoint({
      status: 'running',
      currentStatus: `running cycle ${cycle}/${TARGET_CYCLES}`,
      completedCycles: cycle - 1,
      keyFindings: [`Cycle ${cycle} started at ${nowIso()}`],
      filesChanged: []
    });

    const personaResults = await runCycle(cycle, personaIds);
    const summary = summarizeCycle(personaResults);
    const weak = weakAreas(summary);

    const filesChanged = [];
    const keyFindings = [
      `Overall PASS ${roundPct(summary.overall.passRate)}%`,
      `Overall PASS+NOTES ${roundPct(summary.overall.goodRate)}%`,
      weak.length
        ? `Weak cells: ${weak.slice(0, 6).map((w) => `${w.personaId}:${w.criterion}=${roundPct(w.score)}%`).join('; ')}`
        : 'No weak cells under tuning thresholds'
    ];

    if (weak.length) {
      const personaChanged = await applyPersonaPromptTuning(weak);
      if (personaChanged.length) {
        filesChanged.push('/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/personas.json');
        keyFindings.push(`Persona prompt tuning updated: ${personaChanged.join(', ')}`);
      }

      const hintTuning = readJson(HINT_TUNING_FILE, baseHintTuning()) || baseHintTuning();
      const hintChanged = applyHintTuningFromWeakness(weak, hintTuning);
      if (hintChanged) {
        writeJson(HINT_TUNING_FILE, hintTuning);
        filesChanged.push('/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/sdr_hint_tuning.json');
        keyFindings.push('SDR hint tuning rules expanded from cycle evidence');
      }
    }

    const cyclePayload = {
      cycle,
      generatedAt: nowIso(),
      config: {
        personas: personaIds,
        simsPerPersona: SIMS_PER_PERSONA,
        turnsPerSimulation: TURNS_PER_SIM
      },
      summary,
      weakAreas: weak,
      simulations: personaResults,
      filesChanged
    };

    const cycleFile = path.join(RUN_DIR, `cycle_${String(cycle).padStart(2, '0')}_results.json`);
    const cycleSummaryFile = path.join(RUN_DIR, `cycle_${String(cycle).padStart(2, '0')}_summary.md`);
    writeJson(cycleFile, cyclePayload);
    fs.writeFileSync(cycleSummaryFile, cycleSummaryMarkdown(cycle, summary, keyFindings, filesChanged));

    writeCheckpoint({
      status: cycle === TARGET_CYCLES ? 'finalizing' : 'running',
      completedCycles: cycle,
      currentStatus: cycle === TARGET_CYCLES ? 'all cycles complete, writing final summary' : `cycle ${cycle}/${TARGET_CYCLES} complete`,
      keyFindings,
      filesChanged: [
        '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/checkpoint.json',
        cycleFile,
        cycleSummaryFile,
        ...filesChanged
      ]
    });

    cycleSummaries.push({ cycle, summary });
  }

  if (!cycleSummaries.length) {
    for (let cycle = 1; cycle <= TARGET_CYCLES; cycle += 1) {
      const existing = readJson(path.join(RUN_DIR, `cycle_${String(cycle).padStart(2, '0')}_results.json`), null);
      if (existing?.summary) cycleSummaries.push({ cycle, summary: existing.summary });
    }
  }

  const finalSummary = buildFinalSummary(cycleSummaries);
  const finalSummaryPath = path.join(RUN_DIR, 'FINAL_SUMMARY.md');
  fs.writeFileSync(finalSummaryPath, finalSummary);

  await assertApiHealthy();

  writeCheckpoint({
    status: 'done',
    completedCycles: TARGET_CYCLES,
    currentStatus: 'done',
    keyFindings: [
      '30 cycles executed with 10 full simulations for each of 9 personas per cycle',
      'Prompt tuning and SDR hint tuning applied only from observed weak criteria',
      'Final summary written with evidence window comparison (cycles 1-5 vs 26-30)'
    ],
    filesChanged: [
      '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/checkpoint.json',
      '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/FINAL_SUMMARY.md',
      '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/personas.json',
      '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/sdr_hint_tuning.json'
    ]
  });
}

main().catch((err) => {
  const message = (err && err.stack) ? err.stack : String(err);
  writeCheckpoint({
    status: 'failed',
    currentStatus: `failed: ${String(err.message || err)}`,
    keyFindings: [message],
    filesChanged: [
      '/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/checkpoint.json'
    ]
  });
  console.error(message);
  process.exit(1);
});
