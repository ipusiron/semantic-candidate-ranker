/**
 * UI module. User-controlled values are inserted with textContent only.
 */

import { t, getCurrentLang, setLang, initLang } from './i18n.js';

const elements = {};
let lastRender = null;
let lastMessage = null;
let lastEvaluationRender = null;
let lastPerturbationRender = null;
let lastEvaluationMessage = null;
let evaluationCases = [];
let evaluationMetadata = null;
let perturbationFactory = null;
let previousFocus = null;

const elementIds = [
    'helpBtn', 'langToggle', 'title', 'subtitle', 'scopeNote', 'candidatesLabel',
    'inputHint', 'candidateInput', 'presetLabel', 'presetSelect', 'runBtn',
    'cancelBtn', 'messages', 'progress', 'slowWarning', 'results', 'resultContext',
    'scoreNotice', 'topResultsTitle', 'topResults', 'allResultsBlock',
    'allResultsTitle', 'allResults', 'offlineIndicator', 'githubText', 'helpModal',
    'modalClose', 'helpTitle', 'helpBody', 'compareTab', 'evaluationTab',
    'comparePanel', 'evaluationPanel', 'evaluationTitle', 'evaluationDescription',
    'evaluationLimit', 'evaluationContext', 'evaluationRunBtn', 'evaluationCancelBtn',
    'evaluationMessages', 'evaluationProgress', 'evaluationSlowWarning',
    'evaluationResults', 'evaluationSummaryTitle', 'evaluationSummary',
    'presetComparisonTitle', 'presetComparisonNote', 'presetComparison',
    'groupResultsTitle', 'groupResults', 'caseResultsTitle', 'caseResults',
    'perturbationTitle', 'perturbationDescription', 'evaluationCaseLabel',
    'evaluationCaseSelect', 'perturbationTypeLabel', 'perturbationTypeSelect',
    'perturbationTextLabel', 'perturbationInput', 'perturbationRunBtn',
    'perturbationResults'
];

const perturbationIds = [
    'case', 'whitespace', 'punctuation', 'typo', 'deleteWord', 'wordOrder', 'append', 'truncate'
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
    elements.compareTab?.addEventListener('click', () => switchTab('compare'));
    elements.evaluationTab?.addEventListener('click', () => switchTab('evaluation'));
    elements.compareTab?.parentElement?.addEventListener('keydown', handleTabKeydown);
    elements.evaluationCaseSelect?.addEventListener('change', refreshPerturbationText);
    elements.perturbationTypeSelect?.addEventListener('change', refreshPerturbationText);
    elements.perturbationInput?.addEventListener('input', () => {
        lastPerturbationRender = null;
        elements.perturbationResults.hidden = true;
    });
    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('online', updateOfflineIndicator);
    window.addEventListener('offline', updateOfflineIndicator);

    updateOfflineIndicator();
    updateUILanguage();
}

function switchTab(tabName, focus = false) {
    const evaluationActive = tabName === 'evaluation';
    elements.comparePanel.hidden = evaluationActive;
    elements.evaluationPanel.hidden = !evaluationActive;
    for (const [tab, active] of [
        [elements.compareTab, !evaluationActive],
        [elements.evaluationTab, evaluationActive]
    ]) {
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
    }
    if (focus) (evaluationActive ? elements.evaluationTab : elements.compareTab).focus();
}

function handleTabKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const goEvaluation = event.key === 'ArrowRight' || event.key === 'End';
    switchTab(goEvaluation ? 'evaluation' : 'compare', true);
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
    addHelpSection('helpEvaluation', [
        'helpEvaluationData', 'helpEvaluationPerturbation', 'helpEvaluationLimit'
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
        scoreNotice: 'scoreNotice', githubText: 'githubText', offlineIndicator: 'offline',
        compareTab: 'compareTab', evaluationTab: 'evaluationTab',
        evaluationTitle: 'evaluationTitle', evaluationDescription: 'evaluationDescription',
        evaluationLimit: 'evaluationLimit', evaluationRunBtn: 'evaluationRunButton',
        evaluationCancelBtn: 'cancelButton', evaluationSlowWarning: 'slowWarning',
        evaluationSummaryTitle: 'evaluationSummaryTitle',
        presetComparisonTitle: 'presetComparisonTitle', presetComparisonNote: 'presetComparisonNote',
        groupResultsTitle: 'groupResultsTitle', caseResultsTitle: 'caseResultsTitle',
        perturbationTitle: 'perturbationTitle', perturbationDescription: 'perturbationDescription',
        evaluationCaseLabel: 'evaluationCaseLabel', perturbationTypeLabel: 'perturbationTypeLabel',
        perturbationTextLabel: 'perturbationTextLabel', perturbationRunBtn: 'perturbationRunButton'
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
    elements.compareTab?.parentElement?.setAttribute('aria-label', t('tablistLabel'));

    if (elements.presetSelect) {
        for (const option of elements.presetSelect.options) {
            option.textContent = t(presetTranslationKeys[option.value]);
        }
    }

    elements.progress?.querySelectorAll('.step-label').forEach((label, index) => {
        label.textContent = t(`progressStep${index + 1}`);
    });
    elements.evaluationProgress?.querySelectorAll('.step-label').forEach((label, index) => {
        label.textContent = t(`progressStep${index + 1}`);
    });

    if (elements.helpModal && !elements.helpModal.hidden) updateHelpContent();
    if (lastMessage) renderMessage();
    if (lastRender) renderResults(lastRender.results, lastRender.context);
    if (evaluationMetadata) renderEvaluationContext();
    refreshEvaluationOptions();
    if (lastEvaluationMessage) renderEvaluationMessage();
    if (lastEvaluationRender) renderEvaluationResults(lastEvaluationRender.presetResults, lastEvaluationRender.context);
    if (lastPerturbationRender) renderPerturbationResults(lastPerturbationRender);
}

const familyTranslationKeys = {
    caesar: 'familyCaesar', affine: 'familyAffine', vigenere: 'familyVigenere',
    beaufort: 'familyBeaufort', railfence: 'familyRailfence', columnar: 'familyColumnar'
};

const lengthTranslationKeys = {
    short: 'lengthGroupShort', medium: 'lengthGroupMedium', long: 'lengthGroupLong'
};

const perturbationTranslationKeys = {
    case: 'perturbationCase', whitespace: 'perturbationWhitespace',
    punctuation: 'perturbationPunctuation', typo: 'perturbationTypo',
    deleteWord: 'perturbationDeleteWord', wordOrder: 'perturbationWordOrder',
    append: 'perturbationAppend', truncate: 'perturbationTruncate'
};

function familyLabel(family) {
    return t(familyTranslationKeys[family] || family);
}

function lengthGroupLabel(lengthGroup) {
    return t(lengthTranslationKeys[lengthGroup] || lengthGroup);
}

export function configureEvaluation(cases, metadata, buildPerturbedText) {
    evaluationCases = cases;
    evaluationMetadata = metadata;
    perturbationFactory = buildPerturbedText;
    renderEvaluationContext();
    refreshEvaluationOptions();
}

function renderEvaluationContext() {
    if (!elements.evaluationContext || !evaluationMetadata) return;
    elements.evaluationContext.replaceChildren();
    addDefinitionPair(elements.evaluationContext, t('evaluationSetVersionLabel'), evaluationMetadata.version);
    const fingerprint = addDefinitionPair(
        elements.evaluationContext,
        t('evaluationFingerprintLabel'),
        evaluationMetadata.fingerprint
    );
    fingerprint.querySelector('dd')?.classList.add('reference-fingerprint');
    addDefinitionPair(
        elements.evaluationContext,
        t('evaluationCasesLabel'),
        t('evaluationCasesValue', { count: evaluationMetadata.caseCount })
    );
    addDefinitionPair(
        elements.evaluationContext,
        t('evaluationCandidatesLabel'),
        t('evaluationCandidatesValue', { count: evaluationMetadata.candidateCount })
    );
    addDefinitionPair(elements.evaluationContext, t('evaluationCompositionLabel'), t('evaluationCompositionValue'));
}

function refreshEvaluationOptions() {
    if (!elements.evaluationCaseSelect || evaluationCases.length === 0) return;
    const selectedCase = elements.evaluationCaseSelect.value || evaluationCases[0].id;
    const selectedPerturbation = elements.perturbationTypeSelect.value || perturbationIds[0];
    elements.evaluationCaseSelect.replaceChildren(...evaluationCases.map(caseDefinition => {
        const option = makeElement('option', '', `${familyLabel(caseDefinition.family)} / ${lengthGroupLabel(caseDefinition.lengthGroup)}`);
        option.value = caseDefinition.id;
        return option;
    }));
    elements.evaluationCaseSelect.value = evaluationCases.some(item => item.id === selectedCase)
        ? selectedCase
        : evaluationCases[0].id;
    elements.perturbationTypeSelect.replaceChildren(...perturbationIds.map(id => {
        const option = makeElement('option', '', t(perturbationTranslationKeys[id]));
        option.value = id;
        return option;
    }));
    elements.perturbationTypeSelect.value = perturbationIds.includes(selectedPerturbation)
        ? selectedPerturbation
        : perturbationIds[0];
    if (!elements.perturbationInput.value) refreshPerturbationText();
}

function refreshPerturbationText() {
    if (!perturbationFactory || !elements.perturbationInput) return;
    const caseDefinition = evaluationCases.find(item => item.id === elements.evaluationCaseSelect.value);
    if (!caseDefinition) return;
    elements.perturbationInput.value = perturbationFactory(
        caseDefinition.sourcePlaintext,
        elements.perturbationTypeSelect.value
    );
    lastPerturbationRender = null;
    elements.perturbationResults.hidden = true;
}

export function getPerturbationRequest() {
    return {
        caseId: elements.evaluationCaseSelect?.value || '',
        perturbationId: elements.perturbationTypeSelect?.value || '',
        text: elements.perturbationInput?.value || ''
    };
}

export function getInputValue() {
    return elements.candidateInput?.value || '';
}

export function getSelectedPreset() {
    return elements.presetSelect?.value || 'balanced';
}

export function setButtonHandlers(onRun, onCancel, onEvaluationRun, onEvaluationCancel, onPerturbationRun) {
    elements.runBtn?.addEventListener('click', onRun);
    elements.cancelBtn?.addEventListener('click', onCancel);
    elements.evaluationRunBtn?.addEventListener('click', onEvaluationRun);
    elements.evaluationCancelBtn?.addEventListener('click', onEvaluationCancel);
    elements.perturbationRunBtn?.addEventListener('click', onPerturbationRun);
}

export function showProcessing(mode = 'compare') {
    const evaluationMode = mode === 'evaluation';
    elements.runBtn.hidden = evaluationMode ? false : true;
    elements.cancelBtn.hidden = evaluationMode ? true : false;
    elements.evaluationRunBtn.hidden = evaluationMode;
    elements.evaluationCancelBtn.hidden = !evaluationMode;
    elements.candidateInput.disabled = true;
    elements.presetSelect.disabled = true;
    elements.evaluationCaseSelect.disabled = true;
    elements.perturbationTypeSelect.disabled = true;
    elements.perturbationInput.disabled = true;
    elements.perturbationRunBtn.disabled = true;
    elements.langToggle.disabled = true;
    elements.compareTab.disabled = true;
    elements.evaluationTab.disabled = true;
    elements.progress.hidden = evaluationMode;
    elements.evaluationProgress.hidden = !evaluationMode;
    if (evaluationMode) {
        elements.evaluationResults.hidden = true;
        hideEvaluationMessage();
    } else {
        elements.results.hidden = true;
        hideMessage();
    }
    resetProgressSteps(mode);
}

export function showIdle() {
    elements.runBtn.hidden = false;
    elements.cancelBtn.hidden = true;
    elements.evaluationRunBtn.hidden = false;
    elements.evaluationCancelBtn.hidden = true;
    elements.candidateInput.disabled = false;
    elements.presetSelect.disabled = false;
    elements.evaluationCaseSelect.disabled = false;
    elements.perturbationTypeSelect.disabled = false;
    elements.perturbationInput.disabled = false;
    elements.perturbationRunBtn.disabled = false;
    elements.langToggle.disabled = false;
    elements.compareTab.disabled = false;
    elements.evaluationTab.disabled = false;
    elements.progress.hidden = true;
    elements.evaluationProgress.hidden = true;
    elements.slowWarning.hidden = true;
    elements.evaluationSlowWarning.hidden = true;
}

export function updateProgress(step, mode = 'compare') {
    const progress = mode === 'evaluation' ? elements.evaluationProgress : elements.progress;
    progress.querySelectorAll('.progress-step').forEach((stepElement, index) => {
        const stepNumber = index + 1;
        stepElement.classList.toggle('completed', stepNumber < step);
        stepElement.classList.toggle('active', stepNumber === step);
    });
}

function resetProgressSteps(mode = 'compare') {
    const progress = mode === 'evaluation' ? elements.evaluationProgress : elements.progress;
    progress.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
}

export function showSlowWarning(mode = 'compare') {
    (mode === 'evaluation' ? elements.evaluationSlowWarning : elements.slowWarning).hidden = false;
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

export function showEvaluationMessage(message, type = 'info') {
    lastEvaluationMessage = { message, type };
    renderEvaluationMessage();
}

function renderEvaluationMessage() {
    if (!lastEvaluationMessage) return;
    const messages = Array.isArray(lastEvaluationMessage.message)
        ? lastEvaluationMessage.message
        : [lastEvaluationMessage.message];
    elements.evaluationMessages.textContent = messages.map(item => {
        if (typeof item === 'string') return item;
        return t(item.key, item.params || {});
    }).join(' ');
    elements.evaluationMessages.className = `messages ${lastEvaluationMessage.type}`;
    elements.evaluationMessages.hidden = false;
}

export function hideEvaluationMessage() {
    lastEvaluationMessage = null;
    elements.evaluationMessages.hidden = true;
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

function appendSummaryMetrics(container, summary) {
    const metrics = [
        ['top1Metric', t('fractionValue', { count: summary.top1Count, total: summary.caseCount })],
        ['top3Metric', t('fractionValue', { count: summary.top3Count, total: summary.caseCount })],
        ['mrrMetric', summary.mrr.toFixed(3)],
        ['medianRankMetric', t('rankValue', { rank: summary.medianRank })]
    ];
    for (const [labelKey, value] of metrics) {
        const card = makeElement('div', 'evaluation-metric');
        card.append(makeElement('span', 'evaluation-metric-label', t(labelKey)));
        card.append(makeElement('strong', 'evaluation-metric-value', value));
        container.appendChild(card);
    }
}

function createGroupSection(title, groups, labeler) {
    const section = makeElement('section', 'evaluation-group');
    section.appendChild(makeElement('h3', '', title));
    const list = makeElement('div', 'evaluation-group-list');
    for (const group of groups) {
        const card = makeElement('article', 'evaluation-group-card');
        card.appendChild(makeElement('h4', '', labeler(group.key)));
        const metrics = makeElement('dl', 'compact-definition-list');
        addDefinitionPair(metrics, t('top1Metric'), t('fractionValue', {
            count: group.top1Count,
            total: group.caseCount
        }));
        addDefinitionPair(metrics, t('top3Metric'), t('fractionValue', {
            count: group.top3Count,
            total: group.caseCount
        }));
        addDefinitionPair(metrics, t('mrrMetric'), group.mrr.toFixed(3));
        card.appendChild(metrics);
        list.appendChild(card);
    }
    section.appendChild(list);
    return section;
}

function createCaseDetails(caseResult, caseDefinition) {
    const details = makeElement('details', 'evaluation-case');
    const summary = makeElement('summary', '', t('caseSummary', {
        family: familyLabel(caseDefinition.family),
        length: lengthGroupLabel(caseDefinition.lengthGroup),
        rank: caseResult.correctRank
    }));
    const body = makeElement('div', 'evaluation-case-body');
    const metrics = makeElement('dl', 'compact-definition-list');
    addDefinitionPair(metrics, t('medianRankMetric'), t('rankValue', { rank: caseResult.correctRank }));
    addDefinitionPair(metrics, t('scoreGapLabel'), caseResult.scoreGap.toFixed(3));

    const correctDefinition = caseDefinition.candidates[caseResult.correctResult.originalIndex];
    const winnerDefinition = caseDefinition.candidates[caseResult.winner.originalIndex];
    const correct = makeElement('section', 'evaluation-candidate correct-candidate');
    correct.append(
        makeElement('h4', '', t('correctCandidateLabel')),
        makeElement('p', 'evaluation-candidate-text', caseResult.correctResult.text),
        makeElement('p', 'evaluation-setting', `${t('candidateSettingLabel')}: ${correctDefinition.setting}`),
        createMetrics(caseResult.correctResult, 5, true)
    );
    body.append(metrics, correct);
    if (caseResult.correctRank === 1) {
        body.appendChild(makeElement('p', 'same-candidate-notice', t('sameCandidateNotice')));
    } else {
        const winner = makeElement('section', 'evaluation-candidate winner-candidate');
        winner.append(
            makeElement('h4', '', t('winnerCandidateLabel')),
            makeElement('p', 'evaluation-candidate-text', caseResult.winner.text),
            makeElement('p', 'evaluation-setting', `${t('candidateSettingLabel')}: ${winnerDefinition.setting}`),
            createMetrics(caseResult.winner, 5, true)
        );
        body.appendChild(winner);
    }
    details.append(summary, body);
    return details;
}

export function renderEvaluationResults(presetResults, context) {
    lastEvaluationRender = { presetResults, context };
    elements.evaluationSummary.replaceChildren();
    appendSummaryMetrics(elements.evaluationSummary, presetResults.balanced.summary);
    elements.evaluationSummary.appendChild(makeElement('p', 'evaluation-dataset-notice', t('evaluationDatasetNotice')));

    elements.presetComparison.replaceChildren();
    for (const [presetName, result] of Object.entries(presetResults)) {
        const card = makeElement('article', 'preset-result-card');
        card.appendChild(makeElement('h3', '', getPresetLabel(presetName)));
        const metrics = makeElement('div', 'preset-metrics');
        appendSummaryMetrics(metrics, result.summary);
        card.appendChild(metrics);
        elements.presetComparison.appendChild(card);
    }

    elements.groupResults.replaceChildren(
        createGroupSection(t('familyGroupsTitle'), context.familyGroups, familyLabel),
        createGroupSection(t('lengthGroupsTitle'), context.lengthGroups, lengthGroupLabel)
    );

    const caseMap = new Map(context.cases.map(caseDefinition => [caseDefinition.id, caseDefinition]));
    elements.caseResults.replaceChildren(...presetResults.balanced.cases.map(result =>
        createCaseDetails(result, caseMap.get(result.caseId))
    ));
    elements.evaluationResults.hidden = false;
}

function formatSigned(value, digits = 3) {
    if (Math.abs(value) < 0.0005) return t('noChange');
    return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function createPerturbationPresetCard(presetName, comparison) {
    const card = makeElement('article', 'perturbation-preset-card');
    card.appendChild(makeElement('h4', '', getPresetLabel(presetName)));
    const metrics = makeElement('dl', 'compact-definition-list');
    addDefinitionPair(
        metrics,
        t('medianRankMetric'),
        `${comparison.before.correctRank} → ${comparison.after.correctRank}`
    );
    addDefinitionPair(
        metrics,
        t('rankDeltaLabel'),
        comparison.delta.rankDelta === 0
            ? t('noChange')
            : t('signedRankDelta', { value: `${comparison.delta.rankDelta > 0 ? '+' : ''}${comparison.delta.rankDelta}` })
    );
    addDefinitionPair(metrics, t('scoreDeltaLabel'), formatSigned(comparison.delta.scoreDelta));
    addDefinitionPair(metrics, t('centroidDeltaLabel'), formatSigned(comparison.delta.centroidDelta));
    addDefinitionPair(metrics, t('referenceDeltaLabel'), formatSigned(comparison.delta.referenceDelta));
    addDefinitionPair(metrics, t('nearestChangedLabel'), t('nearestChangedValue', {
        count: comparison.delta.nearestChanged,
        total: comparison.before.correctResult.nearestReferences.length
    }));
    card.appendChild(metrics);
    return card;
}

export function renderPerturbationResults(result) {
    lastPerturbationRender = result;
    elements.perturbationResults.replaceChildren();
    elements.perturbationResults.appendChild(makeElement('h3', '', t('perturbationResultTitle')));
    const texts = makeElement('div', 'perturbation-text-comparison');
    for (const [labelKey, text, usage] of [
        ['beforeLabel', result.beforeText, result.beforeUsage],
        ['afterLabel', result.afterText, result.afterUsage]
    ]) {
        const card = makeElement('article', 'perturbation-text-card');
        card.append(
            makeElement('h4', '', t(labelKey)),
            makeElement('p', 'evaluation-candidate-text', text),
            makeElement('p', 'token-usage', t('wordPieceUsage', {
                used: usage.usedTokenCount,
                limit: result.tokenLimit
            }))
        );
        if (usage.truncated) {
            card.appendChild(makeElement('p', 'token-original', t('wordPieceOriginal', {
                total: usage.tokenCount
            })));
        }
        texts.appendChild(card);
    }
    const presets = makeElement('div', 'perturbation-preset-results');
    for (const [presetName, comparison] of Object.entries(result.comparisons)) {
        presets.appendChild(createPerturbationPresetCard(presetName, comparison));
    }
    elements.perturbationResults.append(texts, presets);
    elements.perturbationResults.hidden = false;
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
