/**
 * UI module. User-controlled values are inserted with textContent only.
 */

import { t, getCurrentLang, setLang, initLang } from './i18n.js';

const elements = {};
let lastRender = null;
let lastMessage = null;
let previousFocus = null;

const elementIds = [
    'helpBtn', 'langToggle', 'title', 'subtitle', 'scopeNote', 'candidatesLabel',
    'inputHint', 'candidateInput', 'presetLabel', 'presetSelect', 'runBtn',
    'cancelBtn', 'messages', 'progress', 'slowWarning', 'results', 'resultContext',
    'scoreNotice', 'topResultsTitle', 'topResults', 'allResultsBlock',
    'allResultsTitle', 'allResults', 'offlineIndicator', 'githubText', 'helpModal',
    'modalClose', 'helpTitle', 'helpBody'
];

function makeElement(tagName, className = '', text = '') {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== '') node.textContent = text;
    return node;
}

export function initUI() {
    initLang();
    for (const id of elementIds) elements[id] = document.getElementById(id);
    elements.modalBackdrop = elements.helpModal?.querySelector('.modal-backdrop');

    elements.helpBtn?.addEventListener('click', openHelpModal);
    elements.modalClose?.addEventListener('click', closeHelpModal);
    elements.modalBackdrop?.addEventListener('click', closeHelpModal);
    elements.langToggle?.addEventListener('click', toggleLanguage);
    elements.candidateInput?.addEventListener('input', invalidateResults);
    elements.presetSelect?.addEventListener('change', invalidateResults);
    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('online', updateOfflineIndicator);
    window.addEventListener('offline', updateOfflineIndicator);

    updateOfflineIndicator();
    updateUILanguage();
}

function toggleLanguage() {
    setLang(getCurrentLang() === 'ja' ? 'en' : 'ja');
    updateUILanguage();
}

function openHelpModal() {
    if (!elements.helpModal) return;
    previousFocus = elements.helpBtn;
    updateHelpContent();
    elements.helpModal.hidden = false;
    document.body.classList.add('modal-open');
    elements.modalClose?.focus();
}

function closeHelpModal() {
    if (!elements.helpModal) return;
    elements.helpModal.hidden = true;
    document.body.classList.remove('modal-open');
    previousFocus?.focus?.();
    previousFocus = null;
}

function handleEscapeKey(event) {
    if (event.key === 'Escape' && elements.helpModal && !elements.helpModal.hidden) {
        closeHelpModal();
    }
}

function addHelpSection(titleKey, itemKeys, paragraphKey = null) {
    elements.helpBody.appendChild(makeElement('h3', '', t(titleKey)));
    if (paragraphKey) {
        elements.helpBody.appendChild(makeElement('p', '', t(paragraphKey)));
        return;
    }
    const list = makeElement('ul');
    for (const key of itemKeys) list.appendChild(makeElement('li', '', t(key)));
    elements.helpBody.appendChild(list);
}

function updateHelpContent() {
    if (!elements.helpTitle || !elements.helpBody) return;
    elements.helpTitle.textContent = t('helpTitle');
    elements.helpBody.replaceChildren();
    addHelpSection('helpOverview', [], 'helpOverviewText');

    elements.helpBody.appendChild(makeElement('h3', '', t('helpUsage')));
    const steps = makeElement('ol');
    for (const key of ['helpUsageStep1', 'helpUsageStep2', 'helpUsageStep3', 'helpUsageStep4']) {
        steps.appendChild(makeElement('li', '', t(key)));
    }
    elements.helpBody.appendChild(steps);

    addHelpSection('helpMetrics', [
        'helpMetricCentroid', 'helpMetricReference', 'helpMetricCombined', 'helpMetricEvidence'
    ]);
    addHelpSection('helpPresets', [
        'helpPresetBalanced', 'helpPresetCentroid', 'helpPresetNeighbors',
        'helpPresetTop3', 'helpPresetTop7'
    ]);
    addHelpSection('helpLimitations', [
        'helpLimitCandidates', 'helpLimitModel', 'helpLimitTokens', 'helpLimitJudgement'
    ]);
}

