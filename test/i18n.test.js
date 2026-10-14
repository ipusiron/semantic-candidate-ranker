import test from 'node:test';
import assert from 'node:assert/strict';

import { getCurrentLang, setLang, t, getTranslations } from '../js/i18n.js';

test('Japanese and English dictionaries have matching keys', () => {
    assert.deepEqual(
        Object.keys(getTranslations('ja')).sort(),
        Object.keys(getTranslations('en')).sort()
    );
});

test('language switch works without localStorage and interpolates all placeholders', () => {
    setLang('en');
    assert.equal(getCurrentLang(), 'en');
    assert.equal(t('wordPieceUsage', { used: 256, limit: 256 }), '256/256 word pieces used');
    setLang('ja');
    assert.equal(t('warningTruncated', { count: 2, limit: 256 }), '2件は256 word piecesを超えたため、超過部分を比較に使っていません。');
});

test('unknown language is ignored and English fallback is available', () => {
    setLang('en');
    setLang('xx');
    assert.equal(getCurrentLang(), 'en');
    assert.equal(t('missing-key'), 'missing-key');
});
