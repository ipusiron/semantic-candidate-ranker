import test from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizeText,
    parseCandidateBlock,
    parseCandidates,
    validateCandidates
} from '../js/normalizer.js';

test('normalizeText lowercases and collapses whitespace while preserving apostrophes', () => {
    assert.equal(normalizeText("  I'LL\r\n  BE   THERE  "), "i'll be there");
});

test('parseCandidateBlock extracts only leading metadata', () => {
    const parsed = parseCandidateBlock('shift=13\nbranch=B2\nHello World\nscore=inside');
    assert.deepEqual(parsed.meta, { shift: '13', branch: 'B2' });
    assert.equal(parsed.evalText, 'hello world score=inside');
    assert.equal(parsed.rawText, 'shift=13\nbranch=B2\nHello World\nscore=inside');
});

test('parseCandidateBlock keeps the first duplicate metadata value and drops metadata-only blocks', () => {
    assert.deepEqual(parseCandidateBlock('key=first\nkey=second\nText').meta, { key: 'first' });
    assert.equal(parseCandidateBlock('key=value'), null);
});

test('parseCandidates separates blocks and caps processing at 200', () => {
    const input = Array.from({ length: 205 }, (_, index) => `candidate ${index}`).join('\n\n');
    const candidates = parseCandidates(input);
    assert.equal(candidates.length, 200);
    const validation = validateCandidates(candidates, input);
    assert.deepEqual(validation, {
        valid: true,
        warnings: [{ code: 'errorTooMany', params: { count: 205 } }]
    });
});

test('validateCandidates rejects empty input with a stable message key', () => {
    assert.deepEqual(validateCandidates([], ''), {
        valid: false,
        warnings: [{ code: 'errorEmpty' }]
    });
});