const presetTranslationKeys = {
    balanced: 'presetBalanced',
    centroid: 'presetCentroid',
    neighbors: 'presetNeighbors',
    top3: 'presetTop3',
    top7: 'presetTop7'
};

function updateUILanguage() {
    const lang = getCurrentLang();
    document.documentElement.lang = lang;
    document.title = t('title');
    document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        lang === 'ja'
            ? '英語平文候補を内蔵参照文との意味類似度で比較する学習ツール'
            : 'A learning tool for comparing English plaintext candidates with built-in semantic references'
    );

    const textBindings = {
        title: 'title', subtitle: 'subtitle', scopeNote: 'scopeNote',
        candidatesLabel: 'candidatesLabel', inputHint: 'inputHint', presetLabel: 'presetLabel',
        runBtn: 'runButton', cancelBtn: 'cancelButton', slowWarning: 'slowWarning',
        topResultsTitle: 'topResultsTitle', allResultsTitle: 'allResultsTitle',
        scoreNotice: 'scoreNotice', githubText: 'githubText', offlineIndicator: 'offline'
    };
    for (const [elementId, key] of Object.entries(textBindings)) {
        if (elements[elementId]) elements[elementId].textContent = t(key);
    }

    if (elements.candidateInput) elements.candidateInput.placeholder = t('placeholder');
    if (elements.langToggle) {
        elements.langToggle.textContent = t('langToggle');
        elements.langToggle.setAttribute('aria-label', t('langButtonLabel'));
    }
    elements.helpBtn?.setAttribute('aria-label', t('helpButtonLabel'));
    elements.modalClose?.setAttribute('aria-label', t('closeButtonLabel'));

    if (elements.presetSelect) {
        for (const option of elements.presetSelect.options) {
            option.textContent = t(presetTranslationKeys[option.value]);
        }
    }

    elements.progress?.querySelectorAll('.step-label').forEach((label, index) => {
        label.textContent = t(`progressStep${index + 1}`);
    });

    if (elements.helpModal && !elements.helpModal.hidden) updateHelpContent();
    if (lastMessage) renderMessage();
    if (lastRender) renderResults(lastRender.results, lastRender.context);
}

export function getInputValue() {
    return elements.candidateInput?.value || '';
}

export function getSelectedPreset() {
    return elements.presetSelect?.value || 'balanced';
}

export function setButtonHandlers(onRun, onCancel) {
    elements.runBtn?.addEventListener('click', onRun);
    elements.cancelBtn?.addEventListener('click', onCancel);
}

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

export function showIdle() {
    elements.runBtn.hidden = false;
    elements.cancelBtn.hidden = true;
    elements.candidateInput.disabled = false;
    elements.presetSelect.disabled = false;
    elements.langToggle.disabled = false;
    elements.progress.hidden = true;
    elements.slowWarning.hidden = true;
}

export function updateProgress(step) {
    elements.progress.querySelectorAll('.progress-step').forEach((stepElement, index) => {
        const stepNumber = index + 1;
        stepElement.classList.toggle('completed', stepNumber < step);
        stepElement.classList.toggle('active', stepNumber === step);
    });
}

function resetProgressSteps() {
    elements.progress.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
}

export function showSlowWarning() {
    elements.slowWarning.hidden = false;
}

/**
 * @param {string|{key: string, params?: Object}|Array<{key: string, params?: Object}>} message
 * @param {'info'|'warning'|'error'} type
 */
export function showMessage(message, type = 'info') {
    lastMessage = { message, type };
    renderMessage();
}

function renderMessage() {
    if (!lastMessage) return;
    const messages = Array.isArray(lastMessage.message) ? lastMessage.message : [lastMessage.message];
    elements.messages.textContent = messages.map(item => {
        if (typeof item === 'string') return item;
        return t(item.key, item.params || {});
    }).join(' ');
    elements.messages.className = `messages ${lastMessage.type}`;
    elements.messages.hidden = false;
}

