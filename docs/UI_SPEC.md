# Semantic Candidate Ranker - UI Specification

## Layout

1. Header: help, language switch, title, subtitle, scope warning
2. Input: English candidates, format hint, textarea
3. Controls: comparison preset, compare/cancel buttons
4. Status: errors, warnings, five processing stages
5. Results: execution conditions, score limitation, top cards, remaining candidates
6. Footer: GitHub link and browser-offline indicator

## Responsive Rules

- Mobile-first base layout from 320px
- 600px breakpoint for wider controls and result grids
- 900px breakpoint for three top-result columns
- No horizontal overflow at 320px or 390px
- Header controls occupy their own row and never overlap the title
- Interactive controls provide a minimum 44px tap target
- Long metadata and repository text wrap instead of widening the page

## Input State

- Textarea and preset remain editable while idle
- Compare starts processing; Cancel replaces Compare during processing
- Input, preset, and language controls are disabled while processing
- Input or preset changes hide stale results and messages

## Result State

The result-context card displays model ID, runtime version, reference count, reference-set version, full SHA-256 fingerprint, token limit, and preset. The 64-character fingerprint wraps without widening the page. A warning immediately below states that the composite is not a probability, quality grade, or proof of decryption.

Top three cards show:

- rank
- metadata labels
- normalized candidate text
- comparison score
- centroid-proximity component
- top-k reference-proximity component
- descriptive input-length band and exact word-piece usage
- original count when truncated
- collapsed disclosure for the exact top-k references used by B
- original-block copy button

The reference disclosure uses a native `details` element and is rendered lazily when opened. Each item shows its one-based collection index, exact sentence, raw cosine, and 0-to-1 display proximity. It also states that similarity is not evidence of correctness or naturalness.

Remaining results use a compact layout with the same values, expandable text, reference disclosure, and copy action. The remaining-results section is hidden when fewer than four candidates exist.

## Bilingual Behavior

- All visible strings, dynamic values, button labels, document title, `html lang`, description, and ARIA labels switch together.
- Current input and results are preserved.
- Current warnings are retranslated from message keys.
- The model and references do not reload because evaluation language is always English.

## Help Dialog

- Opens from the `?` button
- Uses `role="dialog"`, `aria-modal="true"`, and a labelled heading
- Explains what the tool compares, each metric, presets, network behavior, token limit, and judgement limits
- Escape, backdrop, and close button dismiss it
- Focus moves to Close and returns to the invoking control

## Accessibility

- Logical heading order
- Native labels for textarea and select
- Visible `:focus-visible` indicator
- Live regions for messages and result updates
- Rank and length use text as well as color
- Buttons are native keyboard-operable elements
- Native reference disclosures work with keyboard and expose a 44px summary target
