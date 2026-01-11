# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based tool that ranks plaintext candidates using semantic similarity with offline embedding. Static web application for GitHub Pages deployment. Supports Japanese (default) and English.

## Technology Stack

- **Embedding**: Transformers.js with `Xenova/all-MiniLM-L6-v2` model (384-dim embeddings)
- **No Build System**: Plain ES modules loaded via CDN
- **CSS**: Mobile-first with breakpoints at 600px (tablet) and 900px (desktop)
- **i18n**: Custom module with Japanese/English support, localStorage persistence

## Architecture

### File Structure

```
index.html                # Entry point (Japanese default)
style/
  style.css               # Base styles with CSS variables
  style-mobile.css        # Mobile styles (< 600px)
  style-tablet.css        # Tablet styles (600px+)
  style-laptop.css        # Desktop styles (900px+)
js/
  app.js                  # Main controller, 5-stage pipeline orchestration
  embedder.js             # Transformers.js wrapper, model loading, batch embedding
  scorer.js               # Scoring algorithm, presets, cosine similarity
  normalizer.js           # Text normalization, candidate parsing
  ui.js                   # DOM manipulation, results rendering, language toggle
  i18n.js                 # Internationalization (Japanese/English)
  reference-sentences.js  # ~300 reference sentences per language
```

### Processing Pipeline (5 stages)

1. **Model loading** - Load Transformers.js and download model (cached after first run)
2. **Preparing candidates** - Parse input, normalize text
3. **Preparing references** - Compute reference embeddings and centroid (cached per session per language)
4. **Computing similarities** - Embed candidates in batches
5. **Ranking results** - Score and sort candidates

### Scoring Algorithm

```
Final Score = wA × Naturalness + wB × ReferenceProximity

Naturalness = cosine_similarity(candidate, centroid_of_references)
ReferenceProximity = average(top_k_similarities_to_references)
```

Presets in `js/scorer.js`:
- Balanced: wA=0.5, wB=0.5, k=5
- Naturalness: wA=0.7, wB=0.3, k=5
- Reference: wA=0.3, wB=0.7, k=5
- Strict: wA=0.5, wB=0.5, k=3
- Broad: wA=0.5, wB=0.5, k=7

### Key Implementation Details

- **Language toggle**: Button in top-right corner switches between Japanese and English
- **Reference cache**: Cleared when language changes to use correct reference sentences
- **AbortController**: Cancellation support throughout the pipeline
- **Batch processing**: Candidates embedded in batches of 10 with UI thread yielding
- **Caching**: Reference embeddings cached per session, model cached in IndexedDB
- **XSS prevention**: All user text rendered via `textContent` or `escapeHtml()`

## Constraints

- Max 200 candidates
- Confidence: Low (<40 chars), Medium (40-120), High (>=120)
- Slow warning shown after 20 seconds

## Specifications

- `/docs/SPEC.md` - Functional specification
- `/docs/UI_SPEC.md` - UI/UX specification
