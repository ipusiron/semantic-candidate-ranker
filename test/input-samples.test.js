import test from 'node:test';
import assert from 'node:assert/strict';

import { EVALUATION_CASES } from '../js/evaluation-cases.js';
import { INPUT_SAMPLES, getInputSample } from '../js/input-samples.js';
import { normalizeText, parseCandidates } from '../js/normalizer.js';

test('input samples expose three representative six-candidate sets without answer labels', () => {
    assert.deepEqual(
        INPUT_SAMPLES.map(sample => sample.id),
        ['caesar-short', 'vigenere-medium', 'columnar-long']
    );

    for (const sample of INPUT_SAMPLES) {
        const parsed = parseCandidates(sample.input);
        assert.equal(sample.candidateCount, 6);
        assert.equal(parsed.length, 6);
        assert.ok(parsed.every(candidate => candidate.meta.method && candidate.meta.setting));
        assert.doesNotMatch(sample.input, /candidate_id=|correct=|wrong=/i);
    }
});

test('sample plaintexts and settings come from the fixed evaluation cases', () => {
    for (const sample of INPUT_SAMPLES) {
        const sourceCase = EVALUATION_CASES.find(item => item.id === sample.id);
        const parsed = parseCandidates(sample.input);
        assert.ok(sourceCase);
        assert.deepEqual(
            parsed.map(candidate => candidate.evalText),
            sourceCase.candidates.map(candidate => normalizeText(candidate.text))
        );
        assert.deepEqual(parsed.map(candidate => candidate.meta.setting), sourceCase.candidates.map(candidate => candidate.setting));
    }
});

test('input sample definitions are immutable and unknown IDs return null', () => {
    assert.ok(Object.isFrozen(INPUT_SAMPLES));
    assert.ok(INPUT_SAMPLES.every(sample => Object.isFrozen(sample)));
    assert.equal(getInputSample('missing'), null);
});
