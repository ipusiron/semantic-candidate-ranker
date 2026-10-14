/**
 * Main application controller
 * Orchestrates the 5-stage processing pipeline
 */

import { normalizeText, parseCandidates, validateCandidates } from './normalizer.js';
import { PRESETS, rankCandidates } from './scorer.js';
import { EVALUATION_CASES, EVALUATION_SET_VERSION, EVALUATION_SET_FINGERPRINT } from './evaluation-cases.js';
import { evaluatePreparedCases, summarizeGroups, compareCaseResults } from './evaluator.js';
import { buildPerturbedText } from './perturbations.js';
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
    renderResults,
    configureEvaluation,
    getPerturbationRequest,
    showEvaluationMessage,
    renderEvaluationResults,
    renderPerturbationResults
} from './ui.js';

// Application state
const state = {
    isProcessing: false,
    abortController: null,
    slowWarningTimeout: null,
    activeMode: null,
    evaluationCache: null
};

// Timing constants
const SLOW_THRESHOLD_MS = 20000;

/**
 * Initialize the application
 */
function init() {
    initUI();
    configureEvaluation(EVALUATION_CASES, {
        version: EVALUATION_SET_VERSION,
        fingerprint: EVALUATION_SET_FINGERPRINT,
        caseCount: EVALUATION_CASES.length,
        candidateCount: EVALUATION_CASES.reduce((sum, item) => sum + item.candidates.length, 0)
    }, buildPerturbedText);
    setButtonHandlers(
        handleRun,
        handleCancel,
        handleEvaluationRun,
        handleCancel,
        handlePerturbationRun
    );
}

function beginProcessing(mode) {
    state.isProcessing = true;
    state.activeMode = mode;
    state.abortController = new AbortController();
    showProcessing(mode);
    state.slowWarningTimeout = setTimeout(() => {
        if (state.isProcessing) showSlowWarning(mode);
    }, SLOW_THRESHOLD_MS);
    return state.abortController.signal;
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
    const signal = beginProcessing('compare');

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
        handleError(error, 'compare');
    } finally {
        cleanup();
    }
}

async function prepareEvaluation(signal) {
    await loadModel(signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    updateProgress(2, 'evaluation');

    const flattened = EVALUATION_CASES.flatMap(caseDefinition =>
        caseDefinition.candidates.map(candidate => candidate.text)
    );
    const tokenUsage = await inspectTokenUsage(flattened);
    updateProgress(3, 'evaluation');
    const referenceSentences = getReferenceSentences('en');
    const { embeddings: referenceEmbeddings, centroid } = await getOrComputeReferenceEmbeddings(
        referenceSentences,
        signal,
        null
    );
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    updateProgress(4, 'evaluation');
    const embeddings = await embedTexts(flattened, signal, null);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    let offset = 0;
    const preparedByCase = EVALUATION_CASES.map(caseDefinition =>
        caseDefinition.candidates.map(candidate => {
            const index = offset++;
            return {
                text: candidate.text,
                rawText: candidate.text,
                meta: { setting: candidate.setting },
                embedding: embeddings[index],
                ...tokenUsage[index]
            };
        })
    );
    return { referenceSentences, referenceEmbeddings, centroid, preparedByCase };
}

function renderCachedEvaluation(cache) {
    const balancedCases = cache.presetResults.balanced.cases;
    renderEvaluationResults(cache.presetResults, {
        cases: EVALUATION_CASES,
        familyGroups: summarizeGroups(balancedCases, 'family'),
        lengthGroups: summarizeGroups(balancedCases, 'lengthGroup')
    });
}

async function handleEvaluationRun() {
    if (state.isProcessing) return;
    const signal = beginProcessing('evaluation');
    try {
        updateProgress(1, 'evaluation');
        if (!state.evaluationCache) {
            const prepared = await prepareEvaluation(signal);
            updateProgress(5, 'evaluation');
            const presetResults = evaluatePreparedCases(
                EVALUATION_CASES,
                prepared.preparedByCase,
                prepared.centroid,
                prepared.referenceEmbeddings,
                prepared.referenceSentences,
                PRESETS
            );
            state.evaluationCache = { ...prepared, presetResults };
        }
        renderCachedEvaluation(state.evaluationCache);
    } catch (error) {
        handleError(error, 'evaluation');
    } finally {
        cleanup();
    }
}

async function handlePerturbationRun() {
    if (state.isProcessing || !state.evaluationCache) return;
    const request = getPerturbationRequest();
    const normalizedText = normalizeText(request.text);
    if (!normalizedText) {
        showEvaluationMessage({ key: 'perturbationEmptyError' }, 'error');
        return;
    }
    const caseIndex = EVALUATION_CASES.findIndex(item => item.id === request.caseId);
    if (caseIndex < 0) return;
    const caseDefinition = EVALUATION_CASES[caseIndex];
    const correctIndex = caseDefinition.candidates.findIndex(
        candidate => candidate.id === caseDefinition.correctCandidateId
    );
    const signal = beginProcessing('evaluation');
    try {
        updateProgress(1, 'evaluation');
        await loadModel(signal);
        updateProgress(2, 'evaluation');
        const [afterUsage] = await inspectTokenUsage([normalizedText]);
        updateProgress(3, 'evaluation');
        const [embedding] = await embedTexts([normalizedText], signal, null);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        updateProgress(4, 'evaluation');

        const basePrepared = state.evaluationCache.preparedByCase[caseIndex];
        const changedPrepared = basePrepared.map((candidate, index) => index === correctIndex
            ? { ...candidate, text: normalizedText, rawText: request.text, embedding, ...afterUsage }
            : candidate
        );
        const afterPresetResults = evaluatePreparedCases(
            [caseDefinition],
            [changedPrepared],
            state.evaluationCache.centroid,
            state.evaluationCache.referenceEmbeddings,
            state.evaluationCache.referenceSentences,
            PRESETS
        );
        updateProgress(5, 'evaluation');

        const comparisons = {};
        for (const presetName of Object.keys(PRESETS)) {
            const before = state.evaluationCache.presetResults[presetName].cases[caseIndex];
            const after = afterPresetResults[presetName].cases[0];
            comparisons[presetName] = {
                before,
                after,
                delta: compareCaseResults(before, after)
            };
        }
        renderCachedEvaluation(state.evaluationCache);
        renderPerturbationResults({
            beforeText: caseDefinition.sourcePlaintext,
            afterText: request.text,
            beforeUsage: basePrepared[correctIndex],
            afterUsage,
            tokenLimit: MODEL_WORDPIECE_LIMIT,
            comparisons
        });
    } catch (error) {
        handleError(error, 'evaluation');
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
function handleError(error, mode = state.activeMode || 'compare') {
    console.error('Processing error:', error);
    const message = String(error?.message || '').toLowerCase();
    const show = mode === 'evaluation' ? showEvaluationMessage : showMessage;

    if (error.name === 'AbortError') {
        show({ key: mode === 'evaluation' ? 'evaluationCancelled' : 'infoCancelled' }, 'info');
    } else if (message.includes('network') || message.includes('fetch')) {
        show({ key: 'errorNetwork' }, 'error');
    } else {
        show({ key: mode === 'evaluation' ? 'evaluationProcessingError' : 'errorProcessing' }, 'error');
    }
}

/**
 * Cleanup after processing
 */
function cleanup() {
    state.isProcessing = false;
    state.abortController = null;
    state.activeMode = null;

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
