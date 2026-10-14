import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
    REFERENCE_SENTENCES,
    REFERENCE_SET_VERSION,
    REFERENCE_SET_FINGERPRINT,
    getReferenceSentences
} from '../js/reference-sentences.js';

test('reference-set version and SHA-256 identify the exact ordered English collection', () => {
    const references = getReferenceSentences('en');
    const fingerprint = createHash('sha256')
        .update(JSON.stringify(references), 'utf8')
        .digest('hex');

    assert.equal(REFERENCE_SET_VERSION, 'en-300-v1');
    assert.match(REFERENCE_SET_FINGERPRINT, /^[a-f0-9]{64}$/);
    assert.equal(fingerprint, REFERENCE_SET_FINGERPRINT);
});

test('reference collections are immutable at runtime', () => {
    assert.ok(Object.isFrozen(REFERENCE_SENTENCES));
    assert.ok(Object.isFrozen(REFERENCE_SENTENCES.en));
    assert.ok(Object.isFrozen(REFERENCE_SENTENCES.ja));
    assert.throws(() => REFERENCE_SENTENCES.en.push('unexpected mutation'), TypeError);
});
