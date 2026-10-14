import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    EVALUATION_CASES,
    EVALUATION_SET_VERSION,
    EVALUATION_SET_FINGERPRINT
} from '../js/evaluation-cases.js';
import { REFERENCE_SENTENCES } from '../js/reference-sentences.js';

test('evaluation set has six cipher families, three length groups, and balanced correct positions', () => {
    assert.equal(EVALUATION_CASES.length, 18);
    const families = new Map();
    const lengths = new Map();
    const positions = Array(6).fill(0);
    for (const item of EVALUATION_CASES) {
        assert.equal(item.candidates.length, 6);
        assert.equal(new Set(item.candidates.map(candidate => candidate.text)).size, 6);
        const correctIndex = item.candidates.findIndex(candidate => candidate.id === item.correctCandidateId);
        assert.notEqual(correctIndex, -1);
        assert.equal(item.candidates[correctIndex].text, item.sourcePlaintext);
        positions[correctIndex] += 1;
        families.set(item.family, (families.get(item.family) || 0) + 1);
        lengths.set(item.lengthGroup, (lengths.get(item.lengthGroup) || 0) + 1);
    }
    assert.equal(families.size, 6);
    assert.deepEqual([...families.values()], Array(6).fill(3));
    assert.deepEqual(Object.fromEntries(lengths), { short: 6, medium: 6, long: 6 });
    assert.deepEqual(positions, Array(6).fill(3));
});

test('evaluation plaintexts are separate from the fixed reference collection', () => {
    const references = new Set(REFERENCE_SENTENCES.en);
    for (const item of EVALUATION_CASES) assert.equal(references.has(item.sourcePlaintext), false);
});

test('evaluation version and SHA-256 identify the exact ordered collection', () => {
    const actual = createHash('sha256').update(JSON.stringify(EVALUATION_CASES), 'utf8').digest('hex');
    assert.equal(EVALUATION_SET_VERSION, 'eval-en-18-v1');
    assert.equal(actual, EVALUATION_SET_FINGERPRINT);
    assert.match(EVALUATION_SET_FINGERPRINT, /^[a-f0-9]{64}$/);
});

test('evaluation cases are deeply immutable', () => {
    assert.equal(Object.isFrozen(EVALUATION_CASES), true);
    assert.equal(Object.isFrozen(EVALUATION_CASES[0]), true);
    assert.equal(Object.isFrozen(EVALUATION_CASES[0].candidates), true);
    assert.equal(Object.isFrozen(EVALUATION_CASES[0].candidates[0]), true);
});

