import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from '../js/normalizer.js';
import { buildPerturbedText, PERTURBATION_IDS } from '../js/perturbations.js';

const source = 'the patient analyst checked every line before sending the report.';

test('all built-in perturbations are deterministic and non-empty', () => {
    assert.equal(PERTURBATION_IDS.length, 8);
    for (const id of PERTURBATION_IDS) {
        const first = buildPerturbedText(source, id);
        assert.equal(first, buildPerturbedText(source, id));
        assert.notEqual(first.trim(), '');
    }
});

test('case and whitespace perturbations normalize to the same comparison text', () => {
    assert.equal(normalizeText(buildPerturbedText(source, 'case')), normalizeText(source));
    assert.equal(normalizeText(buildPerturbedText(source, 'whitespace')), normalizeText(source));
});

test('long extension crosses a conservative 300-word threshold', () => {
    assert.ok(buildPerturbedText(source, 'truncate').split(/\s+/).length >= 330);
});

test('unknown perturbations are rejected', () => {
    assert.throws(() => buildPerturbedText(source, 'unknown'), /Unknown perturbation/);
});

