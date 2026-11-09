// アンケート表示の状態管理。回答済み・閉じた回数・開いた回数を localStorage に保存する。
const STORAGE_KEY = 'surveyState';
const SESSION_COUNTED_KEY = 'surveyVisitCounted';
const SESSION_SHOWN_KEY = 'surveyShown';

export const FIRST_AT_VISIT = 5;      // 何回目に開いたときに初めて出すか
export const REMIND_AFTER_VISITS = 20; // 「今回は閉じる」のあと、何回開いたら再表示するか（1回だけ）
export const SHOW_DELAY_MS = 8000;     // 開いてから出すまでの待ち時間

const DEFAULT_STATE = { visits: 0, dismissals: 0, lastDismissVisit: 0, done: false };

export function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return saved && typeof saved === 'object' ? { ...DEFAULT_STATE, ...saved } : { ...DEFAULT_STATE };
    } catch (e) {
        return { ...DEFAULT_STATE };
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save survey state:', e);
    }
}

function sessionFlag(key, value) {
    try {
        if (value === undefined) return sessionStorage.getItem(key) === '1';
        sessionStorage.setItem(key, value ? '1' : '0');
    } catch (e) {
        return false;
    }
}

// アプリを開いた回数を数える。リロードを繰り返しても、同じブラウザセッション中は1回と数える
export function registerVisit() {
    if (sessionFlag(SESSION_COUNTED_KEY)) return;
    sessionFlag(SESSION_COUNTED_KEY, true);
    const state = loadState();
    state.visits += 1;
    saveState(state);
}

// いま出すべきか（このセッションで既に出していれば出さない）
export function isDue() {
    if (sessionFlag(SESSION_SHOWN_KEY)) return false;
    const s = loadState();
    if (s.done) return false;
    if (s.dismissals === 0) return s.visits >= FIRST_AT_VISIT;
    if (s.dismissals === 1) return s.visits - s.lastDismissVisit >= REMIND_AFTER_VISITS;
    return false;
}

export function markShown() {
    sessionFlag(SESSION_SHOWN_KEY, true);
}

// 回答した／回答ページを開いた: 二度と出さない
export function markDone() {
    const state = loadState();
    state.done = true;
    saveState(state);
}

// 「今回は閉じる」: 1回目は後日もう一度、2回目で終わり
export function dismiss() {
    const state = loadState();
    state.dismissals += 1;
    state.lastDismissVisit = state.visits;
    if (state.dismissals >= 2) state.done = true;
    saveState(state);
}
