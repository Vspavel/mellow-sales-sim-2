# Sales Simulator batch run, 2026-04-19

## What was run
- 10 full auto-run conversations per persona on the active web simulator.
- Initial pass: `run_cycle_2026-04-19_2224.json`
- Post-tuning full pass: `run_cycle_post_tune_2026-04-19_2227.json`

## Runtime fixes applied during the run
- Hardened auto-run against empty seller suggestion output in `server.js`.
- Added fallback seller suggestion handling.
- Added missing `olga` seed/opener wiring in `server.js`.
- Restarted active simulator on port `3210` with the updated build.

## Prompt tuning applied
Updated persona prompts in `data/personas.json` for:
- `ops_manager`
- `internal_legal`
- `olga`

Main changes:
- stronger boundary/ownership language,
- clearer objection ladders,
- more explicit next-step acceptance rules,
- fully built-out external-legal persona prompt for Olga.

## Initial pass highlights
- Strong across finance personas.
- Weak spots surfaced in:
  - `eng_manager`: occasional K2 misses
  - `ops_manager`: repeated K2 misses
  - `internal_legal`: inconsistent K5 / next-step close
  - `olga`: generic opener and under-specified persona prompt

## Post-tuning result snapshot
- Clean 10/10 PASS across:
  - `andrey`
  - `alexey`
  - `cfo_round`
  - `head_finance`
  - `internal_legal`
  - `external_legal`
- `eng_manager`: still some evaluator instability, but all 10 runs ended PASS.
- `ops_manager`: still PASS overall, but K2 remains the main weak criterion in the assessor.
- `olga`: all 10 runs ended PASS after wiring/prompt upgrades, though K1 still looks strict in the evaluator.

## Interpretation
The main quality gain is real on the persona side:
- Olga is no longer a placeholder persona.
- Internal Legal now closes with a legally credible next step.
- Ops Manager now pushes harder on owner model, finance handoff, and concrete process loss.

What still looks imperfect is partly in the evaluator / seller-autoplay layer, not only in persona prompts:
- `ops_manager` K2 remains overly sensitive.
- `olga` K1 still appears stricter than the actual opener quality suggests.

## Files changed
- `mellow-sales-sim/server.js`
- `mellow-sales-sim/data/personas.json`

## Recommended next iteration
1. Tune the seller-autoplay strategy for ops personas so it surfaces scope/boundary language earlier.
2. Relax or refine K1 matching for `olga` so contextual external-counsel openers are scored fairly.
3. Run another 10x focused validation on `ops_manager`, `eng_manager`, and `olga` after assessor/autoplay tuning.
