---
name: Genre Style Profiles
description: Per-genre style profiles injected into generate-content system prompt. Crime/Detective/Thriller/Mystery activates James Hadley Chase hard-boiled profile.
type: feature
---
- `src/types/book.ts` GENRE_PRESETS.fiction includes Crime and Detective alongside Thriller and Mystery.
- `supabase/functions/generate-content/index.ts` adds `book.genre` to BOOK CONTEXT and injects a James Hadley Chase style profile when genre matches /(crime|detective|thriller|mystery|noir|hard[- ]?boiled)/ AND book is narrative.
- Profile enforces: short muscular sentences, clipped loaded dialogue with subtext, sensory specifics (smoke, bourbon, rain), brief ugly violence, seedy/neon settings, suspense via withholding, no moralising, relentless pace.
- Banned tone words inside profile: lovely, beautiful, magical, wonderful, gentle (unless ironic). Existing global ban on "magic"/"magical" still applies.
