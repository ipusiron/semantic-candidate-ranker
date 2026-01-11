# Semantic Candidate Ranker - UI SPEC

## Layout
- Header with title, help button, language toggle
- Input textarea (candidates)
- Preset selector
- Run/Cancel buttons
- Progress indicator
- Results area
- Footer with GitHub link

## Header
- Title and subtitle
- Help button (?) - opens help modal
- Language toggle button (EN/JP)

## Input
- Textarea
- Placeholder explains blank-line-separated blocks
- Placeholder examples always in English (regardless of UI language)

## Controls
- Preset dropdown (5 options)
- Run button (primary)
- Cancel button (shown during processing)

## Progress UI
- Step-based indicator (5 steps)
- Visual states: pending, active (pulsing), completed (checkmark)
- Slow warning message (after 20 seconds)

## Results

### Top Results (Top 3)
- Large cards with rank badge
- Candidate text
- Evaluation comment (Excellent/Good/Fair/Weak/Poor)
- Score value
- Confidence badge (High/Medium/Low)
- Copy button

### All Results (Remaining)
- Compact list items
- Rank number
- Truncated preview (expandable)
- Score bar (relative width)
- Confidence badge
- Toggle button (Show/Hide full text)

## Messages
- Error: empty input, processing errors
- Warning: short candidates, too many candidates
- Info: cancelled processing

## Help Modal
- Triggered by "?" button
- Backdrop click or Escape key to close
- Content sections:
  - Overview
  - Usage steps
  - Presets explanation
  - Evaluation levels
  - Limitations

## Footer
- GitHub repository link
- Offline indicator (shown when network unavailable)

## Responsive Design
- Mobile-first approach
- Breakpoints:
  - Mobile: < 600px (single column)
  - Tablet: 600px+ (wider controls)
  - Desktop: 900px+ (multi-column results)

## Accessibility
- ARIA labels on buttons
- Keyboard navigation (Tab, Escape for modal)
- Focus management
