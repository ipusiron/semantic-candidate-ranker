import test from 'node:test';
import assert from 'node:assert/strict';
import {
    compareCaseResults,
    evaluatePreparedCases,
    summarizeCaseResults,
    summarizeGroups
} from '../js/evaluator.js';

const refs = [new Float32Array([1, 0]), new Float32Array([0, 1])];
const centroid = new Float32Array([Math.SQRT1_2, Math.SQRT1_2]);
const presets = { balanced: { wA: 0.5, wB: 0.5, k: 1 } };

function prepared(embeddings) {
    return embeddings.map((embedding, index) => ({
        text: `candidate ${index}`,
        embedding: new Float32Array(embedding),
        tokenCount: 4,
        usedTokenCount: 4,
        truncated: false
    }));
}

test('evaluatePreparedCases ranks the labeled candidate without using its array position as a score', () => {
    const cases = [{
        id: 'case-1', family: 'caesar', lengthGroup: 'short', correctCandidateId: 'correct',
        candidates: [{ id: 'wrong' }, { id: 'correct' }]
    }];
    const result = evaluatePreparedCases(
        cases,
        [prepared([[-1, 0], [1, 0]])],
        centroid,
        refs,
        ['east', 'north'],
        presets
    ).balanced;
    assert.equal(result.summary.caseCount, 1);
    assert.equal(result.summary.top1Count, 1);
    assert.equal(result.cases[0].correctRank, 1);
    assert.equal(result.cases[0].correctResult.originalIndex, 1);
});

test('summary metrics and groups use exact observed ranks', () => {
    const cases = [
        { correctRank: 1, family: 'a' },
        { correctRank: 2, family: 'a' },
        { correctRank: 4, family: 'b' },
        { correctRank: 6, family: 'b' }
    ];
    assert.deepEqual(summarizeCaseResults(cases), {
        caseCount: 4,
        top1Count: 1,
        top3Count: 2,
        mrr: (1 + 0.5 + 0.25 + (1 / 6)) / 4,
        medianRank: 3
    });
    const groups = summarizeGroups(cases, 'family');
    assert.equal(groups.length, 2);
    assert.equal(groups[0].top3Count, 2);
    assert.equal(groups[1].top3Count, 0);
});

test('perturbation comparison reports rank, component, and neighbor changes', () => {
    const before = {
        caseId: 'same', correctRank: 1,
        correctResult: {
            score: 0.8, centroidScore: 0.7, referenceScore: 0.9,
            nearestReferences: [{ referenceIndex: 1 }, { referenceIndex: 2 }, { referenceIndex: 3 }]
        }
    };
    const after = {
        caseId: 'same', correctRank: 3,
        correctResult: {
            score: 0.7, centroidScore: 0.65, referenceScore: 0.75,
            nearestReferences: [{ referenceIndex: 2 }, { referenceIndex: 4 }, { referenceIndex: 5 }]
        }
    };
    assert.deepEqual(compareCaseResults(before, after), {
        rankDelta: 2,
        scoreDelta: -0.10000000000000009,
        centroidDelta: -0.04999999999999993,
        referenceDelta: -0.15000000000000002,
        nearestChanged: 2
    });
});
