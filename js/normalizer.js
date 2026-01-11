/**
 * Text normalization utilities for candidate processing
 */

/**
 * Normalize text according to spec:
 * - Lowercase
 * - Line breaks -> spaces
 * - Collapse multiple spaces
 * - Trim leading/trailing spaces
 * - Apostrophes preserved
 * @param {string} text - Input text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parse input text into individual candidates
 * Candidates are separated by blank lines
 * @param {string} input - Raw input text
 * @returns {string[]} Array of normalized candidates (max 200)
 */
export function parseCandidates(input) {
    if (!input || typeof input !== 'string') {
        return [];
    }

    // Split by one or more blank lines
    const blocks = input.split(/\n\s*\n/);

    return blocks
        .map(block => normalizeText(block))
        .filter(block => block.length > 0)
        .slice(0, 200); // Max 200 candidates per spec
}

/**
 * Validate candidates and return warnings if any
 * @param {string[]} candidates - Array of candidates
 * @param {string} rawInput - Original input text
 * @returns {{valid: boolean, warnings: string[]}}
 */
export function validateCandidates(candidates, rawInput) {
    const warnings = [];

    if (candidates.length === 0) {
        return { valid: false, warnings: ['Please enter at least one candidate.'] };
    }

    // Check for truncation
    const rawBlocks = rawInput.split(/\n\s*\n/).filter(b => b.trim().length > 0);
    if (rawBlocks.length > 200) {
        warnings.push(`Input contains ${rawBlocks.length} candidates. Only the first 200 will be processed.`);
    }

    // Check for very short candidates
    const shortCandidates = candidates.filter(c => c.length < 40);
    if (shortCandidates.length > 0 && shortCandidates.length === candidates.length) {
        warnings.push('All candidates are short (< 40 characters). Results may have lower confidence.');
    }

    return { valid: true, warnings };
}
