/**
 * Scoring algorithm for semantic candidate ranking
 */

/**
 * Preset configurations
 * wA = weight for reference-centroid similarity
 * wB = weight for reference proximity (top-k average)
 * k = number of top references to average
 */
export const PRESETS = {
    balanced: { wA: 0.5, wB: 0.5, k: 5, label: 'Balanced' },
    centroid: { wA: 0.7, wB: 0.3, k: 5, label: 'Centroid' },
    neighbors: { wA: 0.3, wB: 0.7, k: 5, label: 'Neighbors' },
    top3: { wA: 0.5, wB: 0.5, k: 3, label: 'Top 3' },
    top7: { wA: 0.5, wB: 0.5, k: 7, label: 'Top 7' }
};

/**
 * Compute cosine similarity between two vectors
 * Assumes vectors are already L2 normalized
 * @param {number[]|Float32Array} a - First vector
 * @param {number[]|Float32Array} b - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || a.length === 0 || a.length !== b.length) {
        throw new Error('Vectors must be non-empty and have the same dimensions');
    }
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return dot;
}

/**
 * L2 normalize a vector in place
 * @param {Float32Array} vec - Vector to normalize
 * @returns {Float32Array} Same vector, normalized
 */
export function l2Normalize(vec) {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
        norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < vec.length; i++) {
            vec[i] /= norm;
        }
    }
    return vec;
}

/**
 * Compute the centroid (average) of multiple embeddings
 * @param {Array<number[]|Float32Array>} embeddings - Array of embedding vectors
 * @returns {Float32Array} L2-normalized centroid vector
 */
export function computeCentroid(embeddings) {
    if (embeddings.length === 0) {
        throw new Error('Cannot compute centroid of empty array');
    }

    const dim = embeddings[0].length;
    if (dim === 0 || embeddings.some(embedding => embedding.length !== dim)) {
        throw new Error('Embeddings must be non-empty and have the same dimensions');
    }
    const centroid = new Float32Array(dim);

    for (const emb of embeddings) {
        for (let i = 0; i < dim; i++) {
            centroid[i] += emb[i];
        }
    }

    for (let i = 0; i < dim; i++) {
        centroid[i] /= embeddings.length;
    }

    return l2Normalize(centroid);
}

/**
 * Score a single candidate
 * @param {number[]|Float32Array} candidateEmb - Candidate embedding
 * @param {Float32Array} centroid - Reference centroid
 * @param {Array<number[]|Float32Array>} refEmbeddings - All reference embeddings
 * @param {Object} preset - Preset configuration {wA, wB, k}
 * @returns {number} Final score (0 to 1)
 */
export function scoreCandidate(candidateEmb, centroid, refEmbeddings, preset) {
    return scoreCandidateDetails(candidateEmb, centroid, refEmbeddings, preset).score;
}

/**
 * Score one candidate and retain both components for an explainable result.
 * These values describe proximity to this tool's fixed reference collection;
 * they are not probabilities, grammar scores, or proof of correct decryption.
 * @param {number[]|Float32Array} candidateEmb
 * @param {Float32Array} centroid
 * @param {Array<number[]|Float32Array>} refEmbeddings
 * @param {{wA: number, wB: number, k: number}} preset
 * @returns {{score: number, centroidScore: number, referenceScore: number, nearestReferences: Array<{referenceIndex: number, cosineSimilarity: number, proximity: number}>}}
 */
export function scoreCandidateDetails(candidateEmb, centroid, refEmbeddings, preset) {
    const { wA, wB, k } = preset;
    if (!Number.isFinite(wA) || !Number.isFinite(wB) || Math.abs(wA + wB - 1) > 1e-9) {
        throw new Error('Preset weights must be finite and sum to 1');
    }
    if (!Number.isInteger(k) || k < 1 || refEmbeddings.length === 0) {
        throw new Error('Preset k must be a positive integer and references cannot be empty');
    }

    // A) Similarity to the centroid of this tool's reference collection
    const centroidSimilarity = cosineSimilarity(candidateEmb, centroid);

    // B) Reference proximity: average of top-k similarities
    const similarities = refEmbeddings.map((ref, referenceIndex) => ({
        referenceIndex,
        cosineSimilarity: cosineSimilarity(candidateEmb, ref)
    }));
    similarities.sort((a, b) =>
        (b.cosineSimilarity - a.cosineSimilarity) || (a.referenceIndex - b.referenceIndex)
    );
    const topK = similarities.slice(0, Math.min(k, similarities.length));
    const referenceSimilarity = topK.reduce((sum, item) => sum + item.cosineSimilarity, 0) / topK.length;

    const normalizeForDisplay = value => Math.max(0, Math.min(1, (value + 1) / 2));
    const centroidScore = normalizeForDisplay(centroidSimilarity);
    const referenceScore = normalizeForDisplay(referenceSimilarity);
    const score = Math.max(0, Math.min(1, wA * centroidScore + wB * referenceScore));
    const nearestReferences = topK.map(item => ({
        ...item,
        proximity: normalizeForDisplay(item.cosineSimilarity)
    }));

    return { score, centroidScore, referenceScore, nearestReferences };
}

/**
 * Score all candidates and return sorted results
 * @param {Array<{text: string, embedding: number[]|Float32Array, meta?: Object, rawText?: string}>} candidates - Candidates with embeddings
 * @param {Float32Array} centroid - Reference centroid
 * @param {Array<number[]|Float32Array>} refEmbeddings - All reference embeddings
 * @param {Object} preset - Preset configuration
 * @param {string[]|null} referenceTexts - Optional source text aligned to refEmbeddings
 * @returns {Array<{text: string, score: number, centroidScore: number, referenceScore: number, nearestReferences: Array, lengthBand: string, rank: number, meta?: Object, rawText?: string}>}
 */
export function rankCandidates(candidates, centroid, refEmbeddings, preset, referenceTexts = null) {
    if (referenceTexts !== null && referenceTexts.length !== refEmbeddings.length) {
        throw new Error('Reference texts and embeddings must have the same length');
    }
    const scored = candidates.map((c, originalIndex) => {
        const details = scoreCandidateDetails(c.embedding, centroid, refEmbeddings, preset);
        return {
            text: c.text,
            meta: c.meta,
            rawText: c.rawText,
            tokenCount: c.tokenCount ?? null,
            usedTokenCount: c.usedTokenCount ?? null,
            truncated: Boolean(c.truncated),
            lengthBand: getLengthBand(c.tokenCount, c.truncated),
            originalIndex,
            ...details,
            nearestReferences: details.nearestReferences.map(item => ({
                ...item,
                text: referenceTexts?.[item.referenceIndex] ?? null
            }))
        };
    });

    // Sort by score descending
    scored.sort((a, b) => (b.score - a.score) || (a.originalIndex - b.originalIndex));

    // Add rank
    return scored.map((item, index) => ({
        ...item,
        rank: index + 1
    }));
}

/**
 * Describe input size without presenting it as statistical confidence.
 * @param {number|null|undefined} tokenCount
 * @param {boolean} truncated
 * @returns {'unknown'|'short'|'medium'|'long'|'truncated'}
 */
export function getLengthBand(tokenCount, truncated = false) {
    if (truncated) return 'truncated';
    if (!Number.isFinite(tokenCount) || tokenCount < 0) return 'unknown';
    if (tokenCount < 32) return 'short';
    if (tokenCount <= 128) return 'medium';
    return 'long';
}
