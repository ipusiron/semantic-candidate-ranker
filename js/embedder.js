/**
 * Embedding module using Transformers.js
 * Handles model loading and text embedding with batch processing
 */

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const TRANSFORMERS_VERSION = '3.5.2';
export const MODEL_WORDPIECE_LIMIT = 256;
const BATCH_SIZE = 10;

let pipeline = null;
let extractor = null;

/**
 * Load the embedding model (lazy loading)
 * @param {AbortSignal} signal - Optional abort signal
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<void>}
 */
export async function loadModel(signal, onProgress) {
    if (extractor) {
        return; // Already loaded
    }

    // Dynamically import Transformers.js from CDN
    // Note: Dynamic imports don't support SRI. Version pinning (@3.5.2) provides
    // protection against unexpected changes. jsdelivr is a trusted CDN.
    const { pipeline: createPipeline } = await import(
        `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}`
    );

    if (signal?.aborted) {
        throw new DOMException('Model loading aborted', 'AbortError');
    }

    pipeline = createPipeline;

    // Create the feature extraction pipeline
    extractor = await pipeline('feature-extraction', MODEL_ID, {
        progress_callback: (progress) => {
            if (onProgress && progress.status === 'progress') {
                onProgress(progress.progress || 0);
            }
        }
    });

    // The upstream model card defines 256 word pieces as the intended maximum.
    // The browser port exposes a larger generic BERT limit, so pin the tokenizer
    // here to keep the runtime behavior aligned with the model contract.
    extractor.tokenizer.model_max_length = MODEL_WORDPIECE_LIMIT;

    if (signal?.aborted) {
        throw new DOMException('Model loading aborted', 'AbortError');
    }
}

/**
 * Inspect the exact WordPiece usage of candidate texts with the loaded tokenizer.
 * The token count includes the model's special tokens.
 * @param {string[]} texts
 * @returns {Promise<Array<{tokenCount: number, usedTokenCount: number, truncated: boolean}>>}
 */
export async function inspectTokenUsage(texts) {
    if (!extractor?.tokenizer) {
        throw new Error('Model not loaded. Call loadModel() first.');
    }

    const usage = [];
    for (const text of texts) {
        const encoded = await extractor.tokenizer(text, {
            padding: false,
            truncation: false,
            return_tensor: false
        });
        const ids = encoded.input_ids;
        const firstSequence = Array.isArray(ids?.[0]) ? ids[0] : ids;
        const tokenCount = Array.isArray(firstSequence) ? firstSequence.length : 0;
        usage.push({
            tokenCount,
            usedTokenCount: Math.min(tokenCount, MODEL_WORDPIECE_LIMIT),
            truncated: tokenCount > MODEL_WORDPIECE_LIMIT
        });
    }
    return usage;
}

/**
 * Check if model is loaded
 * @returns {boolean}
 */
export function isModelLoaded() {
    return extractor !== null;
}

/**
 * Embed a single text
 * @param {string} text - Text to embed
 * @returns {Promise<Float32Array>} Embedding vector
 */
export async function embedText(text) {
    if (!extractor) {
        throw new Error('Model not loaded. Call loadModel() first.');
    }

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data);
}

/**
 * Embed multiple texts with batch processing
 * @param {string[]} texts - Array of texts to embed
 * @param {AbortSignal} signal - Optional abort signal
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<Float32Array[]>} Array of embedding vectors
 */
export async function embedTexts(texts, signal, onProgress) {
    if (!extractor) {
        throw new Error('Model not loaded. Call loadModel() first.');
    }

    const embeddings = [];
    const total = texts.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
        if (signal?.aborted) {
            throw new DOMException('Embedding aborted', 'AbortError');
        }

        const batch = texts.slice(i, i + BATCH_SIZE);

        // Process batch
        for (const text of batch) {
            const output = await extractor(text, { pooling: 'mean', normalize: true });
            embeddings.push(new Float32Array(output.data));
        }

        // Report progress
        if (onProgress) {
            const progress = Math.min(100, Math.round(((i + batch.length) / total) * 100));
            onProgress(progress);
        }

        // Yield to UI thread to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    return embeddings;
}

/**
 * Cache for reference embeddings
 */
let cachedReferenceEmbeddings = null;
let cachedCentroid = null;

/**
 * Get or compute reference embeddings (cached)
 * @param {string[]} sentences - Reference sentences
 * @param {AbortSignal} signal - Optional abort signal
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<{embeddings: Float32Array[], centroid: Float32Array}>}
 */
export async function getOrComputeReferenceEmbeddings(sentences, signal, onProgress) {
    if (cachedReferenceEmbeddings && cachedCentroid) {
        return {
            embeddings: cachedReferenceEmbeddings,
            centroid: cachedCentroid
        };
    }

    // Import scorer for centroid computation
    const { computeCentroid } = await import('./scorer.js');

    // Compute embeddings
    const embeddings = await embedTexts(sentences, signal, onProgress);

    // Compute centroid
    const centroid = computeCentroid(embeddings);

    // Cache results
    cachedReferenceEmbeddings = embeddings;
    cachedCentroid = centroid;

    return { embeddings, centroid };
}

/**
 * Clear the reference embedding cache
 */
export function clearCache() {
    cachedReferenceEmbeddings = null;
    cachedCentroid = null;
}
