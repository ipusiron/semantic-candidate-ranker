# Semantic Candidate Ranker - Semantic Similarity Comparison for Plaintext Candidates

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/semantic-candidate-ranker?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/semantic-candidate-ranker?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/semantic-candidate-ranker)
![GitHub license](https://img.shields.io/github/license/ipusiron/semantic-candidate-ranker)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/semantic-candidate-ranker/)

**Day110 - Security Tools with Generative AI 200**

Semantic Candidate Ranker embeds English plaintext candidates and compares them with 300 built-in general-English reference sentences. It does not decrypt a cipher. It provides a way to prioritize candidates produced by another tool or by manual analysis.

The comparison score is this tool’s composite value for its reference collection. It does not measure grammatical naturalness, writing quality, decryption correctness, or the probability of being correct.

[日本語版README](README.md)

---

## 🌐 Demo

👉 **[https://ipusiron.github.io/semantic-candidate-ranker/](https://ipusiron.github.io/semantic-candidate-ranker/)**

When the required files are not cached, the browser needs an internet connection to retrieve Transformers.js and the machine-learning model from external hosts.

---

## 📸 Screenshots

> ![Japanese interface comparing three plaintext candidates](assets/screenshot.png)
>
> *Japanese interface showing the reference-set version and fingerprint with the five references used for B expanded.*

> ![English interface comparing three plaintext candidates](assets/screenshot-en.png)
>
> *The input, computed result, and disclosed reference neighborhood remain available across interface languages.*

---

## ✨ What It Can and Cannot Do

### It can

- Rank up to 200 English plaintext candidates by semantic similarity to the built-in references
- Show proximity to the reference centroid and proximity to the nearest references separately from the composite score
- Expand each candidate to inspect the reference sentences, collection indexes, and individual cosine values used for top-k proximity
- Record a reference-set version and SHA-256 fingerprint with the result conditions
- Display and copy metadata such as `shift=13` and `branch=B12` while excluding it from scoring
- Count input length with the actual tokenizer and report candidates above 256 word pieces
- Switch the complete interface between Japanese and English

### It cannot

- Decrypt a cipher, search for keys, or select the correct answer automatically
- Check grammar, spelling, or writing quality
- Prove that a candidate is factual, intended, safe, or correctly decrypted
- Turn the score into a probability or a calibrated quality grade

---

## 📖 Usage

1. Produce English plaintext candidates with another solver or through manual analysis.
2. Enter one candidate per block and separate blocks with a blank line.
3. Choose a comparison preset and select “Compare.”
4. Inspect both proximity components, the input length, and any truncation notice rather than relying on rank alone.
5. Expand “nearest references used” to inspect the sentences and individual cosine values that contributed to B.
6. Review the leading candidates against the cipher method, key, and context.

Changing the input or preset invalidates the displayed result. Changing the interface language redraws the same computed result without running the model again.

---

## 📝 Input Format

### Candidate blocks

- Use one block per candidate.
- Separate blocks with one or more blank lines.
- Line breaks inside a block become spaces before comparison.
- Empty blocks and metadata-only blocks are ignored.

```text
this is a secret message

another candidate here
```

### Metadata

Consecutive `key=value` lines at the start of a block are display metadata. Keys contain ASCII letters, digits, or underscores. A `key=value` line after the first normal text line is treated as plaintext.

```text
shift=0
the meeting begins at noon near the station

shift=13
gur zrrgvat ortvaf ng abba arne gur fgngvba
```

- Metadata is excluded from embedding and scoring.
- If a leading key occurs more than once, the first value is retained.
- Copy buttons copy the original block, including its metadata.
- Changing only metadata does not change the score for otherwise identical plaintext.

### Normalization

The evaluated plaintext is lowercased, line breaks are replaced with spaces, repeated whitespace is collapsed, and surrounding whitespace is removed. Apostrophes are preserved.

---

## 🌐 Language Support

- Interface: Japanese and English
- Plaintext candidates: English only
- Built-in references: English only

The interface language does not affect the calculation. Results for Japanese or other unsupported input cannot be interpreted using this model and reference set.

---

## 🔬 How the Comparison Score Works

The model maps every candidate and the 300 reference sentences to 384-dimensional vectors. The tool calculates two components and maps each to the display range from 0 to 1.

### A) Proximity to the reference centroid

This is cosine similarity to the L2-normalized mean of all reference vectors. It describes proximity to the center of this reference collection. It is not a direct measure of natural English.

### B) Proximity to the top-k references

This is the average cosine similarity to the k nearest reference sentences. It rises when a candidate resembles examples in the fixed collection and therefore depends on the contents of that collection.

Each candidate can disclose the exact k sentences used in this average, in proximity order, with their collection indexes, raw cosine values, and 0-to-1 display proximities. Equal cosine values retain collection order. A nearby sentence does not prove that a candidate is correct plaintext or natural English.

### Composite

```text
A = (cos(candidate, centroid) + 1) / 2
B = (average(top-k cosine similarities) + 1) / 2
comparison_score = wA × A + wB × B
```

The composite is a convenience for ranking. The tool does not apply uncalibrated “excellent” or “poor” quality thresholds.

### Presets

| Preset | wA | wB | k | Effect |
| --- | ---: | ---: | ---: | --- |
| Balanced (default) | 0.5 | 0.5 | 5 | Weights both components equally |
| Reference centroid | 0.7 | 0.3 | 5 | Gives more weight to A |
| Nearest references | 0.3 | 0.7 | 5 | Gives more weight to B |
| Top 3 references | 0.5 | 0.5 | 3 | Computes B from the three nearest references |
| Top 7 references | 0.5 | 0.5 | 7 | Computes B from the seven nearest references |

A smaller k is not inherently “stricter,” and a larger k is not inherently “more permissive.” Use these presets to observe how sensitive the ranking is to the reference neighborhood.

---

## ⚙️ Model, Input Length, and Reproduction Conditions

- Model: `Xenova/all-MiniLM-L6-v2`
- Runtime: Transformers.js 3.5.2
- Output: 384 dimensions with mean pooling and L2 normalization
- Reference collection: 300 fixed English sentences stored in this repository
- Reference-set version: `en-300-v1`
- Reference-set SHA-256: `99438d5c1522c3c66cf5378ace2cc5382f632bdb95ef111fb83758a38a3a5e31`
- Input limit: 256 word pieces per candidate, including special tokens

The upstream [all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) describes the model as a sentence and short-paragraph encoder and states that input beyond 256 word pieces is truncated by default. This tool explicitly pins the runtime tokenizer to that limit.

The fingerprint is SHA-256 over the UTF-8 bytes of the 300 English sentences serialized as a JSON array in source order. A sentence or order change produces another fingerprint, but the value is not a third-party authenticity proof or signature.

The UI records the model, runtime version, reference count, reference-set version and fingerprint, limit, and preset alongside each result. Input length is descriptive—not confidence—and is shown as short, medium, long, or over limit.

---

## ⚠️ Limitations

- The hand-built reference collection is not a validated sample of all English.
- The score thresholds have not been calibrated against labeled correct answers.
- Natural English and meaningless strings can receive close scores.
- Short candidates can have small score differences.
- Text beyond 256 word pieces is not compared.
- Specialized terms, proper nouns, and styles absent from the references may be disadvantaged.
- The disclosed neighbors explain B; they are not evidence of correctness, naturalness, or provenance.
- A ranking should be read in the context of the supplied candidate set.

Use the ranking to narrow hypotheses. Check the cipher method, key consistency, context, known plaintext, and other statistical evidence separately.

---

## 🌐 Network and Privacy

- Application code does not send candidate text to an external API; embedding and comparison run in the browser.
- When files are not cached, Transformers.js is fetched from jsDelivr and model files are fetched from Hugging Face.
- Browser caching may enable later reuse, but offline availability is not guaranteed because caches may be cleared, evicted, or disabled.
- “Browser is offline” reflects `navigator.onLine`; it does not prove that the model is cached and usable.
- The application implements no telemetry.

For sensitive candidates, verify that external resources are already available, inspect the browser’s Network panel for unexpected transmission, and consider the security of the device and browser cache.

---

## 🔒 Security

- User-controlled values enter the DOM through `textContent`; the UI does not assign them through `innerHTML`.
- A CSP limits scripts, connections, and workers to the required origins.
- The external runtime is pinned to version 3.5.2. Dynamic `import()` cannot carry SRI, so jsDelivr remains inside the supply-chain trust boundary.
- Links opened in a new tab use `noopener noreferrer`.
- GitHub Pages does not support arbitrary HTTP response headers, so the application uses CSP and Referrer Policy meta elements for controls available in static hosting.

---

## 🎯 Use Cases

### Uses specific to this tool

- **Prioritize Caesar brute-force output:** Keep `shift=N` metadata and decide which candidates to read first. The included screenshot shows comparison scores of 0.662, 0.640, and 0.622 for three sample candidates.
- **Compare substitution branches:** Preserve `branch=B12` and `mapping=...` for traceability while scoring only the plaintext.
- **Compare different solver outputs:** Place candidates from multiple decoders in separate blocks, then check whether the centroid and nearest-reference presets change their order.
- **Study reference-set dependence:** Switch between the top-3 and top-7 presets, inspect which sentences and cosine values contribute to B, and observe how k changes the composite score.
- **Observe truncation:** Enter a candidate longer than 256 word pieces and compare its original length with the number actually used.

### General uses

- Classical-cryptanalysis classes and exercises
- Learning about embeddings, cosine similarity, and reference-set bias
- Prioritizing candidates for human review
- Comparing semantic-reference ranking with other statistical methods

---

## 📁 Directory Structure

```text
semantic-candidate-ranker/
├── .github/workflows/test.yml # Node.js CI
├── assets/
│   ├── screenshot.png         # Japanese interface
│   └── screenshot-en.png      # English interface
├── docs/                      # Algorithm, model, reference, and UI specifications
├── js/
│   ├── app.js                 # Five-stage pipeline controller
│   ├── embedder.js            # Model loading, embedding, and token inspection
│   ├── i18n.js                # Japanese and English messages
│   ├── normalizer.js          # Input parsing and normalization
│   ├── reference-sentences.js # 300 fixed references
│   ├── scorer.js              # DOM-independent comparison core
│   └── ui.js                  # Safe DOM rendering
├── scripts/browser-check.mjs  # Manual Edge browser verification
├── style/                     # Mobile-first CSS
├── test/                      # Dependency-free regression tests
├── index.html                 # GitHub Pages entry point
├── package.json               # Test command
├── README.md                  # Japanese documentation
├── README.en.md               # English documentation
├── CLAUDE.md                  # Development guidance
└── LICENSE                    # MIT License
```

---

## 💻 Runtime and Tests

The application targets current desktop and mobile browsers with support for ES Modules, WebAssembly, IndexedDB, and dynamic `import()`.

Run the dependency-free standard-library tests with Node.js 22 or later:

```shell
npm test
```

---

## 📄 License

- See `LICENSE` for the source-code license.
- The application uses [Transformers.js](https://huggingface.co/docs/transformers.js/) and [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) under their respective licenses.

---

## 🛠️ About This Tool

This tool is part of the “Security Tools with Generative AI 200” project, an initiative to create and publish security-related tools over 100 days with AI assistance.

For project details and other tools, see:

🔗 [https://akademeia.info/?page_id=44607](https://akademeia.info/?page_id=44607)
