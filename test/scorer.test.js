import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PRESETS,
    cosineSimilarity,
    l2Normalize,
    computeCentroid,
    scoreCandidate,
    scoreCandidateDetails,
    rankCandidates,
    getLengthBand
} from '../js/scorer.js';

const closeTo = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
};

test('cosineSimilarity rejects mismatched dimensions', () => {
    assert.throws(() => cosineSimilarity([1], [1, 0]), /same dimensions/);
});

test('l2Normalize and computeCentroid return unit vectors', () => {
    const normalized = l2Normalize(new Float32Array([3, 4]));
    closeTo(normalized[0], 0.6);
    closeTo(normalized[1], 0.8);
    const centroid = computeCentroid([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    closeTo(centroid[0], Math.SQRT1_2);
    closeTo(centroid[1], Math.SQRT1_2);
});

test('scoreCandidateDetails exposes both normalized proximity components', () => {
    const details = scoreCandidateDetails(
        new Float32Array([1, 0]),
        new Float32Array([1, 0]),
        [new Float32Array([1, 0]), new Float32Array([0, 1])],
        { wA: 0.5, wB: 0.5, k: 2 }
    );
    closeTo(details.centroidScore, 1);
    closeTo(details.referenceScore, 0.75);
    closeTo(details.score, 0.875);
    closeTo(scoreCandidate(
        new Float32Array([1, 0]),
        new Float32Array([1, 0]),
        [new Float32Array([1, 0]), new Float32Array([0, 1])],
        { wA: 0.5, wB: 0.5, k: 2 }
    ), 0.875);
});

test('invalid preset and empty references are rejected', () => {
    const vector = new Float32Array([1, 0]);
    assert.throws(() => scoreCandidateDetails(vector, vector, [vector], { wA: 0.8, wB: 0.8, k: 1 }), /sum to 1/);
    assert.throws(() => scoreCandidateDetails(vector, vector, [], { wA: 0.5, wB: 0.5, k: 1 }), /references cannot be empty/);
});

test('rankCandidates preserves source order for ties and carries token metadata', () => {
    const vector = new Float32Array([1, 0]);
    const ranked = rankCandidates([
        { text: 'first', rawText: 'first', meta: {}, embedding: vector, tokenCount: 12, usedTokenCount: 12, truncated: false },
        { text: 'second', rawText: 'second', meta: {}, embedding: vector, tokenCount: 300, usedTokenCount: 256, truncated: true }
    ], vector, [vector], PRESETS.balanced);
    assert.deepEqual(ranked.map(result => result.text), ['first', 'second']);
    assert.equal(ranked[0].lengthBand, 'short');
    assert.equal(ranked[1].lengthBand, 'truncated');
    assert.equal(ranked[1].usedTokenCount, 256);
});

test('getLengthBand describes size rather than confidence', () => {
    assert.equal(getLengthBand(null), 'unknown');
    assert.equal(getLengthBand(31), 'short');
    assert.equal(getLengthBand(32), 'medium');
    assert.equal(getLengthBand(128), 'medium');
    assert.equal(getLengthBand(129), 'long');
    assert.equal(getLengthBand(257, true), 'truncated');
});
