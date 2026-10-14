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
        warning: document.getElementById('messages').textContent,
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);
    if (resultState.error) throw new Error(resultState.error);

    await evaluate(`document.getElementById('langToggle').click()`);
    const english = await evaluate(`({
        lang: document.documentElement.lang,
        title: document.querySelector('h1')?.textContent,
        scoreNotice: document.getElementById('scoreNotice').textContent,
        resultPreserved: !document.getElementById('results').hidden
    })`);

    await command('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await screenshot('screenshot-en.png');
    await evaluate(`document.getElementById('langToggle').click()`);
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
    const xssAndRemaining = await evaluate(`({
        executed: globalThis.__semanticRankerXss,
        injectedImages: document.querySelectorAll('#results img').length,
        remainingVisible: !document.getElementById('allResultsBlock').hidden,
        remainingCount: document.querySelectorAll('.result-item').length,
        toggleCount: document.querySelectorAll('.toggle-btn').length,
        hasOverflow: document.documentElement.scrollWidth > innerWidth
    })`);

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
            minimumButtonHeight: Math.min(...[...document.querySelectorAll('button')]
                .filter(button => button.offsetParent !== null)
                .map(button => button.getBoundingClientRect().height))
        })`));
    }

    const relevantErrors = events.filter(event => {
        if (event.method === 'Log.entryAdded') return ['error', 'warning'].includes(event.params.entry.level);
        if (event.method === 'Runtime.exceptionThrown') return true;
        return false;
    }).map(event => event.params.entry?.text || event.params.exceptionDetails?.text || event.method);

    console.log(JSON.stringify({
        initial,
        resultState,
        english,
        truncation,
        modal,
        xssAndRemaining,
        responsive,
        relevantErrors
    }, null, 2));
} finally {
    socket?.close();
    edge.kill();
    await delay(250);
    await rm(profileDir, { recursive: true, force: true });
}
