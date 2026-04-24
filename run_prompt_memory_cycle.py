import json
import time
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

BASE = 'http://127.0.0.1:3322'
PERSONA_ID = 'andrey'
CYCLES = 30
MAX_TURNS = 4
OUT_DIR = Path('/home/vspavel/.openclaw/workspace/mellow-sales-sim/data/prompt_memory_runs')
OUT_DIR.mkdir(parents=True, exist_ok=True)


def post(path, data=None, timeout=180):
    body = json.dumps(data or {}).encode()
    req = urllib.request.Request(BASE + path, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def get(path, timeout=60):
    with urllib.request.urlopen(BASE + path, timeout=timeout) as r:
        return json.load(r)


def safe_num(v, default=0):
    try:
        return float(v)
    except Exception:
        return default


runs = []
started_at = datetime.now(timezone.utc).isoformat()
for cycle in range(1, CYCLES + 1):
    session = post('/api/sessions', {'personaId': PERSONA_ID, 'dialogueType': 'messenger'})
    sid = session['session_id']
    turn_records = []
    no_reply = False
    for turn in range(1, MAX_TURNS + 1):
        result = post(f'/api/sessions/{sid}/auto-message', {})
        seller_text = result.get('seller_text')
        reply = result.get('reply')
        sess = result.get('session', {})
        seller_entries = [x for x in sess.get('transcript', []) if x.get('role') == 'seller']
        last_seller = seller_entries[-1] if seller_entries else {}
        turn_records.append({
            'turn': turn,
            'seller_text': seller_text,
            'reply': reply,
            'buyer_state_transition': last_seller.get('buyer_state_transition'),
            'hint_memory_context': last_seller.get('hint_memory_context'),
        })
        if reply is None:
            no_reply = True
            break
    finished = post(f'/api/sessions/{sid}/finish', {})
    assessment = finished.get('assessment', {})
    buyer_state = finished.get('buyer_state', {})
    report = assessment.get('buyer_state_report', {}) or {}
    cycle_summary = {
        'cycle': cycle,
        'session_id': sid,
        'turns_run': len(turn_records),
        'no_reply': no_reply,
        'verdict': assessment.get('verdict'),
        'summary_for_seller': assessment.get('summary_for_seller'),
        'final_buyer_state': buyer_state,
        'buyer_state_report': report,
        'transitions': turn_records,
        'meeting_signal': safe_num(buyer_state.get('next_step_likelihood', 0)) >= 0.55,
        'reply_likelihood': buyer_state.get('reply_likelihood'),
        'next_step_likelihood': buyer_state.get('next_step_likelihood'),
        'disengagement_risk': buyer_state.get('disengagement_risk'),
    }
    runs.append(cycle_summary)
    Path(OUT_DIR / f'cycle_{cycle:02d}.json').write_text(json.dumps(cycle_summary, ensure_ascii=False, indent=2))

summary = {
    'started_at': started_at,
    'finished_at': datetime.now(timezone.utc).isoformat(),
    'persona_id': PERSONA_ID,
    'cycles': CYCLES,
    'max_turns_per_cycle': MAX_TURNS,
    'pass_count': sum(1 for r in runs if r.get('verdict') == 'PASS'),
    'fail_count': sum(1 for r in runs if r.get('verdict') == 'FAIL'),
    'meeting_signal_count': sum(1 for r in runs if r.get('meeting_signal')),
    'average_next_step_likelihood': round(sum(safe_num(r.get('next_step_likelihood')) for r in runs) / len(runs), 4),
    'average_disengagement_risk': round(sum(safe_num(r.get('disengagement_risk')) for r in runs) / len(runs), 4),
    'average_reply_likelihood': round(sum(safe_num(r.get('reply_likelihood')) for r in runs) / len(runs), 4),
    'runs': runs,
}
summary_path = OUT_DIR / 'summary.json'
summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2))

md = []
md.append('# Prompt Memory Cycle Run Summary')
md.append('')
md.append(f'- Persona: `{PERSONA_ID}`')
md.append(f'- Cycles: {CYCLES}')
md.append(f'- Max turns per cycle: {MAX_TURNS}')
md.append(f'- PASS count: {summary["pass_count"]}')
md.append(f'- FAIL count: {summary["fail_count"]}')
md.append(f'- Meeting-signal count: {summary["meeting_signal_count"]}')
md.append(f'- Avg next-step likelihood: {summary["average_next_step_likelihood"]}')
md.append(f'- Avg disengagement risk: {summary["average_disengagement_risk"]}')
md.append(f'- Avg reply likelihood: {summary["average_reply_likelihood"]}')
md.append('')
md.append('## Sample cycle snapshots')
for idx in [1, 10, 20, 30]:
    r = runs[idx-1]
    md.append(f'### Cycle {idx}')
    md.append(f'- Verdict: {r.get("verdict")}')
    md.append(f'- Turns run: {r.get("turns_run")}')
    md.append(f'- Next-step likelihood: {r.get("next_step_likelihood")}')
    md.append(f'- Disengagement risk: {r.get("disengagement_risk")}')
    md.append(f'- Meeting signal: {r.get("meeting_signal")}')
    if r.get('summary_for_seller'):
        md.append(f'- Seller summary: {r.get("summary_for_seller")}')
    md.append('')
(OUT_DIR / 'summary.md').write_text('\n'.join(md))
print(summary_path)
print(OUT_DIR / 'summary.md')
