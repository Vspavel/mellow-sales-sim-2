# FINAL SUMMARY: 30-Cycle Durable Training Run

- Run directory: /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258
- Completed at: 2026-04-20T03:12:24.341Z
- Cycles: 30
- Simulations per cycle: 90 (10 per each of 9 personas)

## Final Quality By Persona

- andrey: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- alexey: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- cfo_round: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- eng_manager: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- ops_manager: PASS 90%, GOOD 100%, BLOCKER 0%, K1 100 / K2 10 / K3 90 / K4 90 / K5 100
- head_finance: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- internal_legal: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- external_legal: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100
- olga: PASS 100%, GOOD 100%, BLOCKER 0%, K1 100 / K2 100 / K3 100 / K4 100 / K5 100

## Materially Changed And Evidenced Improvements

- `ops_manager` boundary quality (K2) improved from **22.0%** avg in cycles 1-5 to **28.0%** avg in cycles 26-30 after prompt + hint tuning rules were added.
- `ops_manager` K2 peak quality reached **60%** in later cycles (cycles 12 and 20), but remained unstable by cycle 30.
- Overall PASS rate stayed high for most personas, so gains were mostly criterion-level (K2/K3 behavior) rather than verdict-level.

## Remaining Weak Spots

- ops_manager: K2 10%

## Exact Changed Files

- /home/vspavel/.openclaw/workspace/mellow-sales-sim/server.js
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/personas.json
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/sdr_hint_tuning.json
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/longrun_runner.mjs
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/checkpoint.json
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/cycle_XX_results.json (30 files)
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/cycle_XX_summary.md (30 files)
- /home/vspavel/.openclaw/workspace/mellow-sales-sim/data/analysis/longrun_2026-04-20_030258/FINAL_SUMMARY.md
