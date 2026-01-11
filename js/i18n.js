/**
 * Internationalization module
 * Supports Japanese (default) and English
 */

const translations = {
    ja: {
        // Header
        title: 'セマンティック候補ランカー',
        subtitle: '意味的な自然さで平文候補をランク付け',

        // Input section
        candidatesLabel: '候補',
        placeholder: '候補を空行で区切って入力してください。\n\n例:\nthis is the first candidate\n\nthis is the second candidate\n\nthis is the third candidate',

        // Presets
        presetLabel: 'プリセット',
        presetBalanced: 'バランス',
        presetNaturalness: '自然さ重視',
        presetReference: '参照重視',
        presetStrict: '厳格',
        presetBroad: '広範囲',

        // Buttons
        runButton: '実行',
        cancelButton: 'キャンセル',
        copyButton: 'コピー',
        copiedButton: 'コピー済み',
        showButton: '表示',
        hideButton: '非表示',

        // Progress
        progressStep1: 'モデル読み込み中',
        progressStep2: '候補を準備中',
        progressStep3: '参照を準備中',
        progressStep4: '類似度を計算中',
        progressStep5: '結果をランキング中',
        slowWarning: '処理に時間がかかっています...',

        // Results
        topResultsTitle: 'トップ結果',
        allResultsTitle: 'すべての結果',
        score: 'スコア',

        // Evaluation comments
        evalExcellent: '優秀 - 非常に自然な表現',
        evalGood: '良好 - 自然で流暢',
        evalFair: '普通 - やや自然',
        evalWeak: '弱い - やや不自然',
        evalPoor: '不良 - 自然な文ではない可能性',

        // Confidence
        confidenceHigh: '高',
        confidenceMedium: '中',
        confidenceLow: '低',

        // Messages
        errorEmpty: '少なくとも1つの候補を入力してください。',
        errorTooMany: '入力には{count}個の候補があります。最初の200個のみ処理されます。',
        warningShort: 'すべての候補が短い（40文字未満）ため、結果の信頼度が低くなる可能性があります。',
        errorProcessing: '処理中にエラーが発生しました。もう一度お試しください。',
        errorNetwork: 'モデルの読み込みに失敗しました。初回実行時はインターネット接続を確認してください。',
        infoCancelled: '処理がキャンセルされました。',

        // Footer
        githubText: '🔗 GitHubリポジトリはこちら（',
        offline: 'オフライン',

        // Language
        langToggle: 'EN',

        // Help modal
        helpTitle: '使い方',
        helpOverview: '概要',
        helpOverviewText: 'このツールは、入力されたテキスト候補を意味的な自然さでランク付けします。機械学習モデルを使用して、各候補がどれだけ自然な文章かを評価します。',
        helpUsage: '使用方法',
        helpUsageStep1: 'テキストエリアに候補を入力（空行で区切る）',
        helpUsageStep2: 'プリセットを選択（オプション）',
        helpUsageStep3: '「実行」ボタンをクリック',
        helpUsageStep4: '結果を確認',
        helpPresets: 'プリセット',
        helpPresetBalanced: '自然さと参照類似度を均等に評価',
        helpPresetNaturalness: '全体的な自然さを重視',
        helpPresetReference: '参照文との類似度を重視',
        helpPresetStrict: 'より少ない参照文で厳密に評価',
        helpPresetBroad: 'より多くの参照文で幅広く評価',
        helpEvaluation: '評価',
        helpEvalExcellent: '非常に自然な表現',
        helpEvalGood: '自然で流暢',
        helpEvalFair: 'やや自然',
        helpEvalWeak: 'やや不自然',
        helpEvalPoor: '自然な文ではない可能性',
        helpLimitations: '制限事項',
        helpLimitCandidates: '最大200件の候補',
        helpLimitModel: '初回はモデルのダウンロードが必要（約23MB）'
    },
    en: {
        // Header
        title: 'Semantic Candidate Ranker',
        subtitle: 'Rank plaintext candidates by semantic naturalness',

        // Input section
        candidatesLabel: 'Candidates',
        placeholder: 'Enter candidates separated by blank lines.\n\nExample:\nthis is the first candidate\n\nthis is the second candidate\n\nthis is the third candidate',

        // Presets
        presetLabel: 'Preset',
        presetBalanced: 'Balanced',
        presetNaturalness: 'Naturalness',
        presetReference: 'Reference',
        presetStrict: 'Strict',
        presetBroad: 'Broad',

        // Buttons
        runButton: 'Run',
        cancelButton: 'Cancel',
        copyButton: 'Copy',
        copiedButton: 'Copied!',
        showButton: 'Show',
        hideButton: 'Hide',

        // Progress
        progressStep1: 'Loading model',
        progressStep2: 'Preparing candidates',
        progressStep3: 'Preparing references',
        progressStep4: 'Computing similarities',
        progressStep5: 'Ranking results',
        slowWarning: 'Processing is taking longer than expected...',

        // Results
        topResultsTitle: 'Top Results',
        allResultsTitle: 'All Results',
        score: 'Score',

        // Evaluation comments
        evalExcellent: 'Excellent - Highly natural expression',
        evalGood: 'Good - Natural and fluent',
        evalFair: 'Fair - Moderately natural',
        evalWeak: 'Weak - Somewhat unnatural',
        evalPoor: 'Poor - Likely not natural text',

        // Confidence
        confidenceHigh: 'High',
        confidenceMedium: 'Med',
        confidenceLow: 'Low',

        // Messages
        errorEmpty: 'Please enter at least one candidate.',
        errorTooMany: 'Input contains {count} candidates. Only the first 200 will be processed.',
        warningShort: 'All candidates are short (< 40 characters). Results may have lower confidence.',
        errorProcessing: 'An error occurred during processing. Please try again.',
        errorNetwork: 'Failed to load model. Please check your internet connection for the first run.',
        infoCancelled: 'Processing cancelled.',

        // Footer
        githubText: '🔗 GitHub Repository: ',
        offline: 'Offline',

        // Language
        langToggle: 'JP',

        // Help modal
        helpTitle: 'How to Use',
        helpOverview: 'Overview',
        helpOverviewText: 'This tool ranks text candidates by semantic naturalness. It uses a machine learning model to evaluate how natural each candidate sentence is.',
        helpUsage: 'Usage',
        helpUsageStep1: 'Enter candidates in the text area (separate with blank lines)',
        helpUsageStep2: 'Select a preset (optional)',
        helpUsageStep3: 'Click the "Run" button',
        helpUsageStep4: 'Review the results',
        helpPresets: 'Presets',
        helpPresetBalanced: 'Equal weight for naturalness and reference similarity',
        helpPresetNaturalness: 'Prioritize overall naturalness',
        helpPresetReference: 'Prioritize similarity to reference sentences',
        helpPresetStrict: 'Strict evaluation with fewer references',
        helpPresetBroad: 'Broad evaluation with more references',
        helpEvaluation: 'Evaluation',
        helpEvalExcellent: 'Highly natural expression',
        helpEvalGood: 'Natural and fluent',
        helpEvalFair: 'Moderately natural',
        helpEvalWeak: 'Somewhat unnatural',
        helpEvalPoor: 'Likely not natural text',
        helpLimitations: 'Limitations',
        helpLimitCandidates: 'Maximum 200 candidates',
        helpLimitModel: 'First run requires model download (~23MB)'
    }
};

let currentLang = 'ja';

/**
 * Get current language
 * @returns {string}
 */
export function getCurrentLang() {
    return currentLang;
}

/**
 * Set current language
 * @param {string} lang - 'ja' or 'en'
 */
export function setLang(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('semantic-ranker-lang', lang);
    }
}

/**
 * Initialize language from localStorage
 */
export function initLang() {
    const saved = localStorage.getItem('semantic-ranker-lang');
    if (saved && translations[saved]) {
        currentLang = saved;
    }
}

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string}
 */
export function t(key, params = {}) {
    let text = translations[currentLang]?.[key] || translations['en'][key] || key;

    // Simple interpolation for {param} placeholders
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }

    return text;
}

/**
 * Get all translations for current language
 * @returns {Object}
 */
export function getTranslations() {
    return translations[currentLang] || translations['en'];
}
