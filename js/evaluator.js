/** Pure aggregation for the fixed evaluation lab. */

import { PRESETS, rankCandidates } from './scorer.js';

export function summarizeCaseResults(caseResults) {
    if (!Array.isArray(caseResults) || caseResults.length === 0) {
        throw new Error('At least one evaluated case is required');
    }
    const ranks = caseResults.map(result => result.correctRank);
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    const middle = Math.floor(sortedRanks.length / 2);
    const medianRank = sortedRanks.length % 2
        ? sortedRanks[middle]
        : (sortedRanks[middle - 1] + sortedRanks[middle]) / 2;
    return {
        caseCount: caseResults.length,
        top1Count: ranks.filter(rank => rank === 1).length,
        top3Count: ranks.filter(rank => rank <= 3).length,
        mrr: ranks.reduce((sum, rank) => sum + (1 / rank), 0) / ranks.length,
        medianRank
    };
}

export function evaluatePreparedCases(
    cases,
    preparedByCase,
    centroid,
    referenceEmbeddings,
    referenceTexts,
    presets = PRESETS
) {
    if (cases.length !== preparedByCase.length) {
        throw new Error('Evaluation cases and prepared candidates must have the same length');
    }
    const presetResults = {};
    for (const [presetName, preset] of Object.entries(presets)) {
        const caseResults = cases.map((caseDefinition, caseIndex) => {
            const ranked = rankCandidates(
                preparedByCase[caseIndex],
                centroid,
                referenceEmbeddings,
                preset,
                referenceTexts
            );
            const correctOriginalIndex = caseDefinition.candidates.findIndex(
                candidate => candidate.id === caseDefinition.correctCandidateId
            );
            const correctResult = ranked.find(result => result.originalIndex === correctOriginalIndex);
            const winner = ranked[0];
            if (!correctResult || !winner) throw new Error(`Incomplete result for ${caseDefinition.id}`);
            return {
                caseId: caseDefinition.id,
                family: caseDefinition.family,
                lengthGroup: caseDefinition.lengthGroup,
                correctRank: correctResult.rank,
                scoreGap: winner.score - correctResult.score,
                correctResult,
                winner,
                ranked
            };
        });
        presetResults[presetName] = {
            presetName,
            summary: summarizeCaseResults(caseResults),
            cases: caseResults
        };
    }
    return presetResults;
}

export function summarizeGroups(caseResults, groupKey) {
    const groups = new Map();
    for (const result of caseResults) {
        const key = result[groupKey];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(result);
    }
    return [...groups.entries()].map(([key, results]) => ({
        key,
        ...summarizeCaseResults(results)
    }));
}

export function compareCaseResults(before, after) {
    if (!before || !after || before.caseId !== after.caseId) {
        throw new Error('Perturbation comparison requires the same case');
    }
    const beforeIndexes = before.correctResult.nearestReferences.map(item => item.referenceIndex);
    const afterIndexes = new Set(after.correctResult.nearestReferences.map(item => item.referenceIndex));
    const retained = beforeIndexes.filter(index => afterIndexes.has(index)).length;
    return {
        rankDelta: after.correctRank - before.correctRank,
        scoreDelta: after.correctResult.score - before.correctResult.score,
        centroidDelta: after.correctResult.centroidScore - before.correctResult.centroidScore,
        referenceDelta: after.correctResult.referenceScore - before.correctResult.referenceScore,
        nearestChanged: Math.max(beforeIndexes.length, afterIndexes.size) - retained
    };
}

