# Persona policy pass, 2026-04-25

## What changed
- Added a measured persona selling-policy map in `server.js` for the six target personas.
- Wired those weights into hint policy metadata via:
  - `PERSONA_SELLING_POLICY`
  - `getPersonaSellingPolicy()`
  - `getPersonaValueFrameSummary()`
- Changed ask mechanics for finance-heavy personas so the simulator is less likely to jump to a call before the right proof is earned:
  - `rate_floor_cfo` now biases toward a written structure-first bridge until clarity / momentum is higher.
  - `fx_trust_shock_finance` now biases toward a written total-cost breakdown before a live step unless clarity and trust are already strong.
- Updated stage doctrine so proof / bridge hints explicitly prioritize the measured value frames and preferred bridge asset.
- Added persona-specific stage-bound copy for the two finance personas above, focused on:
  - `rate_floor_cfo`: defendable structure, incident ownership, clarity of scheme
  - `fx_trust_shock_finance`: cost predictability, clarity of scheme, defendable structure, recovery visibility
- I tested broader persona-specific bridge text for some ops personas, but it reduced conversion in quick checks, so I rolled those parts back.

## Files changed
- `server.js`
- `PERSONA-POLICY-NOTE-2026-04-25.md`

## Validation run notes
All checks were against the local sim on port 3210. Message cap remained unchanged at 20 visible messages.

### Syntax / runtime
- `node --check server.js` passed.
- Restarted local server and ran focused auto-message batches.

### Measured signal on final code
Small final sweep, `2 x 6` personas:
- `rate_floor_cfo`: 1/2 booked
- `panic_churn_ops`: 1/2 booked
- `fx_trust_shock_finance`: 2/2 booked
- `cm_winback`: 2/2 booked
- `grey_pain_switcher`: 0/2 booked
- `direct_contract_transition`: 2/2 booked

Focused finance rerun on final code, `4 x` each:
- `rate_floor_cfo`: 2/4 booked
- `fx_trust_shock_finance`: 4/4 booked

### Useful comparison I saw during the pass
On an earlier pre-change `4 x 6` sample:
- `rate_floor_cfo`: 2/4 booked
- `fx_trust_shock_finance`: 3/4 booked

So the clearest measured positive signal from this pass is `fx_trust_shock_finance`, where the structure-first cost-predictability route improved in quick checks. I do **not** have a reliable full-batch proof yet that the overall simulator meeting rate is up.

## What still limits conversion
- No fresh `30 x 6` rerun on the final code, so variance is still high.
- `grey_pain_switcher` stayed unstable in small samples and likely needs a separate incident-ownership proof pass.
- Ops / winback / transition personas seem sensitive to over-structured bridge steps. For them, changing proof order helps, but over-constraining ask routing can hurt conversion.
- Because the sim uses both rules and LLM hinting, some persona policy now lives in doctrine / prompt shaping rather than only canned text. That is intentional, but it means final gains should be validated with a bigger batch, not inferred from one or two conversations.
