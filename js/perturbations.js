/** Deterministic perturbations for the evaluation lab. */

export const PERTURBATION_IDS = Object.freeze([
    'case', 'whitespace', 'punctuation', 'typo', 'deleteWord', 'wordOrder', 'append', 'truncate'
]);

function replaceMiddleWord(text, replacement) {
    const words = text.split(/\s+/);
    const index = Math.floor(words.length / 2);
    words[index] = replacement(words[index], index, words);
    return words.filter(Boolean).join(' ');
}

export function buildPerturbedText(text, perturbationId) {
    const source = String(text || '').trim();
    switch (perturbationId) {
    case 'case':
        return source.split('').map((character, index) =>
            /[a-z]/i.test(character) && index % 2 === 0 ? character.toUpperCase() : character.toLowerCase()
        ).join('');
    case 'whitespace':
        return `  ${source.replace(/ /g, '   \n  ')}  `;
    case 'punctuation':
        return source.replace(/\./g, '!').replace(/,/g, ';').replace(/\s+/g, ' — ');
    case 'typo':
        return replaceMiddleWord(source, word => {
            if (word.length < 2) return `${word}x`;
            const middle = Math.floor(word.length / 2);
            const replacement = word[middle].toLowerCase() === 'x' ? 'q' : 'x';
            return `${word.slice(0, middle)}${replacement}${word.slice(middle + 1)}`;
        });
    case 'deleteWord':
        return replaceMiddleWord(source, () => '');
    case 'wordOrder': {
        const words = source.split(/\s+/);
        const start = Math.max(0, Math.floor(words.length / 2) - 2);
        words.splice(start, 4, ...words.slice(start, start + 4).reverse());
        return words.join(' ');
    }
    case 'append':
        return `${source} the weather report mentions clear skies over the northern coast.`;
    case 'truncate': {
        const addition = ' unrelated background details continue without changing the original message or its intended meaning.';
        let result = source;
        while (result.split(/\s+/).length < 330) result += addition;
        return result;
    }
    default:
        throw new Error(`Unknown perturbation: ${perturbationId}`);
    }
}

