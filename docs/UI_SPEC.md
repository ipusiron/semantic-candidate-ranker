# Semantic Candidate Ranker - UI Specification

## Layout

1. Header: help, language switch, title, subtitle, scope warning
2. Centered tab list: Compare candidates, Evaluation lab
3. Compare panel: input, preset, processing status, execution conditions, top cards, and remaining candidates
4. Evaluation panel: dataset identity, run/cancel, metrics, grouped results, case details, and perturbation comparison
5. Footer: GitHub link and browser-offline indicator

The tab list follows the ARIA tab pattern. Left/Right Arrow, Home, and End move and activate tabs. Only the active tab participates in sequential keyboard focus.

## Responsive Rules

- Mobile-first base layout from 320px
- 600px breakpoint for wider controls and result grids
- 900px breakpoint for three top-result columns
- No horizontal overflow at 320px or 390px
- Header controls occupy their own row and never overlap the title
- Interactive controls provide a minimum 44px tap target
- Long metadata and repository text wrap instead of widening the page
- Evaluation summaries are one column on mobile and expand only where available width permits

## Input State

- Textarea and preset remain editable while idle
- Compare starts processing; Cancel replaces Compare during processing
- Input, preset, and language controls are disabled while processing
- Input or preset changes hide stale results and messages

The evaluation controls are independent of the comparison input. Starting either operation disables both tabs and other conflicting controls until completion or cancellation.

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

## Evaluation State

Before a run, the evaluation panel displays version `eval-en-18-v1`, its full fingerprint, 18 cases, 108 candidates, and the six-by-three-by-six composition.

After a run it displays:

- Balanced Top-1, Top-3, MRR, and median correct rank
- the same four metrics for all five presets
- Balanced results grouped by six cipher families and three authored length categories
- 18 native `details` elements showing correct rank, correct candidate, top-ranked candidate when different, generation settings, and score gap
- a reminder that the observations do not establish general performance

The perturbation area selects one evaluation case and one of eight deterministic changes. Its editable textarea contains only the changed correct candidate. Results compare before and after rank, composite, A, B, and changed top-k references while keeping the other five candidates fixed.

Completed evaluation results survive tab and language changes. A language change redraws labels without re-embedding candidates.

## Bilingual Behavior

- All visible strings, dynamic values, button labels, document title, `html lang`, description, and ARIA labels switch together.
- Current input and results are preserved.
- Current warnings are retranslated from message keys.
- The model and references do not reload because evaluation language is always English.

## Help Dialog

- Opens from the `?` button
- Uses `role="dialog"`, `aria-modal="true"`, and a labelled heading
- Explains what the tool compares, each metric, presets, the evaluation lab, network behavior, token limit, and judgement limits
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
- Tabs use `role="tab"`, `aria-selected`, `aria-controls`, and associated tab panels
