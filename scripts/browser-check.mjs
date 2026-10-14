import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const edgePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9330;
const profileDir = join(tmpdir(), `semantic-ranker-edge-${process.pid}`);
const pageUrl = process.argv[2] || 'http://127.0.0.1:8765/';
const outputDir = resolve(process.argv[3] || 'assets');

await mkdir(profileDir, { recursive: true });
const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    'about:blank'
], { stdio: 'ignore', windowsHide: true });

const delay = milliseconds => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));

async function waitForJson(path, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}${path}`);
            if (response.ok) return response.json();
        } catch {
            // Edge is still starting.
        }
        await delay(100);
    }
    throw new Error(`Timed out waiting for ${path}`);
}

let socket;
let commandId = 0;
const pending = new Map();
const events = [];

function command(method, params = {}) {
    return new Promise((resolveCommand, rejectCommand) => {
        const id = ++commandId;
        pending.set(id, { resolveCommand, rejectCommand });
        socket.send(JSON.stringify({ id, method, params }));
    });
}

async function evaluate(expression, awaitPromise = true) {
    const response = await command('Runtime.evaluate', {
        expression,
        awaitPromise,
        returnByValue: true,
        userGesture: true
    });
    if (response.result?.exceptionDetails) {
        throw new Error(response.result.exceptionDetails.text || 'Browser evaluation failed');
    }
    return response.result.result?.value;
}

async function waitFor(expression, timeout = 180000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await evaluate(expression)) return;
        await delay(250);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(fileName) {
    await evaluate(`scrollTo(0, 0)`);
    await delay(100);
    const dimensions = await evaluate(`({
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    })`);
    await command('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: Math.min(Math.max(dimensions.height, 800), 7000),
        deviceScaleFactor: 1,
        mobile: false
    });
    const capture = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        fromSurface: true
    });
    await writeFile(join(outputDir, fileName), Buffer.from(capture.result.data, 'base64'));
}

try {
    const pages = await waitForJson('/json');
    const page = pages.find(item => item.type === 'page');
    if (!page) throw new Error('No debuggable page');

    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolveSocket, rejectSocket) => {
        socket.addEventListener('open', resolveSocket, { once: true });
        socket.addEventListener('error', rejectSocket, { once: true });
    });
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.id && pending.has(message.id)) {
            const task = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) task.rejectCommand(new Error(message.error.message));
            else task.resolveCommand(message);
            return;
        }
        if (message.method) events.push(message);
    });

    await command('Page.enable');
    await command('Runtime.enable');
    await command('Log.enable');
    await command('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    await command('Page.navigate', { url: pageUrl });
    await waitFor(`document.readyState === 'complete'`, 30000);

    const initial = await evaluate(`({
        lang: document.documentElement.lang,
        title: document.querySelector('h1')?.textContent,
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (initial.hasOverflow) throw new Error('Initial 390px layout overflows horizontally');

    const inputSample = await evaluate(`(() => {
        document.getElementById('inputSampleCaesar').click();
        const value = document.getElementById('candidateInput').value;
        return {
            buttonCount: document.querySelectorAll('[data-input-sample]').length,
            blockCount: value.split(/\\n\\s*\\n/).length,
            hasMethod: value.includes('method=caesar'),
            hasAnswerLabel: /candidate_id=|correct=|wrong=/i.test(value),
            status: document.getElementById('messages').textContent,
            resultsHidden: document.getElementById('results').hidden,
            hasOverflow: document.documentElement.scrollWidth > innerWidth
        };
    })()`);
    if (inputSample.buttonCount !== 3 || inputSample.blockCount !== 6 || !inputSample.hasMethod ||
        inputSample.hasAnswerLabel || !inputSample.resultsHidden || inputSample.hasOverflow) {
        throw new Error('Input sample controls did not load the expected safe six-candidate set');
    }

    await evaluate(`(() => {
        const input = document.getElementById('candidateInput');
        input.value = [
            'shift=0\\nthe meeting begins at noon near the station',
            'shift=13\\ngur zrrgvat ortvaf ng abba arne gur fgngvba',
            'shift=7\\nxqzv lkjh qqqq zzzz'
        ].join('\\n\\n');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('runBtn').click();
    })()`);
    await waitFor(`!document.getElementById('results').hidden || (!document.getElementById('messages').hidden && document.getElementById('messages').classList.contains('error'))`);

    const resultState = await evaluate(`({
        error: document.getElementById('messages').classList.contains('error') ? document.getElementById('messages').textContent : '',
        resultsVisible: !document.getElementById('results').hidden,
        cards: document.querySelectorAll('.result-card').length,
        metrics: [...document.querySelectorAll('.result-card:first-child dd')].map(node => node.textContent),
        conditions: document.getElementById('resultContext').textContent,
        referenceVersionPresent: document.getElementById('resultContext').textContent.includes('en-300-v1'),
        referenceFingerprintPresent: document.getElementById('resultContext').textContent.includes('99438d5c1522c3c66cf5378ace2cc5382f632bdb95ef111fb83758a38a3a5e31'),
        disclosureCount: document.querySelectorAll('.nearest-references').length,
        warning: document.getElementById('messages').textContent,
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (resultState.error) throw new Error(resultState.error);
    if (!resultState.referenceVersionPresent || !resultState.referenceFingerprintPresent) {
        throw new Error('Reference-set version or fingerprint is missing from result conditions');
    }
    if (resultState.disclosureCount !== 3) {
        throw new Error(`Expected 3 nearest-reference disclosures, got ${resultState.disclosureCount}`);
    }

    await evaluate(`document.querySelector('.result-card .nearest-references summary').click()`);
    await waitFor(`document.querySelectorAll('.result-card:first-child .nearest-reference-item').length > 0`);
    const nearestReferences = await evaluate(`({
        count: document.querySelectorAll('.result-card:first-child .nearest-reference-item').length,
        firstIndex: document.querySelector('.result-card:first-child .nearest-reference-index')?.textContent || '',
        firstMetrics: document.querySelector('.result-card:first-child .nearest-reference-metrics')?.textContent || '',
        firstText: document.querySelector('.result-card:first-child .nearest-reference-text')?.textContent || '',
        limitation: document.querySelector('.result-card:first-child .nearest-references-notice')?.textContent || '',
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (nearestReferences.count !== 5 || !nearestReferences.firstIndex || !nearestReferences.firstText) {
        throw new Error('Nearest-reference disclosure does not contain the expected five explained matches');
    }
    if (!nearestReferences.firstMetrics.includes('cosine') || nearestReferences.hasOverflow) {
        throw new Error('Nearest-reference metrics are missing or overflow the viewport');
    }

    await evaluate(`document.getElementById('langToggle').click()`);
    const english = await evaluate(`({
        lang: document.documentElement.lang,
        title: document.querySelector('h1')?.textContent,
        scoreNotice: document.getElementById('scoreNotice').textContent,
        resultPreserved: !document.getElementById('results').hidden
    })`);
    if (english.lang !== 'en' || !english.resultPreserved) {
        throw new Error('English redraw did not preserve the result');
    }

    await evaluate(`document.querySelector('.result-card .nearest-references summary').click()`);
    await waitFor(`document.querySelectorAll('.result-card:first-child .nearest-reference-item').length > 0`);

    await command('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await screenshot('screenshot-en.png');
    await evaluate(`document.getElementById('langToggle').click()`);
    await evaluate(`document.querySelector('.result-card .nearest-references summary').click()`);
    await waitFor(`document.querySelectorAll('.result-card:first-child .nearest-reference-item').length > 0`);
    await screenshot('screenshot.png');

    await command('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    await evaluate(`(() => {
        const input = document.getElementById('candidateInput');
        input.value = Array(400).fill('encryption').join(' ') + '\\n\\nshort candidate';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('runBtn').click();
    })()`);
    await waitFor(`!document.getElementById('results').hidden || document.getElementById('messages').classList.contains('error')`);
    const truncation = await evaluate(`({
        message: document.getElementById('messages').textContent,
        length: document.querySelector('.length-truncated')?.textContent || '',
        original: document.querySelector('.token-original')?.textContent || '',
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (!truncation.original.includes('402') || truncation.hasOverflow) {
        throw new Error('Tokenizer truncation disclosure is missing or overflows');
    }

    const modal = await evaluate(`(async () => {
        document.getElementById('helpBtn').click();
        const opened = !document.getElementById('helpModal').hidden;
        const focusedOnClose = document.activeElement?.id === 'modalClose';
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return {
            opened,
            focusedOnClose,
            closed: document.getElementById('helpModal').hidden,
            focusReturned: document.activeElement?.id === 'helpBtn'
        };
    })()`);
    if (!modal.opened || !modal.focusedOnClose || !modal.closed || !modal.focusReturned) {
        throw new Error('Help dialog focus behavior failed');
    }

    await evaluate(`(() => {
        globalThis.__semanticRankerXss = 0;
        const input = document.getElementById('candidateInput');
        input.value = [
            '<img src=x onerror="globalThis.__semanticRankerXss=1">',
            'the message arrives tomorrow morning',
            'please close the door before leaving',
            'xqzv qqqq zzzz',
            'another ordinary candidate for comparison'
        ].join('\\n\\n');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('runBtn').click();
    })()`);
    await waitFor(`!document.getElementById('results').hidden || document.getElementById('messages').classList.contains('error')`);
    await evaluate(`document.querySelector('.result-card .nearest-references summary').click()`);
    await waitFor(`document.querySelectorAll('.result-card:first-child .nearest-reference-item').length > 0`);
    const xssAndRemaining = await evaluate(`({
        executed: globalThis.__semanticRankerXss,
        injectedImages: document.querySelectorAll('#results img').length,
        remainingVisible: !document.getElementById('allResultsBlock').hidden,
        remainingCount: document.querySelectorAll('.result-item').length,
        toggleCount: document.querySelectorAll('.toggle-btn').length,
        nearestCount: document.querySelectorAll('.result-card:first-child .nearest-reference-item').length,
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (xssAndRemaining.executed !== 0 || xssAndRemaining.injectedImages !== 0) {
        throw new Error('User-controlled HTML was interpreted as markup');
    }
    if (xssAndRemaining.nearestCount !== 5 || xssAndRemaining.hasOverflow) {
        throw new Error('Explained result failed after hostile input');
    }

    await evaluate(`document.getElementById('evaluationTab').click()`);
    const evaluationInitial = await evaluate(`({
        panelVisible: !document.getElementById('evaluationPanel').hidden,
        compareHidden: document.getElementById('comparePanel').hidden,
        tabSelected: document.getElementById('evaluationTab').getAttribute('aria-selected'),
        context: document.getElementById('evaluationContext').textContent,
        caseOptions: document.getElementById('evaluationCaseSelect').options.length,
        perturbationOptions: document.getElementById('perturbationTypeSelect').options.length,
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (!evaluationInitial.panelVisible || !evaluationInitial.compareHidden || evaluationInitial.tabSelected !== 'true') {
        throw new Error('Evaluation tab state is inconsistent');
    }
    if (!evaluationInitial.context.includes('eval-en-18-v1') ||
        !evaluationInitial.context.includes('e763264a9b2d4c5ad5104f73cfbbb0e74e40c24e8e0546ee5ebab44d28756b3a')) {
        throw new Error('Evaluation-set version or fingerprint is missing');
    }
    if (evaluationInitial.caseOptions !== 18 || evaluationInitial.perturbationOptions !== 8) {
        throw new Error('Evaluation or perturbation options are incomplete');
    }

    await evaluate(`document.getElementById('evaluationRunBtn').click()`);
    await waitFor(`!document.getElementById('evaluationResults').hidden || document.getElementById('evaluationMessages').classList.contains('error')`, 360000);
    const evaluation = await evaluate(`({
        error: document.getElementById('evaluationMessages').classList.contains('error')
            ? document.getElementById('evaluationMessages').textContent : '',
        metrics: [...document.querySelectorAll('#evaluationSummary .evaluation-metric-value')].map(node => node.textContent),
        presetCards: document.querySelectorAll('.preset-result-card').length,
        groupCards: document.querySelectorAll('.evaluation-group-card').length,
        caseDetails: document.querySelectorAll('.evaluation-case').length,
        notice: document.querySelector('.evaluation-dataset-notice')?.textContent || '',
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (evaluation.error) throw new Error(evaluation.error);
    if (evaluation.presetCards !== 5 || evaluation.groupCards !== 9 || evaluation.caseDetails !== 18) {
        throw new Error('Evaluation summary is incomplete');
    }
    if (!evaluation.notice.includes('一般化を保証') || evaluation.hasOverflow) {
        throw new Error('Evaluation limitation is missing or the lab overflows');
    }

    await command('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await evaluate(`document.querySelector('.evaluation-case summary').click()`);
    await screenshot('screenshot-evaluation.png');
    await evaluate(`document.getElementById('langToggle').click()`);
    const evaluationEnglish = await evaluate(`({
        lang: document.documentElement.lang,
        title: document.getElementById('evaluationTitle').textContent,
        resultPreserved: !document.getElementById('evaluationResults').hidden,
        presetCards: document.querySelectorAll('.preset-result-card').length
    })`);
    if (evaluationEnglish.lang !== 'en' || !evaluationEnglish.resultPreserved || evaluationEnglish.presetCards !== 5) {
        throw new Error('English evaluation redraw did not preserve the result');
    }
    await screenshot('screenshot-evaluation-en.png');
    await evaluate(`document.getElementById('langToggle').click()`);

    await command('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    await evaluate(`(() => {
        globalThis.__evaluationXss = 0;
        const input = document.getElementById('perturbationInput');
        input.value = '<img src=x onerror="globalThis.__evaluationXss=1"> changed candidate';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('perturbationRunBtn').click();
    })()`);
    await waitFor(`!document.getElementById('perturbationResults').hidden || document.getElementById('evaluationMessages').classList.contains('error')`, 180000);
    const perturbation = await evaluate(`({
        error: document.getElementById('evaluationMessages').classList.contains('error')
            ? document.getElementById('evaluationMessages').textContent : '',
        executed: globalThis.__evaluationXss,
        injectedImages: document.querySelectorAll('#perturbationResults img').length,
        presetCards: document.querySelectorAll('.perturbation-preset-card').length,
        changedText: document.querySelectorAll('.perturbation-text-card .evaluation-candidate-text')[1]?.textContent || '',
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (perturbation.error) throw new Error(perturbation.error);
    if (perturbation.executed !== 0 || perturbation.injectedImages !== 0 || perturbation.presetCards !== 5) {
        throw new Error('Perturbation result is incomplete or interpreted user HTML');
    }
    if (!perturbation.changedText.includes('<img') || perturbation.hasOverflow) {
        throw new Error('Perturbation text is missing or overflows');
    }

    const responsive = [];
    for (const width of [320, 390, 600, 1280]) {
        await command('Emulation.setDeviceMetricsOverride', {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: width < 600
        });
        await delay(100);
        responsive.push(await evaluate(`({
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            overflow: document.documentElement.scrollWidth > innerWidth,
            minimumButtonHeight: Math.min(...[...document.querySelectorAll('button, summary, select')]
                .filter(control => control.offsetParent !== null)
                .map(control => control.getBoundingClientRect().height))
        })`));
    }

    const relevantErrors = events.filter(event => {
        if (event.method === 'Log.entryAdded') return ['error', 'warning'].includes(event.params.entry.level);
        if (event.method === 'Runtime.exceptionThrown') return true;
        return false;
    }).map(event => event.params.entry?.text || event.params.exceptionDetails?.text || event.method);
    if (responsive.some(item => item.overflow || item.minimumButtonHeight < 44)) {
        throw new Error('A responsive viewport overflowed or exposed a control shorter than 44px');
    }
    if (relevantErrors.length > 0) {
        throw new Error(`Browser warnings or errors: ${relevantErrors.join(' | ')}`);
    }

    console.log(JSON.stringify({
        initial,
        inputSample,
        resultState,
        nearestReferences,
        english,
        truncation,
        modal,
        xssAndRemaining,
        evaluationInitial,
        evaluation,
        evaluationEnglish,
        perturbation,
        responsive,
        relevantErrors
    }, null, 2));
} finally {
    socket?.close();
    edge.kill();
    await delay(250);
    await rm(profileDir, { recursive: true, force: true });
}
