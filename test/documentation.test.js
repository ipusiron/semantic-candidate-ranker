import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

import { getReferenceSentences } from '../js/reference-sentences.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('the fixed English reference collection contains exactly 300 non-empty sentences', () => {
    const references = getReferenceSentences('en');
    assert.equal(references.length, 300);
    assert.ok(references.every(sentence => typeof sentence === 'string' && sentence.trim().length > 0));
});

test('Japanese and English READMEs agree on critical numeric contracts and links', async () => {
    const [ja, en] = await Promise.all([read('README.md'), read('README.en.md')]);
    for (const expected of ['300', '256', '3.5.2', 'https://ipusiron.github.io/semantic-candidate-ranker/']) {
        assert.ok(ja.includes(expected), `Japanese README lacks ${expected}`);
        assert.ok(en.includes(expected), `English README lacks ${expected}`);
    }
    assert.match(ja, /\[English README\]\(README\.en\.md\)/);
    assert.match(en, /\[日本語版README\]\(README\.md\)/);
});

test('documentation does not claim calibrated labels, confidence, or guaranteed offline use', async () => {
    const paths = ['README.md', 'README.en.md', 'docs/SPEC.md', 'docs/ALGORITHM.md'];
    const combined = (await Promise.all(paths.map(read))).join('\n');
    assert.doesNotMatch(combined, /Confidence（信頼度）表示/);
    assert.doesNotMatch(combined, /Excellent:\s*>=\s*0\.85/);
    assert.doesNotMatch(combined, /2回目以降[^\n]*完全オフライン/);
    assert.doesNotMatch(combined, /Subsequent runs[^\n]*fully offline/i);
});

test('all local README links used for screenshots and language navigation exist', async () => {
    for (const path of ['README.md', 'README.en.md', 'assets/screenshot.png', 'assets/screenshot-en.png']) {
        await access(new URL(path, root));
    }
});
