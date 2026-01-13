/**
 * Scoring algorithm for semantic candidate ranking
 */

/**
 * Preset configurations
 * wA = weight for naturalness (centroid similarity)
 * wB = weight for reference proximity (top-k average)
 * k = number of top references to average
 */
export const PRESETS = {
    balanced: { wA: 0.5, wB: 0.5, k: 5, label: 'Balanced' },
    naturalness: { wA: 0.7, wB: 0.3, k: 5, label: 'Naturalness' },
    reference: { wA: 0.3, wB: 0.7, k: 5, label: 'Reference' },
    strict: { wA: 0.5, wB: 0.5, k: 3, label: 'Strict' },
    broad: { wA: 0.5, wB: 0.5, k: 7, label: 'Broad' }
};

/**
 * Compute cosine similarity between two vectors
 * Assumes vectors are already L2 normalized
 * @param {number[]|Float32Array} a - First vector
 * @param {number[]|Float32Array} b - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(a, b) {
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
    const { wA, wB, k } = preset;

    // A) Naturalness: similarity to centroid
    const naturalnessScore = cosineSimilarity(candidateEmb, centroid);

    // B) Reference proximity: average of top-k similarities
    const similarities = refEmbeddings.map(ref => cosineSimilarity(candidateEmb, ref));
    similarities.sort((a, b) => b - a); // Descending order
    const topK = similarities.slice(0, Math.min(k, similarities.length));
    const proximityScore = topK.reduce((sum, s) => sum + s, 0) / topK.length;

    // Final score = weighted combination
    // Normalize from [-1, 1] to [0, 1] range for display
    const rawScore = wA * naturalnessScore + wB * proximityScore;
    return (rawScore + 1) / 2;
}

/**
 * Score all candidates and return sorted results
 * @param {Array<{text: string, embedding: number[]|Float32Array, meta?: Object, rawText?: string}>} candidates - Candidates with embeddings
 * @param {Float32Array} centroid - Reference centroid
 * @param {Array<number[]|Float32Array>} refEmbeddings - All reference embeddings
 * @param {Object} preset - Preset configuration
 * @returns {Array<{text: string, score: number, confidence: string, rank: number, meta?: Object, rawText?: string}>}
 */
export function rankCandidates(candidates, centroid, refEmbeddings, preset) {
    const scored = candidates.map(c => ({
        text: c.text,
        meta: c.meta,       // Preserve metadata for UI display
        rawText: c.rawText, // Preserve original block for copy
        score: scoreCandidate(c.embedding, centroid, refEmbeddings, preset),
        confidence: getConfidence(c.text)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Add rank
    return scored.map((item, index) => ({
        ...item,
        rank: index + 1
    }));
}

/**
 * Get confidence level based on text length
 * @param {string} text - Candidate text
 * @returns {'low'|'medium'|'high'} Confidence level
 */
export function getConfidence(text) {
    const len = text.length;
    if (len < 40) return 'low';
    if (len <= 120) return 'medium';
    return 'high';
}
