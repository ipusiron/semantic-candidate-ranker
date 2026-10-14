# CLAUDE.md

## Project Overview

Static GitHub Pages application that compares English plaintext candidates with a fixed English reference collection. It ranks candidates by semantic similarity; it does not measure grammatical naturalness, confidence, or decryption correctness.

The Japanese and English UI must remain complete, and `README.md` and `README.en.md` must describe the same behavior and limitations.

## Technology

- Transformers.js 3.5.2 loaded through a pinned dynamic import from jsDelivr
- `Xenova/all-MiniLM-L6-v2`, 384-dimensional normalized embeddings
- Explicit 256-word-piece tokenizer limit, matching the upstream model card
- Plain ES Modules and mobile-first CSS; no build step
- Dependency-free Node.js 22 tests (`npm test`)

## Architecture

```text
index.html
js/
  app.js                  # five-stage orchestration
  embedder.js             # model loading, embedding, exact token inspection
  scorer.js               # pure vector scoring and stable ranking
  normalizer.js           # block parsing, metadata exclusion, normalization
  ui.js                   # DOM rendering; user values use textContent
  i18n.js                 # complete Japanese and English dictionaries
  reference-sentences.js  # fixed 300-sentence English collection
style/                    # base, mobile, tablet, and laptop rules
docs/                     # functional and technical contracts
test/                     # Node standard-library regression tests
```

## Scoring Contract

```text
A = (cos(candidate, reference_centroid) + 1) / 2
B = (average(top-k reference cosine similarities) + 1) / 2
comparison_score = wA * A + wB * B
```

Presets:

- `balanced`: wA=0.5, wB=0.5, k=5
- `centroid`: wA=0.7, wB=0.3, k=5
- `neighbors`: wA=0.3, wB=0.7, k=5
- `top3`: wA=0.5, wB=0.5, k=3
- `top7`: wA=0.5, wB=0.5, k=7

Do not label A as naturalness, the composite as probability or quality, or the descriptive input-length band as confidence. Do not add qualitative score thresholds without a labeled validation dataset and calibration evidence.

## Required Behavior

- English plaintext input only; Japanese and English interface text
- Up to 200 blank-line-separated candidate blocks
- Consecutive leading `key=value` lines are metadata and excluded from evaluation
- Model, runtime version, reference count, token limit, and preset accompany results
- Candidates over 256 word pieces show both used and original counts
- Input and preset changes invalidate old results
- Language changes redraw any current result without recomputing it
- User-controlled content must not be assigned to `innerHTML`
- Preserve 320–390px layouts without horizontal overflow and keep controls at least 44px high

## Network and Security

Candidate text stays in the browser. Runtime and model files are fetched from external hosts when not cached. Cache availability and later offline operation are not guaranteed. Dynamic imports cannot use SRI; the pinned jsDelivr package is part of the trust boundary.

Keep CSP origins minimal and retain `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'`, and `form-action 'self'`. Do not claim HTTP headers that a meta element or GitHub Pages cannot set.

## Verification

Run:

```shell
npm test
node --check js/app.js
node --check js/embedder.js
node --check js/scorer.js
node --check js/normalizer.js
node --check js/i18n.js
node --check js/ui.js
```

For a publication check, verify HTTP and public HTTPS behavior at 390px and desktop width, language redraw, exact tokenizer truncation reporting, no horizontal overflow, no console errors, and local/public file hashes.
