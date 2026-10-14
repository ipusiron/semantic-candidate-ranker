/**
 * Ready-to-use candidate sets for the normal comparison view.
 *
 * Samples reuse three cases from the independently versioned evaluation set,
 * but omit the correct/wrong labels. They are examples for operating the UI,
 * not answer keys or performance claims.
 */

import { EVALUATION_CASES } from './evaluation-cases.js';

const sampleDefinitions = [
    { id: 'caesar-short', caseId: 'caesar-short' },
    { id: 'vigenere-medium', caseId: 'vigenere-medium' },
    { id: 'columnar-long', caseId: 'columnar-long' }
];

function serializeCase(caseDefinition) {
    return caseDefinition.candidates.map(candidate => [
        `method=${caseDefinition.family}`,
        `setting=${candidate.setting}`,
        candidate.text
    ].join('\n')).join('\n\n');
}

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const item of Object.values(value)) deepFreeze(item);
    }
    return value;
}

export const INPUT_SAMPLES = deepFreeze(sampleDefinitions.map(definition => {
    const caseDefinition = EVALUATION_CASES.find(item => item.id === definition.caseId);
    if (!caseDefinition) throw new Error(`Unknown input sample case: ${definition.caseId}`);
    return {
        id: definition.id,
        candidateCount: caseDefinition.candidates.length,
        input: serializeCase(caseDefinition)
    };
}));

export function getInputSample(sampleId) {
    return INPUT_SAMPLES.find(sample => sample.id === sampleId) || null;
}
