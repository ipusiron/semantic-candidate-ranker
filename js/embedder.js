/**
 * Embedding module using Transformers.js
 * Handles model loading and text embedding with batch processing
 */

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
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
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2'
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

    if (signal?.aborted) {
        throw new DOMException('Model loading aborted', 'AbortError');
    }
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
