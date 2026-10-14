# Semantic Candidate Ranker - Functional Specification

## Purpose

Compare English plaintext candidates by semantic similarity to a fixed collection of 300 English references. The ranking is a review aid. It is not decryption, grammatical-naturalness assessment, quality grading, or probability estimation.

## Input

- Up to 200 candidates
- One candidate per block; blocks are separated by one or more blank lines
- Line breaks inside a candidate are allowed and become spaces during normalization
- Input and reference language: English

## Metadata Exclusion

Consecutive `key=value` lines at the start of each block are metadata.

- `key`: one or more ASCII word characters (`A-Z`, `a-z`, `0-9`, `_`)
- `value`: all content after the first `=` with surrounding whitespace removed
- The first value is kept when a key repeats
- Metadata is shown and included in copy output but excluded from embedding
- Once a normal text line is found, later `key=value` lines are plaintext
- Empty and metadata-only blocks are discarded

Example:

```text
branch=B12
mapping=Q->u
dear friend i will meet you at the station
```

The evaluation text is `dear friend i will meet you at the station`; copy output preserves all three lines.

## Normalization

1. Lowercase
2. Replace line breaks with spaces
3. Collapse whitespace runs
4. Trim surrounding whitespace
5. Preserve apostrophes

## Language

- Japanese interface by default
- Complete English interface
- The selected language is stored when local storage is available
- Interface language never changes the evaluation references or score
- Existing results are redrawn, not recomputed, after a language change

## Tool Views

The application has two keyboard-operable tabs:

- **Compare candidates** accepts user-supplied candidate blocks and ranks them with one selected preset.
- **Evaluation lab** runs the fixed `eval-en-18-v1` dataset through all five presets and compares a selected perturbation with its original case.

Switching tabs or interface language preserves completed comparison and evaluation results. The evaluation lab does not modify the user input in the comparison tab.

## Fixed Evaluation Dataset

- 18 cases: six cipher families × three authored length groups
- Six candidates per case, for 108 candidates in total
- One labeled correct candidate and five candidates from wrong settings in each case
- Correct positions 1 through 6 each occur in exactly three cases
- Evaluation plaintexts are separate from the 300 reference sentences
- Version: `eval-en-18-v1`
- SHA-256: `e763264a9b2d4c5ad5104f73cfbbb0e74e40c24e8e0546ee5ebab44d28756b3a`

The length groups are dataset-design categories, not the runtime tokenizer bands shown for arbitrary input. The dataset is generated deterministically from fixed plaintexts and cipher settings. Its version and fingerprint must change when the ordered evaluated content changes.

The lab reports Top-1, Top-3, mean reciprocal rank (MRR), and median correct rank. These are descriptive observations on the fixed dataset. They must not be presented as general accuracy, confidence, a calibrated quality measure, or evidence that one preset is generally best.

## Perturbation Comparison

The lab provides eight deterministic starting changes: letter case, whitespace, punctuation, one-character substitution, word deletion, local word reordering, appending an unrelated sentence, and extension beyond 256 word pieces. The changed text remains editable.

Only the labeled correct candidate is replaced and re-embedded. The other five candidates, model, reference collection, and selected case remain fixed. The UI reports observed changes in rank, composite, A, B, and top-k neighbor membership. It does not infer why the change occurred or whether it improves text quality.

## Model Contract

- Model ID: `Xenova/all-MiniLM-L6-v2`
- Runtime: Transformers.js 3.5.2
- Output: 384-dimensional, mean-pooled, L2-normalized vector
- Maximum input: 256 word pieces per candidate, including special tokens
- The runtime tokenizer is explicitly pinned to 256 to match the upstream model card
- Exact pre-truncation token counts are obtained from the loaded tokenizer

## Scoring

For normalized cosine similarities:

```text
A = (cos(candidate, reference_centroid) + 1) / 2
B = (average(top-k reference cosine similarities) + 1) / 2
comparison_score = wA * A + wB * B
```

The UI displays A, B, and the composite. These are reference-proximity values, not probabilities or quality scores.

For each candidate, the scorer also retains the top-k reference indexes and individual cosine values used for B. Equal cosine values keep source-collection order. The UI resolves those indexes to the exact reference sentences and discloses both raw cosine and `(cosine + 1) / 2` display proximity.

| Preset ID | wA | wB | k |
| --- | ---: | ---: | ---: |
| `balanced` | 0.5 | 0.5 | 5 |
| `centroid` | 0.7 | 0.3 | 5 |
| `neighbors` | 0.3 | 0.7 | 5 |
| `top3` | 0.5 | 0.5 | 3 |
| `top7` | 0.5 | 0.5 | 7 |

Ties keep source order. Component and composite values are clamped to `[0, 1]` for float-rounding safety. The tool applies no qualitative score thresholds.

## Descriptive Input Length

The input-length label is descriptive and must not be called confidence.

| Band | Token count |
| --- | ---: |
| Short | 0–31 |
| Medium | 32–128 |
| Long | 129–256 |
| Over limit | More than 256; only the first 256 are used |

## Result Context

Every result set includes:

- model ID
- Transformers.js version
- reference sentence count
- reference-set version (`en-300-v1`)
- reference-set SHA-256 (`99438d5c1522c3c66cf5378ace2cc5382f632bdb95ef111fb83758a38a3a5e31`)
- token limit
- selected preset
- truncation warning count, when nonzero

Input or preset mutation invalidates the displayed result.

The fingerprint is computed over UTF-8 `JSON.stringify(referenceSentences)` in source order. It identifies the exact collection used by this version; it is not a signature or third-party authenticity proof.

Evaluation context separately displays the evaluation-set version, full SHA-256 fingerprint, case count, candidate count, and composition.

## Processing and Cancellation

1. Load runtime and model
2. Parse candidates and inspect token usage
3. Embed or retrieve cached reference embeddings and centroid
4. Embed candidates
5. Score, sort, and render

The slow notice appears after 20 seconds. The current operation can be cancelled through `AbortController` checks between stages and batches.

## Network and Privacy

- Candidate text is processed in the browser and is not sent to an application API.
- Runtime files may be fetched from jsDelivr and model files from Hugging Face.
- Cached files may enable reuse, but subsequent offline availability is not guaranteed.
- The offline indicator reflects `navigator.onLine`, not model readiness.
- No telemetry is implemented.

## Security

- User-controlled values are rendered with DOM creation and `textContent`, never assigned to `innerHTML`.
- CSP allows only the local application and required runtime/model hosts.
- Dynamic imports do not support SRI; the package version is pinned and the CDN remains a trust dependency.
- New-tab links use `noopener noreferrer`.

## Limitations

- The hand-built reference collection is not a validated sample of English.
- There is no labeled benchmark or calibrated decision threshold.
- Close scores do not establish that candidates are equally likely to be correct.
- Terms and styles absent from the references may rank poorly.
- Content beyond the token limit is not represented.
