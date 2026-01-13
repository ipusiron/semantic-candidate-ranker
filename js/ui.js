/**
 * UI module for DOM manipulation and rendering
 */

import { t, getCurrentLang, setLang, initLang } from './i18n.js';

// DOM element references
const elements = {
    helpBtn: null,
    langToggle: null,
    title: null,
    subtitle: null,
    candidatesLabel: null,
    candidateInput: null,
    presetLabel: null,
    presetSelect: null,
    runBtn: null,
    cancelBtn: null,
    messages: null,
    progress: null,
    slowWarning: null,
    results: null,
    topResultsTitle: null,
    topResults: null,
    allResultsTitle: null,
    allResults: null,
    offlineIndicator: null,
    githubText: null,
    githubLink: null,
    helpModal: null,
    modalClose: null,
    modalBackdrop: null,
    helpTitle: null,
    helpBody: null
};

// Callback for language change
let onLanguageChange = null;

/**
 * Initialize UI elements
 */
export function initUI() {
    initLang();

    elements.helpBtn = document.getElementById('helpBtn');
    elements.langToggle = document.getElementById('langToggle');
    elements.title = document.getElementById('title');
    elements.subtitle = document.getElementById('subtitle');
    elements.candidatesLabel = document.getElementById('candidatesLabel');
    elements.candidateInput = document.getElementById('candidateInput');
    elements.presetLabel = document.getElementById('presetLabel');
    elements.presetSelect = document.getElementById('presetSelect');
    elements.runBtn = document.getElementById('runBtn');
    elements.cancelBtn = document.getElementById('cancelBtn');
    elements.messages = document.getElementById('messages');
    elements.progress = document.getElementById('progress');
    elements.slowWarning = document.getElementById('slowWarning');
    elements.results = document.getElementById('results');
    elements.topResultsTitle = document.getElementById('topResultsTitle');
    elements.topResults = document.getElementById('topResults');
    elements.allResultsTitle = document.getElementById('allResultsTitle');
    elements.allResults = document.getElementById('allResults');
    elements.offlineIndicator = document.getElementById('offlineIndicator');
    elements.githubText = document.getElementById('githubText');
    elements.githubLink = document.getElementById('githubLink');
    elements.helpModal = document.getElementById('helpModal');
    elements.modalClose = document.getElementById('modalClose');
    elements.modalBackdrop = elements.helpModal?.querySelector('.modal-backdrop');
    elements.helpTitle = document.getElementById('helpTitle');
    elements.helpBody = document.getElementById('helpBody');

    // Setup help modal
    elements.helpBtn?.addEventListener('click', openHelpModal);
    elements.modalClose?.addEventListener('click', closeHelpModal);
    elements.modalBackdrop?.addEventListener('click', closeHelpModal);
    document.addEventListener('keydown', handleEscapeKey);

    // Setup language toggle
    elements.langToggle?.addEventListener('click', toggleLanguage);

    // Setup offline indicator
    updateOfflineIndicator();
    window.addEventListener('online', updateOfflineIndicator);
    window.addEventListener('offline', updateOfflineIndicator);

    // Apply initial language
    updateUILanguage();
}

/**
 * Set callback for language change
 * @param {Function} callback
 */
export function setLanguageChangeCallback(callback) {
    onLanguageChange = callback;
}

/**
 * Toggle language between Japanese and English
 */
function toggleLanguage() {
    const currentLang = getCurrentLang();
    const newLang = currentLang === 'ja' ? 'en' : 'ja';
    setLang(newLang);
    updateUILanguage();

    // Notify callback (to clear reference cache)
    if (onLanguageChange) {
        onLanguageChange(newLang);
    }
}

/**
 * Open help modal
 */
