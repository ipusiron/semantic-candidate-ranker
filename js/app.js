/**
 * Main application controller
 * Orchestrates the 5-stage processing pipeline
 */

import { parseCandidates, validateCandidates } from './normalizer.js';
import { PRESETS, rankCandidates } from './scorer.js';
import { loadModel, embedTexts, getOrComputeReferenceEmbeddings, clearCache } from './embedder.js';
import { getReferenceSentences } from './reference-sentences.js';
import { t, getCurrentLang } from './i18n.js';
import {
    initUI,
    getInputValue,
    getSelectedPreset,
    setButtonHandlers,
    setLanguageChangeCallback,
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
    setLanguageChangeCallback(handleLanguageChange);
}

/**
 * Handle language change
 * @param {string} newLang - New language code
 */
function handleLanguageChange(newLang) {
    // Clear reference embeddings cache when language changes
    clearCache();
}

/**
 * Handle run button click
 */
async function handleRun() {
    if (state.isProcessing) return;

    const input = getInputValue();
    const presetName = getSelectedPreset();
    const preset = PRESETS[presetName];
    const currentLang = getCurrentLang();

    // Parse and validate candidates
    // parseCandidates returns { meta, rawText, evalText } objects
    const parsedCandidates = parseCandidates(input);
    const validation = validateCandidates(parsedCandidates, input);

    if (!validation.valid) {
        showMessage(t('errorEmpty'), 'error');
        return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
        // Translate warnings
        const translatedWarnings = validation.warnings.map(warning => {
            if (warning.includes('candidates')) {
                const count = warning.match(/\d+/)?.[0] || '200';
                return t('errorTooMany', { count });
            }
            if (warning.includes('short')) {
                return t('warningShort');
            }
            return warning;
        });
        showMessage(translatedWarnings.join(' '), 'warning');
    }

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
        // Extract evalText for embedding (metadata excluded)
        const evalTexts = parsedCandidates.map(c => c.evalText);
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
            embedding: candidateEmbeddings[i]
        }));

        // Stage 5: Rank results
        updateProgress(5);
        const results = rankCandidates(candidatesWithEmbeddings, centroid, refEmbeddings, preset);

        // Display results
        renderResults(results);

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

    if (error.name === 'AbortError') {
        showMessage(t('infoCancelled'), 'info');
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        showMessage(t('errorNetwork'), 'error');
    } else {
        showMessage(t('errorProcessing'), 'error');
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
