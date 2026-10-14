/**
 * Fixed, independently versioned evaluation collection.
 *
 * Each case encrypts a tool-authored English plaintext and produces six
 * candidates by decrypting with the correct setting and five wrong settings.
 * The collection is not tuned against the ranker's output.
 */

export const EVALUATION_SET_VERSION = 'eval-en-18-v1';
// SHA-256 over UTF-8 JSON.stringify(EVALUATION_CASES), including source order.
export const EVALUATION_SET_FINGERPRINT = 'e763264a9b2d4c5ad5104f73cfbbb0e74e40c24e8e0546ee5ebab44d28756b3a';

const ALPHABET_SIZE = 26;

function mod(value, modulus = ALPHABET_SIZE) {
    return ((value % modulus) + modulus) % modulus;
}

function transformLetters(text, transform) {
    let letterIndex = 0;
    return text.toLowerCase().replace(/[a-z]/g, letter => {
        const value = letter.charCodeAt(0) - 97;
        const transformed = transform(value, letterIndex);
        letterIndex += 1;
        return String.fromCharCode(97 + mod(transformed));
    });
}

function caesarTransform(text, shift) {
    return transformLetters(text, value => value + shift);
}

function modularInverse(value) {
    for (let candidate = 1; candidate < ALPHABET_SIZE; candidate++) {
        if (mod(value * candidate) === 1) return candidate;
    }
    throw new Error(`No modular inverse for ${value}`);
}

function affineEncrypt(text, a, b) {
    return transformLetters(text, value => a * value + b);
}

function affineDecrypt(text, a, b) {
    const inverse = modularInverse(a);
    return transformLetters(text, value => inverse * (value - b));
}

function keyValues(key) {
    const values = String(key).toLowerCase().match(/[a-z]/g)?.map(letter => letter.charCodeAt(0) - 97) || [];
    if (values.length === 0) throw new Error('Cipher key must contain at least one ASCII letter');
    return values;
}

function vigenereTransform(text, key, direction) {
    const values = keyValues(key);
    return transformLetters(text, (value, index) => value + direction * values[index % values.length]);
}

function beaufortTransform(text, key) {
    const values = keyValues(key);
    return transformLetters(text, (value, index) => values[index % values.length] - value);
}

function railPattern(length, rails) {
    if (!Number.isInteger(rails) || rails < 2) throw new Error('Rails must be at least 2');
    const pattern = [];
    let rail = 0;
    let direction = 1;
    for (let index = 0; index < length; index++) {
        pattern.push(rail);
        if (rail === 0) direction = 1;
        if (rail === rails - 1) direction = -1;
        rail += direction;
    }
    return pattern;
}

function railFenceEncrypt(text, rails) {
    const pattern = railPattern(text.length, rails);
    const rows = Array.from({ length: rails }, () => []);
    for (let index = 0; index < text.length; index++) rows[pattern[index]].push(text[index]);
    return rows.flat().join('');
}

function railFenceDecrypt(text, rails) {
    const pattern = railPattern(text.length, rails);
    const counts = Array.from({ length: rails }, (_, rail) => pattern.filter(value => value === rail).length);
    const rows = [];
    let offset = 0;
    for (const count of counts) {
        rows.push(text.slice(offset, offset + count).split(''));
        offset += count;
    }
    return pattern.map(rail => rows[rail].shift()).join('');
}

function columnOrder(key) {
    return [...String(key).toLowerCase()].map((letter, index) => ({ letter, index }))
        .sort((a, b) => a.letter.localeCompare(b.letter) || a.index - b.index)
        .map(item => item.index);
}

function columnarEncrypt(text, key) {
    const width = String(key).length;
    const columns = Array.from({ length: width }, () => []);
    for (let index = 0; index < text.length; index++) columns[index % width].push(text[index]);
    return columnOrder(key).map(index => columns[index].join('')).join('');
}

function columnarDecrypt(text, key) {
    const width = String(key).length;
    const fullRows = Math.floor(text.length / width);
    const remainder = text.length % width;
    const lengths = Array.from({ length: width }, (_, index) => fullRows + (index < remainder ? 1 : 0));
    const columns = Array.from({ length: width }, () => []);
    let offset = 0;
    for (const index of columnOrder(key)) {
        columns[index] = text.slice(offset, offset + lengths[index]).split('');
        offset += lengths[index];
    }
    let plaintext = '';
    for (let row = 0; row <= fullRows; row++) {
        for (let column = 0; column < width; column++) plaintext += columns[column][row] || '';
    }
    return plaintext;
}

