import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('HTML declares responsive bilingual controls and accurate preset values', async () => {
    const html = await read('index.html');
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/);
    assert.match(html, /id="langToggle"/);
    for (const value of ['balanced', 'centroid', 'neighbors', 'top3', 'top7']) {
        assert.match(html, new RegExp(`value="${value}"`));
    }
    for (const sampleId of ['caesar-short', 'vigenere-medium', 'columnar-long']) {
        assert.match(html, new RegExp(`data-input-sample="${sampleId}"`));
    }
    assert.doesNotMatch(html, /http-equiv="X-Content-Type-Options"/i);
});

test('HTML exposes two associated tab panels and the complete evaluation controls', async () => {
    const html = await read('index.html');
    assert.match(html, /id="compareTab"[^>]*role="tab"[^>]*aria-controls="comparePanel"/);
    assert.match(html, /id="evaluationTab"[^>]*role="tab"[^>]*aria-controls="evaluationPanel"/);
    assert.match(html, /id="comparePanel"[^>]*role="tabpanel"[^>]*aria-labelledby="compareTab"/);
    assert.match(html, /id="evaluationPanel"[^>]*role="tabpanel"[^>]*aria-labelledby="evaluationTab"/);
    for (const id of [
        'evaluationRunBtn',
        'evaluationSummary',
        'presetComparison',
        'groupResults',
        'caseResults',
        'evaluationCaseSelect',
        'perturbationTypeSelect',
        'perturbationInput',
        'perturbationRunBtn',
        'perturbationResults'
    ]) {
        assert.match(html, new RegExp(`id="${id}"`));
    }
});

test('CSP is constrained to required model origins without unsafe inline script', async () => {
    const html = await read('index.html');
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /object-src 'none'/);
    assert.match(html, /frame-src 'none'/);
    assert.doesNotMatch(html, /script-src[^;]*'unsafe-inline'/);
    assert.doesNotMatch(html, /script-src[^;]*'unsafe-eval'/);
});

test('UI does not assign innerHTML or use document.write/eval', async () => {
    const ui = await read('js/ui.js');
    assert.doesNotMatch(ui, /\.innerHTML\s*=/);
    assert.doesNotMatch(ui, /document\.write\s*\(/);
    assert.doesNotMatch(ui, /\beval\s*\(/);
    assert.match(ui, /makeElement\('details', 'nearest-references'\)/);
    assert.match(ui, /reference\.text \|\| ''/);
    assert.match(ui, /makeElement\('p', 'evaluation-candidate-text'/);
});