export function hideMessage() {
    lastMessage = null;
    elements.messages.hidden = true;
}

function updateOfflineIndicator() {
    if (elements.offlineIndicator) elements.offlineIndicator.hidden = navigator.onLine;
}

function invalidateResults() {
    lastRender = null;
    if (elements.results) elements.results.hidden = true;
    hideMessage();
}

function addDefinitionPair(list, term, value) {
    const group = makeElement('div', 'definition-pair');
    group.append(makeElement('dt', '', term), makeElement('dd', '', value));
    list.appendChild(group);
    return group;
}

function getPresetLabel(presetName) {
    return t(presetTranslationKeys[presetName] || 'presetBalanced');
}

function renderResultContext(context) {
    elements.resultContext.replaceChildren();
    const title = makeElement('h2', 'result-context-title', t('resultContextTitle'));
    title.id = 'resultContextTitle';
    const list = makeElement('dl', 'result-context-grid');
    addDefinitionPair(list, t('modelLabel'), context.modelId);
    addDefinitionPair(list, t('runtimeLabel'), `Transformers.js ${context.transformersVersion}`);
    addDefinitionPair(list, t('referenceCountLabel'), t('referenceCountValue', { count: context.referenceCount }));
    addDefinitionPair(list, t('referenceVersionLabel'), context.referenceVersion);
    const fingerprint = addDefinitionPair(
        list,
        t('referenceFingerprintLabel'),
        context.referenceFingerprint
    );
    fingerprint.querySelector('dd')?.classList.add('reference-fingerprint');
    addDefinitionPair(list, t('tokenLimitLabel'), t('tokenLimitValue', { limit: context.tokenLimit }));
    addDefinitionPair(list, t('presetLabelShort'), getPresetLabel(context.presetName));
    elements.resultContext.append(title, list);
}

const knownMetaKeys = new Set(['shift', 'branch', 'mapping']);

function buildMetaLabels(meta) {
    const container = makeElement('div', 'meta-labels');
    for (const [key, value] of Object.entries(meta || {})) {
        const keyClass = knownMetaKeys.has(key) ? ` meta-${key}` : '';
        container.appendChild(makeElement('span', `meta-label${keyClass}`, `${key}=${value}`));
    }
    return container;
}

function getLengthLabel(lengthBand) {
    const keys = {
        short: 'lengthShort', medium: 'lengthMedium', long: 'lengthLong',
        truncated: 'lengthTruncated', unknown: 'lengthUnknown'
    };
    return t(keys[lengthBand] || 'lengthUnknown');
}

function createLengthBlock(result, tokenLimit) {
    const wrapper = makeElement('div', 'length-details');
    wrapper.appendChild(makeElement(
        'span',
        `length-badge length-${result.lengthBand}`,
        `${t('inputLength')}: ${getLengthLabel(result.lengthBand)}`
    ));
    const used = result.usedTokenCount ?? result.tokenCount ?? 0;
    wrapper.appendChild(makeElement('span', 'token-usage', t('wordPieceUsage', {
        used,
        limit: tokenLimit
    })));
    if (result.truncated) {
        wrapper.appendChild(makeElement('span', 'token-original', t('wordPieceOriginal', {
            total: result.tokenCount
        })));
    }
    return wrapper;
}

function createMetrics(result, topK, compact = false) {
    const metrics = makeElement('dl', compact ? 'metric-grid metric-grid-compact' : 'metric-grid');
    addDefinitionPair(metrics, t('comparisonScore'), result.score.toFixed(3));
    addDefinitionPair(metrics, t('centroidMetric'), result.centroidScore.toFixed(3));
    addDefinitionPair(metrics, t('referenceMetric', { k: topK }), result.referenceScore.toFixed(3));
    return metrics;
}

function makeCopyButton(text) {
    const button = makeElement('button', 'copy-btn', t('copyButton'));
    button.type = 'button';
    button.addEventListener('click', async () => {
        await copyToClipboard(text);
        button.textContent = t('copiedButton');
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = t('copyButton');
            button.classList.remove('copied');
        }, 2000);
    });
    return button;
}

