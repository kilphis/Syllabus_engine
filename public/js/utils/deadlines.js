// 課題の提出期限ルール（講義ごとに保存）
export const DEADLINE_RULES = {
    midnight: '日付が変わる前',
    nextclass: '次の講義開始前',
    irregular: '課題はあるけど不定期',
    none: '課題がない'
};
export const DEFAULT_RULE = 'midnight';

const STORAGE_KEY = 'assignmentDeadlines';

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

let deadlines = load();

// compositeKey = `${dept}_${id}`
export function getDeadlineRule(compositeKey) {
    return deadlines[compositeKey] || DEFAULT_RULE;
}

export function setDeadlineRule(compositeKey, rule) {
    if (!DEADLINE_RULES[rule]) return;
    deadlines[compositeKey] = rule;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
    } catch (e) {
        console.error('Failed to save deadline setting:', e);
    }
}
