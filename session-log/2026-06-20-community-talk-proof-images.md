# Helper-ID — Community Talk Proof Images
**Session date:** 2026-06-20
**Status:** Decision log — ready for repo commit
**Next session entry point:** Review the proof section live (stickers + community kit photos) and decide on image compression/optimization before wider outreach.

---

## What was decided

- Real photos of the Helper-ID stickers and community kit are placed **high on the page** — directly below the hero, above the talk outline — to establish proof that the program is real before any copy is read.
- The two images sit side-by-side in a 2-column grid (stacking to 1 column on mobile), each with a caption underneath rather than overlaid text.
- Captions explicitly frame the images as proof, not decoration: stickers are "handed out at every talk, not a mockup"; the kit photo is "this is a real, working program."

---

## What was built or designed

- **Proof section in `community-talk.html`** — new `.proof-grid` / `.proof-item` block inserted between the hero and "The Program" section, rendering `images/helper-id-stickers.jpg` and `images/helper-id-community-kit.jpg` at 1:1 aspect ratio with captions.

---

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Should the source images be compressed before launch? | Both files are uncompressed phone originals at 2992×2992 (Samsung Galaxy S26 Ultra) — full-size JPEGs will slow page load | Before active outreach |
| Are these the final product photos, or placeholders for a future photoshoot? | Photos appear to be quick captures rather than styled product shots | Before sharing link publicly |

---

## What was ruled out

Nothing ruled out this session.

---

## May need revisiting

- **Image file size:** Both JPEGs are full-resolution camera originals with EXIF/GPS data embedded — should be resized and stripped of EXIF before this page sees real traffic.
- **Caption copy:** Drafted quickly to hit the "this is real" goal — revisit wording once Shelton sees it live.

---

## Next steps

1. View `community-talk.html` in the browser and confirm the proof section reads well on desktop and mobile.
2. Resize/compress `helper-id-stickers.jpg` and `helper-id-community-kit.jpg` (and strip EXIF/GPS metadata) before the page goes out to any organizer.
3. Commit the updated `community-talk.html` and the two new image files.

---

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 20%
- AI Contribution: 80%
- Collaboration Method: Shelton supplied the two photos and the placement/captioning intent; Claude located the assets, built the layout, and wrote the captions.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Photo sourcing, placement priority ("high on the page"), captioning intent
- AI Roles: Markup/CSS for the proof grid, caption copy, layout placement, visual verification
```
