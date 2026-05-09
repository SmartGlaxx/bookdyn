## Continuity Director: Character Ledger + Todos/Dones

A universal continuity system applied to **every book type** to stop character drift (name swaps, role flips, relationship changes) and to track unresolved plot threads across sections and chapters.

---

### 1. Character Ledger (anti-switch system)

A persistent, per-character bullet record carried across the entire book.

**Stored on the book** (new `character_ledger` jsonb column):

```text
characters: [
  {
    id, name, aliases[],
    identity:    [bullets — who they are, age, job, traits…],
    relationships: [bullets — "Friends with James (works at Corp AtoB)", "Loyal to X faction"…],
    key_statements: [bullets — verbatim or paraphrased lines + whom they were said to],
    history:     [bullets — what they have done, where they went, to whom, in which section],
    last_section_activity: "N/A" | [bullets for the most recent section they appeared in],
    last_seen_section_id
  }
]
```

Rules:
- Each character entry can grow to 100+ bullets — no cap.
- After every **section** generation: an extractor pass updates ledger entries for characters who appeared in that section (append to history, refresh `last_section_activity`, add new relationships/statements).
- Characters not mentioned in the section: leave intact, set `last_section_activity = "N/A"` for that section.
- Loyalty / relationship shifts (e.g. "now opposes Y", "switched to faction Z") are explicitly noted in `relationships` with the section number.
- Before writing a new section: for every character likely to appear, the **full ledger entry** for that character is injected into the prompt context, so the model plans their actions consistent with their identity, relationships, and recent history.

### 2. Todos & Dones Ledger (universal, all genres)

A separate plot-thread tracker, distinct from the running summary.

**Stored on the book** (new `plot_ledger` jsonb column):

```text
todos: [{ id, text, introduced_section, assigned_section?, status }]
dones: [{ id, text, introduced_section, completed_section }]
```

Flow:
- After **outline** generation: seed todos from chapter promises.
- Before writing a **chapter**: pick which todos this chapter will resolve. If the chapter has subsections, assign each todo to the subsection whose title best fits.
- After each **section** is written: an extractor pass:
  - Adds any new todos introduced in the section.
  - For each existing todo: decide if it is **clearly completed** (narrative shift confirms it) → move to `dones`. If still in preparation → keep in `todos`.
  - Nothing is deleted mid-book.
- This updated ledger is carried into the next section's prompt and into the next chapter's planning step.

### 3. End-of-book reconciliation

After the **last chapter**:
- Flatten todos + dones, dedupe by id/text similarity.
- Verify every todo (including ones added later) now appears in dones; if not, the closing section/epilogue must resolve them.
- Then — and only then — generate the **back-cover summary** and finalize the running summary.

---

### Technical implementation

**DB migration**
- `books.character_ledger jsonb default '{"characters":[]}'`
- `books.plot_ledger jsonb default '{"todos":[],"dones":[]}'`

**New edge function: `update-continuity`**
- Input: `{ bookId, sectionText, sectionRef:{chapterIndex, subsectionIndex}, currentLedger, currentPlot, characters: existingNames[] }`
- Calls DeepSeek (with Lovable AI fallback) using a strict JSON-schema response:
  - `character_updates`: per-character append-only bullets + `last_section_activity` + relationship/loyalty deltas.
  - `new_characters`: any first-appearance entries.
  - `plot_updates`: `new_todos`, `completed_ids`, `assignment_changes`.
- Edge function merges deltas into the stored ledgers (append-only history; replace `last_section_activity`) and writes back to `books`.
- verify_jwt = false, Bearer + apikey validated in code (existing pattern).

**`generate-content` prompt changes**
- Inject **only the relevant character ledger entries** (characters expected in this chapter/section per outline + any referenced by name in the previous section) into the system prompt under a `# Character Ledger (must not contradict)` block.
- Inject the open `todos` filtered to those assigned to this section, plus a short `recent dones` list, under `# Plot Threads`.
- Instruction: never rename, never change a character's role/relationship without explicitly narrating the shift; resolve assigned todos within the section.

**`generate-outline`**
- After outline returns: seed `plot_ledger.todos` from chapter promises and assign each to a chapter (and subsection when titles allow).

**`useBookGeneration` hook**
- After each successful section write (and after each chapter write when no subsections): call `update-continuity` before moving on.
- Before generating the next section/chapter: read the freshly-updated ledgers from the book record and pass them through.

**End-of-book hook**
- When the final chapter completes: call `update-continuity` with `mode: "finalize"` to dedupe and reconcile, then call the existing summary path to produce `back_cover_summary`.

**UI**
- No new primary UI in this phase — ledgers are internal continuity machinery.
- Small read-only "Continuity" panel inside Book Settings (collapsible) so the user can inspect the character ledger and todos/dones if they want. Edit comes later.

---

### Out of scope (follow-ups)
- User-editable ledger UI.
- Visual character index integration with portraits.
- Cross-book ledger inheritance for series continuations (will reuse parent book's final ledger as seed).