const plaintexts = {
    caesar: {
        short: 'the museum closes before sunset',
        medium: 'please leave the blue folder beside the window before the evening meeting begins',
        long: 'the research team checked every measurement twice before writing the final report. they kept the original notes beside the revised table so another reader could trace each correction without guessing which value had changed'
    },
    affine: {
        short: 'fresh bread arrived after lunch',
        medium: 'a patient engineer recorded each failed attempt and changed only one setting before trying again',
        long: 'during the storm the radio operator repeated every important message and wrote the time beside each copy. when the signal became weak, the team compared the separate records instead of trusting a single uncertain transmission'
    },
    vigenere: {
        short: 'meet near the old stone bridge',
        medium: 'the librarian moved the rare maps to a dry cabinet while workers repaired the leaking roof',
        long: 'after the rehearsal the musicians discussed the difficult passage in small groups. they slowed the tempo, marked the places where entries overlapped, and practiced those measures again before playing the complete movement from the beginning'
    },
    beaufort: {
        short: 'keep the lantern covered tonight',
        medium: 'our guide compared the trail signs with the printed map before the group entered the forest',
        long: 'the clinic tested its emergency plan on a quiet afternoon. staff members followed the written checklist, noted every delay, and met afterward to decide which instructions were unclear and which supplies should be moved closer'
    },
    railfence: {
        short: 'send the package on friday morning',
        medium: 'the gardener labeled every seed tray so the new plants could be identified after winter',
        long: 'before the public lecture the speaker tested the projector, opened the example files, and checked that every diagram could be read from the back row. a printed outline remained available in case the equipment stopped working'
    },
    columnar: {
        short: 'the spare key is under the clock',
        medium: 'we compared the two schedules carefully and found that only the departure time was different',
        long: 'the archive volunteers numbered each box before moving it to the new room. they photographed the labels, recorded the shelf locations, and left space in the catalog for later corrections so misplaced documents could be found again'
    }
};

function arrangeCandidates(texts, labels, correctPosition) {
    const candidates = texts.map((text, index) => ({
        id: index === 0 ? 'correct' : `wrong-${index}`,
        text,
        setting: labels[index]
    }));
    const [correct] = candidates.splice(0, 1);
    candidates.splice(correctPosition, 0, correct);
    return candidates;
}

function makeCase({ id, family, lengthGroup, correctSetting, candidateSettings, encrypt, decrypt, correctPosition }) {
    const plaintext = plaintexts[family][lengthGroup];
    const ciphertext = encrypt(plaintext, correctSetting);
    const texts = [correctSetting, ...candidateSettings].map(setting => decrypt(ciphertext, setting));
    const labels = [correctSetting, ...candidateSettings].map(setting => JSON.stringify(setting));
    return {
        id,
        family,
        lengthGroup,
        correctCandidateId: 'correct',
        sourcePlaintext: plaintext,
        candidates: arrangeCandidates(texts, labels, correctPosition)
    };
}

const definitions = [
    ...['short', 'medium', 'long'].map((lengthGroup, index) => makeCase({
        id: `caesar-${lengthGroup}`,
        family: 'caesar', lengthGroup, correctSetting: 7 + index,
        candidateSettings: [1, 3, 11, 17, 23], correctPosition: index,
        encrypt: (text, shift) => caesarTransform(text, shift),
        decrypt: (text, shift) => caesarTransform(text, -shift)
    })),
    ...['short', 'medium', 'long'].map((lengthGroup, index) => makeCase({
        id: `affine-${lengthGroup}`,
        family: 'affine', lengthGroup, correctSetting: [5, 8],
        candidateSettings: [[7, 3], [11, 6], [15, 4], [17, 9], [23, 2]], correctPosition: index + 3,
        encrypt: (text, [a, b]) => affineEncrypt(text, a, b),
        decrypt: (text, [a, b]) => affineDecrypt(text, a, b)
    })),
    ...['short', 'medium', 'long'].map((lengthGroup, index) => makeCase({
        id: `vigenere-${lengthGroup}`,
        family: 'vigenere', lengthGroup, correctSetting: 'ORANGE',
        candidateSettings: ['PLANET', 'GARDEN', 'SILVER', 'MARKET', 'BRIDGE'], correctPosition: index,
        encrypt: (text, key) => vigenereTransform(text, key, 1),
        decrypt: (text, key) => vigenereTransform(text, key, -1)
    })),
    ...['short', 'medium', 'long'].map((lengthGroup, index) => makeCase({
        id: `beaufort-${lengthGroup}`,
        family: 'beaufort', lengthGroup, correctSetting: 'COMPASS',
        candidateSettings: ['HARVEST', 'JOURNAL', 'KINGDOM', 'MORNING', 'THUNDER'], correctPosition: index + 3,
        encrypt: (text, key) => beaufortTransform(text, key),
        decrypt: (text, key) => beaufortTransform(text, key)
    })),
    ...['short', 'medium', 'long'].map((lengthGroup, index) => makeCase({
        id: `railfence-${lengthGroup}`,
        family: 'railfence', lengthGroup, correctSetting: 4,
        candidateSettings: [2, 3, 5, 6, 7], correctPosition: index,
        encrypt: (text, rails) => railFenceEncrypt(text, rails),
        decrypt: (text, rails) => railFenceDecrypt(text, rails)
    })),
    ...['short', 'medium', 'long'].map((lengthGroup, index) => makeCase({
        id: `columnar-${lengthGroup}`,
        family: 'columnar', lengthGroup, correctSetting: 'ORANGE',
        candidateSettings: ['PLANET', 'GARDEN', 'SILVER', 'MARKET', 'BRIDGE'], correctPosition: index + 3,
        encrypt: (text, key) => columnarEncrypt(text, key),
        decrypt: (text, key) => columnarDecrypt(text, key)
    }))
];

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const item of Object.values(value)) deepFreeze(item);
    }
    return value;
}

export const EVALUATION_CASES = deepFreeze(definitions);
