# Semantic Candidate Ranker - SPEC

## Purpose
Rank plaintext candidates using semantic similarity (browser-side embedding).
This tool does NOT decrypt or solve ciphers.

## Input
- Multiple plaintext candidates
- Candidates separated by blank lines
- Line breaks inside a candidate are allowed

## Metadata Exclusion

Supports candidate blocks with metadata lines in generic `key=value` format.
Compatible with exports from various upstream tools (Caesar Cipher Breaker, Substitution Mapping Mixer, etc.).

### Recognized Metadata Lines
A line is treated as metadata if:
1. It appears at the **beginning of the block** (consecutive lines from the start)
2. It matches the format (after trimming leading spaces):
```
<key>=<value>
```
Where:
- `key`: one or more word characters (letters, digits, underscore)
- `value`: everything after the first `=`

Examples: `shift=13`, `branch=ABC`, `mapping=XYZ`, `score=0.95`, `algorithm=caesar`

**Important**: Once a non-metadata line is encountered, all subsequent lines are treated as content (even if they match `key=value` format). This prevents false positives in plaintext containing `=` characters.

### Exclusion Rule
- Metadata lines are **excluded from semantic evaluation**
- Only non-metadata lines are normalized and sent to embedding
- This ensures rankings are based purely on plaintext content
- Changing metadata values does not affect scores (same plaintext = same score)

### Display and Copy Behavior
- All metadata is displayed prominently in results
- "Copy" action copies the **original block including metadata** for traceability
- Scoring is based only on the evaluation text (metadata excluded)

### Edge Cases
- Blocks containing **only metadata** (no plaintext content) are discarded
- Empty blocks are ignored
- Blocks with zero metadata lines are processed normally

### Example 1: Single Metadata
Input block:
```
shift=13
this is a secret message
```

Parsed as:
- `meta`: `{ shift: "13" }`
- `rawText`: `"shift=13\nthis is a secret message"`
- `evalText`: `"this is a secret message"` (used for scoring)

### Example 2: Multiple Metadata
Input block:
```
branch=ABC
mapping=QWERTYUIOPASDFGHJKLZXCVBNM
score=0.85
THIS IS A SECRET MESSAGE
```

Parsed as:
- `meta`: `{ branch: "ABC", mapping: "QWERTYUIOPASDFGHJKLZXCVBNM", score: "0.85" }`
- `rawText`: (original block)
- `evalText`: `"this is a secret message"` (used for scoring)

### Example 3: No Metadata
Input block:
```
this is a plain candidate without metadata
```

Parsed as:
- `meta`: `{}`
- `rawText`: `"this is a plain candidate without metadata"`
- `evalText`: `"this is a plain candidate without metadata"` (used for scoring)

## Normalization
- Lowercase
- Line breaks -> spaces
- Collapse multiple spaces
- Trim leading/trailing spaces
- Apostrophes preserved

## Language

### UI Language
- Japanese (default)
- English
- Switchable via toggle button

### Input/Evaluation Language
- English only
- Reference sentences are always English
- UI language does not affect evaluation

## Scoring
Two components:
A) Naturalness: similarity to centroid of reference sentence embeddings
B) Reference proximity: average similarity of top-k closest reference sentences

Final score = wA * A + wB * B

### Presets
- Balanced (default): wA=0.5, wB=0.5, k=5
- Naturalness: wA=0.7, wB=0.3, k=5
- Reference: wA=0.3, wB=0.7, k=5
- Strict: wA=0.5, wB=0.5, k=3
- Broad: wA=0.5, wB=0.5, k=7

## Reference Sentences
- Built-in
- ~300 short English sentences
- Mixed styles (dialogue, narrative, technical, misc)
- Few proper nouns

## Evaluation Comments
Based on score:
- Excellent: >= 0.85
- Good: 0.75 - 0.85
- Fair: 0.65 - 0.75
- Weak: 0.55 - 0.65
- Poor: < 0.55

## Confidence Indicator
- Low: <40 chars
- Medium: 40-120 chars
- High: >=120 chars

## Limits
- Max candidates: 200

## Performance
- Slow warning threshold: 20 seconds
- Progress stages:
  1. Model loading
  2. Preparing candidates
  3. Preparing references
  4. Computing similarities
  5. Ranking results

## Network Policy
- First run: Download model (~23MB) from Hugging Face
- Subsequent runs: Fully offline (model cached in IndexedDB)
- No external API requests
- No telemetry
- Input data never sent externally

## Security
- Content Security Policy (CSP)
- HTML escaping for XSS prevention
- No external data transmission after initial model download

## Limitations

### Model Sensitivity
The embedding model (all-MiniLM-L6-v2) may produce similar scores for natural text and gibberish in some cases. Score differences can be small (e.g., 0.64 vs 0.65), so rankings should be interpreted as guidance rather than definitive answers.

### Metadata Exclusion Trade-off
Metadata lines are excluded from evaluation to ensure consistent scoring regardless of metadata values. However, this means the evaluation is based solely on plaintext content. In edge cases where score differences are marginal, results may differ from expectations.
