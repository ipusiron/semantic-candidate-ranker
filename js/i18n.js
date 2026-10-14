/**
 * Internationalization module. Japanese is the default; English is complete.
 */

const translations = {
    ja: {
        title: 'セマンティック候補ランカー',
        subtitle: '内蔵参照文との意味類似度で英語平文候補を比較',
        scopeNote: '順位は候補どうしを比べるための補助です。文法の自然さ、復号の正しさ、正解確率は判定しません。',
        candidatesLabel: '英語の平文候補',
        inputHint: '1候補を1ブロックとして、空行で区切ります。先頭の key=value 行は表示用メタデータとして評価から除外します。',
        placeholder: '候補を空行で区切って入力してください。\n\n例:\nthis is the first candidate\n\nthis is the second candidate\n\nthis is the third candidate',
        presetLabel: '比較プリセット',
        presetBalanced: 'バランス（既定）',
        presetCentroid: '参照重心寄り',
        presetNeighbors: '近い参照例寄り',
        presetTop3: '上位3参照',
        presetTop7: '上位7参照',
        runButton: '比較する',
        cancelButton: 'キャンセル',
        copyButton: '元の候補をコピー',
        copiedButton: 'コピーしました',
        showButton: '全文を表示',
        hideButton: '折りたたむ',
        progressStep1: 'モデルを読み込み中',
        progressStep2: '候補を準備中',
        progressStep3: '参照文を準備中',
        progressStep4: '意味類似度を計算中',
        progressStep5: '候補を順位付け中',
        slowWarning: 'モデル取得または計算に時間がかかっています。処理はキャンセルできます。',
        topResultsTitle: '上位の候補',
        allResultsTitle: '4位以降の候補',
        comparisonScore: '比較スコア',
        centroidMetric: '参照集合の重心との近さ',
        referenceMetric: '上位{k}参照との近さ',
        inputLength: '入力長',
        lengthShort: '短い',
        lengthMedium: '中程度',
        lengthLong: '長い',
        lengthTruncated: '上限超過',
        lengthUnknown: '不明',
        wordPieceUsage: '{used}/{limit} word pieces使用',
        wordPieceOriginal: '元は{total} word pieces',
        resultContextTitle: 'この結果の条件',
        modelLabel: 'モデル',
        runtimeLabel: '実行ライブラリー',
        referenceCountLabel: '内蔵参照文',
        referenceCountValue: '{count}文',
        referenceVersionLabel: '参照集合の版',
        referenceFingerprintLabel: '参照集合のSHA-256',
        tokenLimitLabel: '候補ごとの上限',
        tokenLimitValue: '{limit} word pieces',
        presetLabelShort: 'プリセット',
        scoreNotice: '比較スコアは、この参照集合に対する本ツール独自の合成値です。確率・品質点・復号正解の証明ではありません。',
        nearestReferencesSummary: '計算に使った近傍参照文{count}件を見る',
        nearestReferencesNotice: '上位参照との近さ（B）の計算に使った文です。似た文があることは、候補の正しさや自然さの証明ではありません。',
        nearestReferenceIndex: '参照 #{index}',
        nearestReferenceMetrics: 'cosine {cosine} ／ 表示上の近さ {proximity}',
        errorEmpty: '少なくとも1つの候補を入力してください。',
        errorTooMany: '入力には{count}個の候補があります。最初の200個だけを処理します。',
        warningShort: 'すべての候補が32 word pieces未満です。短い入力ではスコア差が小さくなる場合があるため、順位だけで判断しないでください。',
        warningTruncated: '{count}件は{limit} word piecesを超えたため、超過部分を比較に使っていません。',
        errorProcessing: '処理中にエラーが発生しました。入力と接続状況を確認して、もう一度お試しください。',
        errorNetwork: 'モデルまたは実行ライブラリーを取得できませんでした。キャッシュがない場合はインターネット接続が必要です。',
        infoCancelled: '処理をキャンセルしました。',
        githubText: '🔗 GitHubリポジトリ：',
        offline: 'ブラウザーはオフライン',
        langToggle: 'English',
        helpButtonLabel: '使い方を開く',
        langButtonLabel: '英語表示へ切り替える',
        closeButtonLabel: '使い方を閉じる',
        helpTitle: '使い方と限界',
        helpOverview: 'このツールが比較するもの',
        helpOverviewText: '英語の各候補をベクトル化し、内蔵した一般英文の集合へどれだけ近いかを比較します。文法検査、言語モデルによる流暢さ評価、暗号解読は行いません。',
        helpUsage: '使い方',
        helpUsageStep1: '英語の候補を空行で区切って入力する',
        helpUsageStep2: '比較プリセットを選ぶ',
        helpUsageStep3: '「比較する」を押す',
        helpUsageStep4: '各成分と入力長を確認し、上位候補を人が検討する',
        helpMetrics: '表示する値',
        helpMetricCentroid: '参照集合の重心との近さ：内蔵英文全体の中心とのコサイン類似度',
        helpMetricReference: '上位参照との近さ：候補に最も近いk文のコサイン類似度平均',
        helpMetricCombined: '比較スコア：上の2値をプリセットの重みで合成した順位付け用の値',
        helpMetricEvidence: '各候補の展開欄：Bの計算に使った参照文、集合内番号、個別のcosineと表示上の近さ',
        helpPresets: 'プリセット',
        helpPresetBalanced: '2つの近さを同じ重みで合成',
        helpPresetCentroid: '参照集合の重心との近さを多めに反映',
        helpPresetNeighbors: '候補に近い参照例との近さを多めに反映',
        helpPresetTop3: '最も近い3参照の平均を使用',
        helpPresetTop7: '最も近い7参照の平均を使用',
        helpLimitations: '限界',
        helpLimitCandidates: '最大200候補。評価対象は英語のみ',
        helpLimitModel: '初回などキャッシュがない場合は、外部CDNとHugging Faceから実行ファイルとモデルを取得',
        helpLimitTokens: '各候補は256 word piecesまで。超過部分は表示で知らせて比較対象から除外',
        helpLimitJudgement: '高いスコアでも、自然な英文や正しい復号であるとは限らない'
    },
    en: {
        title: 'Semantic Candidate Ranker',
        subtitle: 'Compare English plaintext candidates by similarity to built-in references',
        scopeNote: 'The ranking only helps compare the supplied candidates. It does not judge grammatical naturalness, decryption correctness, or the probability of being correct.',
        candidatesLabel: 'English plaintext candidates',
        inputHint: 'Use one block per candidate and separate blocks with a blank line. Leading key=value lines are display metadata and are excluded from scoring.',
        placeholder: 'Enter candidates separated by blank lines.\n\nExample:\nthis is the first candidate\n\nthis is the second candidate\n\nthis is the third candidate',
        presetLabel: 'Comparison preset',
        presetBalanced: 'Balanced (default)',
        presetCentroid: 'Reference centroid',
        presetNeighbors: 'Nearest references',
        presetTop3: 'Top 3 references',
        presetTop7: 'Top 7 references',
        runButton: 'Compare',
        cancelButton: 'Cancel',
        copyButton: 'Copy original candidate',
        copiedButton: 'Copied',
        showButton: 'Show full text',
        hideButton: 'Collapse',
        progressStep1: 'Loading model',
        progressStep2: 'Preparing candidates',
        progressStep3: 'Preparing references',
        progressStep4: 'Computing semantic similarity',
        progressStep5: 'Ranking candidates',
        slowWarning: 'The model download or computation is taking a while. You can cancel the operation.',
        topResultsTitle: 'Top candidates',
        allResultsTitle: 'Candidates ranked 4 and below',
        comparisonScore: 'Comparison score',
        centroidMetric: 'Proximity to reference centroid',
        referenceMetric: 'Proximity to top {k} references',
        inputLength: 'Input length',
        lengthShort: 'Short',
        lengthMedium: 'Medium',
        lengthLong: 'Long',
        lengthTruncated: 'Over limit',
        lengthUnknown: 'Unknown',
        wordPieceUsage: '{used}/{limit} word pieces used',
        wordPieceOriginal: '{total} word pieces before truncation',
        resultContextTitle: 'Conditions for this result',
        modelLabel: 'Model',
        runtimeLabel: 'Runtime library',
        referenceCountLabel: 'Built-in references',
        referenceCountValue: '{count} sentences',
        referenceVersionLabel: 'Reference-set version',
        referenceFingerprintLabel: 'Reference-set SHA-256',
        tokenLimitLabel: 'Per-candidate limit',
        tokenLimitValue: '{limit} word pieces',
        presetLabelShort: 'Preset',
        scoreNotice: 'The comparison score is this tool’s composite value for its fixed reference collection. It is not a probability, quality grade, or proof of correct decryption.',
        nearestReferencesSummary: 'Show the {count} nearest references used',
        nearestReferencesNotice: 'These sentences were used to calculate top-reference proximity (B). A similar reference does not prove that the candidate is correct or natural.',
        nearestReferenceIndex: 'Reference #{index}',
        nearestReferenceMetrics: 'cosine {cosine} / display proximity {proximity}',
        errorEmpty: 'Enter at least one candidate.',
        errorTooMany: 'The input contains {count} candidates. Only the first 200 will be processed.',
        warningShort: 'Every candidate is under 32 word pieces. Short inputs can produce small score differences, so do not rely on rank alone.',
        warningTruncated: '{count} candidate(s) exceeded {limit} word pieces. Text beyond the limit was not used for comparison.',
        errorProcessing: 'An error occurred. Check the input and connection state, then try again.',
        errorNetwork: 'The model or runtime library could not be retrieved. An internet connection is required when they are not cached.',
        infoCancelled: 'Processing was cancelled.',
        githubText: '🔗 GitHub repository: ',
        offline: 'Browser is offline',
        langToggle: '日本語',
        helpButtonLabel: 'Open instructions',
        langButtonLabel: 'Switch the interface to Japanese',
        closeButtonLabel: 'Close instructions',
        helpTitle: 'Usage and limitations',
        helpOverview: 'What this tool compares',
        helpOverviewText: 'The tool embeds each English candidate and compares it with a built-in collection of general English sentences. It is not a grammar checker, a language-model fluency evaluator, or a cipher solver.',
        helpUsage: 'Usage',
        helpUsageStep1: 'Enter English candidates separated by blank lines',
        helpUsageStep2: 'Choose a comparison preset',
        helpUsageStep3: 'Select “Compare”',
        helpUsageStep4: 'Inspect both components and the input length, then review the leading candidates yourself',
        helpMetrics: 'Displayed values',
        helpMetricCentroid: 'Reference-centroid proximity: cosine similarity to the center of all built-in references',
        helpMetricReference: 'Top-reference proximity: average cosine similarity to the k nearest references',
        helpMetricCombined: 'Comparison score: a preset-weighted composite used only for ranking',
        helpMetricEvidence: 'Candidate disclosure: the references used for B, their collection indexes, individual cosine values, and display proximities',
        helpPresets: 'Presets',
        helpPresetBalanced: 'Weights the two proximity measures equally',
        helpPresetCentroid: 'Gives more weight to proximity to the reference centroid',
        helpPresetNeighbors: 'Gives more weight to proximity to the nearest reference examples',
        helpPresetTop3: 'Averages the three nearest references',
        helpPresetTop7: 'Averages the seven nearest references',
        helpLimitations: 'Limitations',
        helpLimitCandidates: 'Up to 200 candidates; evaluation input must be English',
        helpLimitModel: 'When not cached, the runtime and model are fetched from an external CDN and Hugging Face',
        helpLimitTokens: 'Each candidate is limited to 256 word pieces; the UI reports truncation',
        helpLimitJudgement: 'A high score does not establish natural English or a correct decryption'
    }
};

let currentLang = 'ja';

export function getCurrentLang() {
    return currentLang;
}

export function setLang(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    try {
        localStorage.setItem('semantic-ranker-lang', lang);
    } catch {
        // Language switching still works when storage is unavailable.
    }
}

export function initLang() {
    try {
        const saved = localStorage.getItem('semantic-ranker-lang');
        if (saved && translations[saved]) currentLang = saved;
    } catch {
        currentLang = 'ja';
    }
}

export function t(key, params = {}) {
    let text = translations[currentLang]?.[key] ?? translations.en[key] ?? key;
    for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value));
    }
    return text;
}

export function getTranslations(lang = currentLang) {
    return translations[lang] || translations.en;
}
