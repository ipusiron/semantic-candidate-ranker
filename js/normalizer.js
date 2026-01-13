/**
 * Text normalization utilities for candidate processing
 */

/**
 * Generic metadata line pattern
 * Matches any line starting with "key=value" format (after trimming leading spaces)
 * - Key: one or more word characters (letters, digits, underscore)
 * - Value: everything after the first "="
 * Examples: shift=13, branch=ABC, mapping=XYZ, score=0.95, custom_field=value
 */
const METADATA_PATTERN = /^(\w+)=(.*)$/;

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
 * Parse a single candidate block into structured format
 * Metadata lines (key=value format at block start) are extracted and excluded from evaluation.
 * Only consecutive key=value lines at the beginning of the block are treated as metadata.
 * @param {string} blockText - Raw block text
 * @returns {{ meta: Object, rawText: string, evalText: string } | null}
 */
export function parseCandidateBlock(blockText) {
    if (!blockText || typeof blockText !== 'string') {
        return null;
    }

    const lines = blockText.split(/\r?\n/);
    const meta = {};
    const contentLines = [];
    let metadataEnded = false;

    for (const line of lines) {
        const trimmedLine = line.trimStart();

        // Only check for metadata at the start of the block (consecutive lines)
        if (!metadataEnded) {
            const match = trimmedLine.match(METADATA_PATTERN);
            if (match) {
                const key = match[1].toLowerCase(); // Normalize key to lowercase
                const value = match[2].trim();
                // Only store first occurrence of each key
                if (!(key in meta)) {
                    meta[key] = value;
                }
                continue; // Skip to next line, don't add to contentLines
            } else {
                // Non-metadata line encountered, metadata section ended
                metadataEnded = true;
            }
        }

        // Add to content lines (either metadata ended or was never started)
        contentLines.push(line);
    }

    // rawText is the original block text (for copy/traceability)
    const rawText = blockText;

    // evalText is normalized text from non-metadata lines only
    const evalText = normalizeText(contentLines.join('\n'));

    // If evalText is empty (metadata-only block), return null to discard
    if (evalText.length === 0) {
        return null;
    }

    return { meta, rawText, evalText };
}

/**
 * Parse input text into individual candidates
 * Candidates are separated by blank lines
 * Metadata lines (shift=, branch=) are preserved for display but excluded from evaluation.
 * @param {string} input - Raw input text
 * @returns {Array<{ meta: Object, rawText: string, evalText: string }>} Array of parsed candidates (max 200)
 */
export function parseCandidates(input) {
    if (!input || typeof input !== 'string') {
        return [];
    }

    // Split by one or more blank lines
    const blocks = input.split(/\n\s*\n/);

    return blocks
        .map(block => parseCandidateBlock(block))
        .filter(parsed => parsed !== null)
        .slice(0, 200); // Max 200 candidates per spec
}

/**
 * Validate candidates and return warnings if any
 * @param {Array<{ meta: Object, rawText: string, evalText: string }>} candidates - Array of parsed candidates
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

    // Check for very short candidates (using evalText for length check)
    const shortCandidates = candidates.filter(c => c.evalText.length < 40);
    if (shortCandidates.length > 0 && shortCandidates.length === candidates.length) {
        warnings.push('All candidates are short (< 40 characters). Results may have lower confidence.');
    }

    return { valid: true, warnings };
}
