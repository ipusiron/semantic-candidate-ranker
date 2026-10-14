/**
 * Main application controller
 * Orchestrates the 5-stage processing pipeline
 */

import { parseCandidates, validateCandidates } from './normalizer.js';
import { PRESETS, rankCandidates } from './scorer.js';
import {
    loadModel,
    embedTexts,
    getOrComputeReferenceEmbeddings,
    inspectTokenUsage,
    MODEL_ID,
    MODEL_WORDPIECE_LIMIT,
    TRANSFORMERS_VERSION
} from './embedder.js';
import {
    getReferenceSentences,
    REFERENCE_SET_VERSION,
    REFERENCE_SET_FINGERPRINT
} from './reference-sentences.js';
import {
    initUI,
    getInputValue,
    getSelectedPreset,
    setButtonHandlers,
    showProcessing,
    showIdle,
    updateProgress,
    showSlowWarning,
    showMessage,
    renderResults
} from './ui.js';

// Application state
const state = {
    isProcessing: false,
    abortController: null,
    slowWarningTimeout: null
};

// Timing constants
const SLOW_THRESHOLD_MS = 20000;

/**
 * Initialize the application
 */
function init() {
    initUI();
    setButtonHandlers(handleRun, handleCancel);
}

/**
 * Handle run button click
 */
async function handleRun() {
    if (state.isProcessing) return;

    const input = getInputValue();
    const requestedPresetName = getSelectedPreset();
    const presetName = PRESETS[requestedPresetName] ? requestedPresetName : 'balanced';
    const preset = PRESETS[presetName];
    // Parse and validate candidates
    // parseCandidates returns { meta, rawText, evalText } objects
    const parsedCandidates = parseCandidates(input);
    const validation = validateCandidates(parsedCandidates, input);

    if (!validation.valid) {
        showMessage({ key: 'errorEmpty' }, 'error');
        return;
    }

    const warningKeys = validation.warnings.map(warning => ({
        key: warning.code,
        params: warning.params || {}
    }));

    // Start processing
    state.isProcessing = true;
    state.abortController = new AbortController();
    const signal = state.abortController.signal;

    showProcessing();

    // Set slow warning timeout
    state.slowWarningTimeout = setTimeout(() => {
        if (state.isProcessing) {
            showSlowWarning();
        }
    }, SLOW_THRESHOLD_MS);

    try {
        // Stage 1: Load model
        updateProgress(1);
        await loadModel(signal);

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        // Stage 2: Prepare candidates
        updateProgress(2);
        await new Promise(r => setTimeout(r, 100)); // Brief pause for UI update

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const evalTexts = parsedCandidates.map(candidate => candidate.evalText);
        const tokenUsage = await inspectTokenUsage(evalTexts);
        if (tokenUsage.every(item => item.tokenCount < 32)) {
            warningKeys.push({ key: 'warningShort', params: {} });
        }
        const truncatedCount = tokenUsage.filter(item => item.truncated).length;
        if (truncatedCount > 0) {
            warningKeys.push({
                key: 'warningTruncated',
                params: { count: truncatedCount, limit: MODEL_WORDPIECE_LIMIT }
            });
        }

        // Stage 3: Prepare references (always English for plaintext ranking)
        updateProgress(3);
        const referenceSentences = getReferenceSentences('en');
        const { embeddings: refEmbeddings, centroid } = await getOrComputeReferenceEmbeddings(
            referenceSentences,
            signal,
            null
        );

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        // Stage 4: Compute similarities (embed candidates)
        updateProgress(4);
        const candidateEmbeddings = await embedTexts(
            evalTexts,
            signal,
            null
        );

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        // Combine candidates with embeddings (include meta and rawText for UI)
        const candidatesWithEmbeddings = parsedCandidates.map((parsed, i) => ({
            text: parsed.evalText,  // for scoring
            meta: parsed.meta,      // for UI display
            rawText: parsed.rawText, // for copy
            embedding: candidateEmbeddings[i],
            ...tokenUsage[i]
        }));

        // Stage 5: Rank results
        updateProgress(5);
        const results = rankCandidates(
            candidatesWithEmbeddings,
            centroid,
            refEmbeddings,
            preset,
            referenceSentences
        );

        // Display results
        renderResults(results, {
            modelId: MODEL_ID,
            transformersVersion: TRANSFORMERS_VERSION,
            tokenLimit: MODEL_WORDPIECE_LIMIT,
            referenceCount: referenceSentences.length,
            referenceVersion: REFERENCE_SET_VERSION,
            referenceFingerprint: REFERENCE_SET_FINGERPRINT,
            presetName,
            topK: preset.k,
            truncatedCount
        });

        if (warningKeys.length > 0) {
            showMessage(warningKeys, 'warning');
        }

    } catch (error) {
        handleError(error);
    } finally {
        cleanup();
    }
}

/**
 * Handle cancel button click
 */
function handleCancel() {
    if (state.abortController) {
        state.abortController.abort();
    }
}

/**
 * Handle errors during processing
 * @param {Error} error
 */
function handleError(error) {
    console.error('Processing error:', error);
    const message = String(error?.message || '').toLowerCase();

    if (error.name === 'AbortError') {
        showMessage({ key: 'infoCancelled' }, 'info');
    } else if (message.includes('network') || message.includes('fetch')) {
        showMessage({ key: 'errorNetwork' }, 'error');
    } else {
        showMessage({ key: 'errorProcessing' }, 'error');
    }
}

/**
 * Cleanup after processing
 */
function cleanup() {
    state.isProcessing = false;
    state.abortController = null;

    if (state.slowWarningTimeout) {
        clearTimeout(state.slowWarningTimeout);
        state.slowWarningTimeout = null;
    }

    showIdle();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
