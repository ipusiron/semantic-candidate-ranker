# Semantic Candidate Ranker - SPEC

## Purpose
Rank plaintext candidates using semantic similarity (browser-side embedding).
This tool does NOT decrypt or solve ciphers.

## Input
- Multiple plaintext candidates
- Candidates separated by blank lines
- Line breaks inside a candidate are allowed

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
