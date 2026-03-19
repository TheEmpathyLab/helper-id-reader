# SESSION_REVIEW_INSTRUCTIONS.md
> Drop this file into the project context before asking Claude to produce a session review.  
> It defines the format, rules, and quality bar for all Helper-ID session summaries.

---

## What a session review is

A session review is a **decision log**, not a meeting summary. It captures what was decided, why, what was deferred, and what comes next — in a format that can be re-fed into a future Claude session as working context without re-hashing solved problems.

Every session review is a Markdown file committed to the repo. It is institutional memory. It replaces the knowledge that would otherwise leave with the person who held it.

---

## Output rules (non-negotiable)

- **Format:** Markdown only. Never DOCX, never PDF, never plain text.
- **Filename:** `YYYY-MM-DD-{short-slug}.md` — e.g. `2026-03-17-architecture-decisions.md`
- **Location:** Commit to `sessions/` folder in the repo root.
- **Length:** Comprehensive but not verbose. Every section earns its place.
- **Tense:** Past tense for what was decided. Present tense for what is true now. Future tense only for next steps.
- **No filler:** No "in this session we discussed..." preamble. Start with substance.

---

## Required sections

Every session review must include all of the following sections, in this order.

---

### 1. Header block

```markdown
# Helper-ID — {Session Title}
**Session date:** YYYY-MM-DD  
**Status:** Decision log — ready for repo commit  
**Next session entry point:** {one sentence describing where to pick up}
```

---

### 2. What was decided

Bullet list. Each item is a **concrete decision** made during the session — not a topic discussed, not a question raised. Decisions only.

Format:
```markdown
## What was decided
- {Decision stated as a fact, not a topic}
- {Decision stated as a fact, not a topic}
```

Examples of good decisions:
- "PIN is system-generated, not member-chosen — it lives on a physical card, not in memory."
- "Emergency contacts use three separate fields (name, relationship, phone) — not a composite string."
- "All session outputs are Markdown committed to the repo. No DOCX ever."

Examples of bad entries (do not include):
- "We discussed the PIN model" ← topic, not decision
- "PIN design was considered" ← vague
- "The team agreed to think about emergency contacts" ← not actionable

---

### 3. What was built or designed

Concise summary of any artifacts produced in the session: schemas, flows, mockups, diagrams, code, copy. Reference them by name. If they exist in the repo, link them.

---

### 4. What was deferred (open questions)

A table. Every deferred decision captured with context and priority. This is the most important section for continuity — it prevents the next session from discovering mid-build what should have been decided up front.

```markdown
## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| {Decision not yet made} | {Why it matters, what it unblocks} | {Before step N / Before launch / Post-launch} |
```

---

### 5. What was rejected or ruled out

Explicit log of approaches considered and set aside. This is the section most likely to save future time. If it is not written down, the next team will explore the same dead end.

```markdown
## What was ruled out

- **{Approach}:** {One sentence on why it was rejected.}
```

If nothing was explicitly ruled out this session, write: `Nothing ruled out this session.`

---

### 6. Decisions that need revisiting

Anything decided today that may need to change as the product evolves. Flag it now so it does not calcify.

```markdown
## May need revisiting

- **{Decision}:** {Condition under which it should be reconsidered.}
```

---

### 7. Next steps

The build order or action list coming out of this session. Numbered. Each item is one testable unit of work with a clear owner implied by context.

```markdown
## Next steps

1. {Concrete action} — {what "done" looks like}
2. {Concrete action} — {what "done" looks like}
```

---

### 8. Provenance label

Required on every session review. Calculate percentages based on actual contribution during the session.

```markdown
## Provenance label

\`\`\`
Provenance Label v1.0
- Human Contribution: X%
- AI Contribution: Y%
- Collaboration Method: {description}
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: {specific actions — ideation, decisions, corrections, priorities}
- AI Roles: {specific actions — drafting, schema design, mockups, documentation}
\`\`\`
```

---

## Quality checks before outputting

Before finalizing the session review, verify:

- [ ] Every item in "What was decided" is a decision, not a topic
- [ ] Every open question has a priority
- [ ] The "What was ruled out" section exists — even if empty
- [ ] Next steps are numbered and concrete (not "think about X" or "consider Y")
- [ ] Filename follows `YYYY-MM-DD-{slug}.md` convention
- [ ] No DOCX was produced at any point
- [ ] Provenance label percentages reflect actual session contribution split
- [ ] The "Next session entry point" in the header is a single actionable sentence

---

## How to trigger a session review

At the end of any working session, Shelton will say one of:

> "Session review please."  
> "Let's capture this session."  
> "Write up the session."  
> "Summarize and commit."

When any of these phrases appear, produce the full session review Markdown file using this template. Do not ask clarifying questions first — produce the review from session context, then ask if anything needs adjustment.

---

## Re-feeding a session review into a new session

When Shelton drops a past session review into the project context, treat it as ground truth:

- Decisions recorded in it are **final unless explicitly reopened**
- Open questions in it are **the first things to resolve** before building
- Ruled-out approaches **do not get re-proposed** without new information
- The "Next session entry point" line is **where the session starts**

If a past session review contradicts something proposed in the current session, flag the conflict explicitly before proceeding.

---

## Naming convention for the sessions folder

```
sessions/
  2026-03-17-architecture-decisions.md
  2026-03-24-supabase-setup.md
  2026-04-01-nfc-integration-review.md
```

One file per working session. Dated. Slugged to the primary topic. Committed at the end of every session before closing.

---

*This file is itself a project artifact. If the format needs to change, update this file and commit the change — do not just tell Claude verbally.*