function renderNearestReferenceBody(container, references) {
    const notice = makeElement('p', 'nearest-references-notice', t('nearestReferencesNotice'));
    const list = makeElement('ol', 'nearest-references-list');
    for (const reference of references) {
        const item = makeElement('li', 'nearest-reference-item');
        const header = makeElement('div', 'nearest-reference-header');
        header.append(
            makeElement('span', 'nearest-reference-index', t('nearestReferenceIndex', {
                index: reference.referenceIndex + 1
            })),
            makeElement('span', 'nearest-reference-metrics', t('nearestReferenceMetrics', {
                cosine: reference.cosineSimilarity.toFixed(3),
                proximity: reference.proximity.toFixed(3)
            }))
        );
        item.append(header, makeElement('p', 'nearest-reference-text', reference.text || ''));
        list.appendChild(item);
    }
    container.replaceChildren(notice, list);
}

function createNearestReferenceDetails(result) {
    const details = makeElement('details', 'nearest-references');
    const references = result.nearestReferences || [];
    const summary = makeElement('summary', '', t('nearestReferencesSummary', {
        count: references.length
    }));
    const body = makeElement('div', 'nearest-references-body');
    let rendered = false;
    details.addEventListener('toggle', () => {
        if (details.open && !rendered) {
            renderNearestReferenceBody(body, references);
            rendered = true;
        }
    });
    details.append(summary, body);
    return details;
}

function createTopResultCard(result, context) {
    const card = makeElement('article', `result-card rank-${result.rank}`);
    card.appendChild(makeElement('div', 'rank-badge', String(result.rank)));
    if (Object.keys(result.meta || {}).length > 0) card.appendChild(buildMetaLabels(result.meta));
    card.appendChild(makeElement('div', 'candidate-text', result.text));
    card.appendChild(createMetrics(result, context.topK));
    card.appendChild(createLengthBlock(result, context.tokenLimit));
    card.appendChild(createNearestReferenceDetails(result));
    card.appendChild(makeCopyButton(result.rawText || result.text));
    return card;
}

function createResultItem(result, context) {
    const item = makeElement('article', 'result-item');
    item.appendChild(makeElement('div', 'result-rank', String(result.rank)));

    const content = makeElement('div', 'result-content');
    if (Object.keys(result.meta || {}).length > 0) content.appendChild(buildMetaLabels(result.meta));
    const preview = makeElement('div', 'result-preview', truncateText(result.text, 80));
    content.append(preview, createMetrics(result, context.topK, true));
    item.append(content, createLengthBlock(result, context.tokenLimit));

    const actions = makeElement('div', 'result-actions');
    const toggle = makeElement('button', 'toggle-btn', t('showButton'));
    toggle.type = 'button';
    toggle.addEventListener('click', () => {
        const expanded = preview.classList.toggle('expanded');
        preview.textContent = expanded ? result.text : truncateText(result.text, 80);
        toggle.textContent = t(expanded ? 'hideButton' : 'showButton');
    });
    actions.append(toggle, makeCopyButton(result.rawText || result.text));
    item.appendChild(actions);
    item.appendChild(createNearestReferenceDetails(result));
    return item;
}

export function renderResults(results, context) {
    if (!results?.length) {
        lastRender = null;
        elements.results.hidden = true;
        return;
    }

    lastRender = { results, context };
    renderResultContext(context);
    elements.scoreNotice.textContent = t('scoreNotice');
    elements.topResults.replaceChildren(...results.slice(0, 3).map(result => createTopResultCard(result, context)));

    const remaining = results.slice(3);
    elements.allResults.replaceChildren(...remaining.map(result => createResultItem(result, context)));
    elements.allResultsBlock.hidden = remaining.length === 0;
    elements.results.hidden = false;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const textarea = makeElement('textarea', 'clipboard-fallback');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }
}

function truncateText(text, maxLength) {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}