function openHelpModal() {
    if (elements.helpModal) {
        updateHelpContent();
        elements.helpModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close help modal
 */
function closeHelpModal() {
    if (elements.helpModal) {
        elements.helpModal.hidden = true;
        document.body.style.overflow = '';
    }
}

/**
 * Handle escape key to close modal
 * @param {KeyboardEvent} e
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape' && elements.helpModal && !elements.helpModal.hidden) {
        closeHelpModal();
    }
}

/**
 * Update help modal content based on language
 */
function updateHelpContent() {
    if (!elements.helpTitle || !elements.helpBody) return;

    elements.helpTitle.textContent = t('helpTitle');

    elements.helpBody.innerHTML = `
        <h3>${t('helpOverview')}</h3>
        <p>${t('helpOverviewText')}</p>

        <h3>${t('helpUsage')}</h3>
        <ol>
            <li>${t('helpUsageStep1')}</li>
            <li>${t('helpUsageStep2')}</li>
            <li>${t('helpUsageStep3')}</li>
            <li>${t('helpUsageStep4')}</li>
        </ol>

        <h3>${t('helpPresets')}</h3>
        <ul>
            <li><strong>${t('presetBalanced')}</strong>: ${t('helpPresetBalanced')}</li>
            <li><strong>${t('presetNaturalness')}</strong>: ${t('helpPresetNaturalness')}</li>
            <li><strong>${t('presetReference')}</strong>: ${t('helpPresetReference')}</li>
            <li><strong>${t('presetStrict')}</strong>: ${t('helpPresetStrict')}</li>
            <li><strong>${t('presetBroad')}</strong>: ${t('helpPresetBroad')}</li>
        </ul>

        <h3>${t('helpEvaluation')}</h3>
        <ul>
            <li><strong>${t('evalExcellent').split(' - ')[0]}</strong>: ${t('helpEvalExcellent')}</li>
            <li><strong>${t('evalGood').split(' - ')[0]}</strong>: ${t('helpEvalGood')}</li>
            <li><strong>${t('evalFair').split(' - ')[0]}</strong>: ${t('helpEvalFair')}</li>
            <li><strong>${t('evalWeak').split(' - ')[0]}</strong>: ${t('helpEvalWeak')}</li>
            <li><strong>${t('evalPoor').split(' - ')[0]}</strong>: ${t('helpEvalPoor')}</li>
        </ul>

        <h3>${t('helpLimitations')}</h3>
        <ul>
            <li>${t('helpLimitCandidates')}</li>
            <li>${t('helpLimitModel')}</li>
        </ul>
    `;
}

/**
 * Update all UI text for current language
 */
function updateUILanguage() {
    const lang = getCurrentLang();

    // Update html lang attribute
    document.documentElement.lang = lang;

    // Update page title
    document.title = t('title');

    // Update header
    if (elements.title) elements.title.textContent = t('title');
    if (elements.subtitle) elements.subtitle.textContent = t('subtitle');
    if (elements.langToggle) elements.langToggle.textContent = t('langToggle');

    // Update input section
    if (elements.candidatesLabel) elements.candidatesLabel.textContent = t('candidatesLabel');
    if (elements.candidateInput) elements.candidateInput.placeholder = t('placeholder');
    if (elements.presetLabel) elements.presetLabel.textContent = t('presetLabel');

    // Update preset options
    if (elements.presetSelect) {
        const options = elements.presetSelect.options;
        options[0].textContent = t('presetBalanced');
        options[1].textContent = t('presetNaturalness');
        options[2].textContent = t('presetReference');
        options[3].textContent = t('presetStrict');
        options[4].textContent = t('presetBroad');
    }

    // Update buttons
    if (elements.runBtn) elements.runBtn.textContent = t('runButton');
    if (elements.cancelBtn) elements.cancelBtn.textContent = t('cancelButton');

    // Update progress steps
    const stepLabels = elements.progress?.querySelectorAll('.step-label');
    if (stepLabels) {
        stepLabels[0].textContent = t('progressStep1');
        stepLabels[1].textContent = t('progressStep2');
        stepLabels[2].textContent = t('progressStep3');
        stepLabels[3].textContent = t('progressStep4');
        stepLabels[4].textContent = t('progressStep5');
    }

    // Update slow warning
    if (elements.slowWarning) elements.slowWarning.textContent = t('slowWarning');

    // Update results titles
    if (elements.topResultsTitle) elements.topResultsTitle.textContent = t('topResultsTitle');
    if (elements.allResultsTitle) elements.allResultsTitle.textContent = t('allResultsTitle');

    // Update footer
    if (elements.githubText) elements.githubText.textContent = t('githubText');
    if (elements.offlineIndicator) elements.offlineIndicator.textContent = t('offline');
}

/**
 * Get input value
 * @returns {string}
 */
export function getInputValue() {
    return elements.candidateInput?.value || '';
}

/**
 * Get selected preset
 * @returns {string}
 */
export function getSelectedPreset() {
    return elements.presetSelect?.value || 'balanced';
}

/**
 * Set button handlers
 * @param {Function} onRun - Run button handler
 * @param {Function} onCancel - Cancel button handler
 */
export function setButtonHandlers(onRun, onCancel) {
    elements.runBtn?.addEventListener('click', onRun);
    elements.cancelBtn?.addEventListener('click', onCancel);
}

/**
 * Show processing state
 */
export function showProcessing() {
    elements.runBtn.hidden = true;
    elements.cancelBtn.hidden = false;
    elements.candidateInput.disabled = true;
    elements.presetSelect.disabled = true;
    elements.langToggle.disabled = true;
    elements.progress.hidden = false;
    elements.results.hidden = true;
    hideMessage();
    resetProgressSteps();
}

/**
 * Show idle state
 */
export function showIdle() {
    elements.runBtn.hidden = false;
    elements.cancelBtn.hidden = true;
    elements.candidateInput.disabled = false;
    elements.presetSelect.disabled = false;
    elements.langToggle.disabled = false;
    elements.progress.hidden = true;
    elements.slowWarning.hidden = true;
}

/**
 * Update progress step
 * @param {number} step - Current step (1-5)
 */
export function updateProgress(step) {
    const steps = elements.progress.querySelectorAll('.progress-step');
    steps.forEach((stepEl, index) => {
        const stepNum = index + 1;
        stepEl.classList.remove('active', 'completed');
        if (stepNum < step) {
            stepEl.classList.add('completed');
        } else if (stepNum === step) {
            stepEl.classList.add('active');
        }
    });
}

/**
 * Reset all progress steps
 */
function resetProgressSteps() {
    const steps = elements.progress.querySelectorAll('.progress-step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
}

/**
 * Show slow processing warning
 */
export function showSlowWarning() {
    elements.slowWarning.hidden = false;
}

/**
 * Show message
 * @param {string} text - Message text
 * @param {'info'|'warning'|'error'} type - Message type
 */
export function showMessage(text, type = 'info') {
    elements.messages.textContent = text;
    elements.messages.className = `messages ${type}`;
    elements.messages.hidden = false;
}

/**
 * Hide message
 */
export function hideMessage() {
    elements.messages.hidden = true;
}

/**
 * Update offline indicator
 */
function updateOfflineIndicator() {
    if (elements.offlineIndicator) {
        elements.offlineIndicator.hidden = navigator.onLine;
    }
}

/**
 * Get evaluation comment based on score
 * @param {number} score - Score value (0-1)
 * @returns {{text: string, class: string}}
 */
function getEvaluationComment(score) {
    if (score >= 0.85) {
        return { text: t('evalExcellent'), class: 'eval-excellent' };
    } else if (score >= 0.75) {
        return { text: t('evalGood'), class: 'eval-good' };
    } else if (score >= 0.65) {
        return { text: t('evalFair'), class: 'eval-fair' };
    } else if (score >= 0.55) {
        return { text: t('evalWeak'), class: 'eval-weak' };
    } else {
        return { text: t('evalPoor'), class: 'eval-poor' };
    }
}

/**
 * Get confidence label
 * @param {string} confidence - 'high', 'medium', or 'low'
 * @returns {string}
 */
function getConfidenceLabel(confidence) {
    switch (confidence) {
        case 'high': return t('confidenceHigh');
        case 'medium': return t('confidenceMedium');
        case 'low': return t('confidenceLow');
        default: return confidence;
    }
}

/**
 * Render results
 * @param {Array<{text: string, score: number, confidence: string, rank: number}>} results
 */
export function renderResults(results) {
    if (!results || results.length === 0) {
        elements.results.hidden = true;
        return;
    }

    // Find max score for relative bar width
    const maxScore = Math.max(...results.map(r => r.score));

    // Render top 3
    const top3 = results.slice(0, 3);
    elements.topResults.innerHTML = top3.map(result => createTopResultCard(result)).join('');

    // Render all results (skip top 3)
    const rest = results.slice(3);
    elements.allResults.innerHTML = rest.map(result => createResultItem(result, maxScore)).join('');

    // Add event listeners for copy and toggle buttons
    setupResultInteractions();

    elements.results.hidden = false;
}

/**
 * Known metadata keys with specific styling
 */
const KNOWN_META_KEYS = ['shift', 'branch', 'mapping'];

/**
 * Build metadata labels HTML from meta object
 * Supports any key=value metadata, with special styling for known keys
 * @param {Object} meta - Metadata object with arbitrary keys
 * @returns {string} HTML string of metadata labels
 */
function buildMetaLabels(meta) {
    if (!meta || Object.keys(meta).length === 0) return '';

    const labels = [];
    for (const [key, value] of Object.entries(meta)) {
        // Add specific class for known keys, generic class for others
        const keyClass = KNOWN_META_KEYS.includes(key) ? `meta-${key}` : '';
        labels.push(`<span class="meta-label ${keyClass}">${escapeHtml(key)}=${escapeHtml(value)}</span>`);
    }
    return labels.length > 0 ? `<div class="meta-labels">${labels.join('')}</div>` : '';
}

/**
 * Create HTML for a top result card
 * @param {Object} result
 * @returns {string}
 */
function createTopResultCard(result) {
    const confidenceClass = `confidence-${result.confidence}`;
    const confidenceLabel = getConfidenceLabel(result.confidence);
    const evaluation = getEvaluationComment(result.score);
    const metaLabels = buildMetaLabels(result.meta);
    // Use rawText for copy (includes metadata), fallback to text
    const copyText = result.rawText || result.text;

    return `
        <div class="result-card rank-${result.rank}">
            <div class="rank-badge">${result.rank}</div>
            ${metaLabels}
            <div class="candidate-text">${escapeHtml(result.text)}</div>
            <div class="evaluation-comment ${evaluation.class}">${evaluation.text}</div>
            <div class="score-info">
                <span class="score">${t('score')}: ${result.score.toFixed(3)}</span>
                <span class="confidence-badge ${confidenceClass}">${confidenceLabel}</span>
            </div>
            <button class="copy-btn" data-text="${escapeAttr(copyText)}">${t('copyButton')}</button>
        </div>
    `;
}

/**
 * Create HTML for a result list item
 * @param {Object} result
 * @param {number} maxScore
 * @returns {string}
 */
function createResultItem(result, maxScore) {
    const barWidth = Math.round((result.score / maxScore) * 100);
    const confidenceClass = `confidence-${result.confidence}`;
    const confidenceLabel = getConfidenceLabel(result.confidence);
    const metaLabels = buildMetaLabels(result.meta);
    // Use rawText for copy (includes metadata), fallback to text
    const copyText = result.rawText || result.text;

    return `
        <div class="result-item">
            <div class="result-rank">${result.rank}</div>
            <div class="result-content">
                ${metaLabels}
                <div class="result-preview" data-full-text="${escapeAttr(result.text)}" data-copy-text="${escapeAttr(copyText)}">${escapeHtml(truncateText(result.text, 60))}</div>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${barWidth}%"></div>
                </div>
            </div>
            <span class="confidence-badge ${confidenceClass}">${confidenceLabel}</span>
            <button class="toggle-btn">${t('showButton')}</button>
        </div>
    `;
}

/**
 * Setup event listeners for result interactions
 */
function setupResultInteractions() {
    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const text = e.target.dataset.text;
            await copyToClipboard(text);
            e.target.textContent = t('copiedButton');
            e.target.classList.add('copied');
            setTimeout(() => {
                e.target.textContent = t('copyButton');
                e.target.classList.remove('copied');
            }, 2000);
        });
    });

    // Toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.result-item');
            const preview = item.querySelector('.result-preview');
            const fullText = preview.dataset.fullText;

            if (preview.classList.contains('expanded')) {
                preview.classList.remove('expanded');
                preview.textContent = truncateText(fullText, 60);
                e.target.textContent = t('showButton');
            } else {
                preview.classList.add('expanded');
                preview.textContent = fullText;
                e.target.textContent = t('hideButton');
            }
        });
    });
}

/**
 * Copy text to clipboard
 * @param {string} text
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

/**
 * Truncate text with ellipsis
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape attribute value
 * @param {string} text
 * @returns {string}
 */
function escapeAttr(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
