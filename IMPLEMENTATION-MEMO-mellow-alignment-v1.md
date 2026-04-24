# Mellow alignment implementation v1

## Scope kept narrow
- No new product surface or backend expansion.
- Existing simulator logic, personas, and deterministic assessment stayed intact.
- Changes focused on presentation, flow legibility, and one guardrail on finish.

## What changed
- Reframed the UI around three phases: Setup, Run, Review.
- Folded the signal brief into Setup instead of presenting it as a separate major stage.
- Replaced the dark shell with a light, calm workspace closer to Mellow posture.
- Made the run area read as a controlled conversation surface with status and focus cues.
- Removed destructive styling from the finish action.
- Reworked the review section into a coaching-style hierarchy.
- Added a backend check so a run cannot be finished before the first seller message.

## Verification
- Local syntax check for `server.js` and `public/app.js`.
- Manual API walkthrough for create -> blocked early finish -> message -> finish.
- Confirmed updated HTML is served on localhost and on the public URL.
