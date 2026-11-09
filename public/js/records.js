// 講義ごとの出席記録とメモ。時間割とは別の localStorage キーに保存する。
// 出席の変更は store の Undo 履歴に載せ、メモは入力のたびに自動保存する（再描画はしない）。
import { notifyChange, pushUndo } from './store.js';
import { requestPersistentStorage } from './utils/storage.js';

const STORAGE_KEY = 'lectureRecords';
const MEMO_SAVE_DELAY_MS = 400;

export const STATUS_LABELS = { present: '出席', late: '遅刻' };

// { [lectureKey]: { attendance: [{ date: 'YYYY-MM-DD', status }], memo: '' } }
let records = load();

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return saved && typeof saved === 'object' ? saved : {};
    } catch (e) {
        console.error("Failed to load records:", e);
        return {};
    }
}

function persist() {
    // 空になった講義の記録は残さない
    Object.keys(records).forEach(key => {
        const r = records[key];
        if (r.attendance.length === 0 && !r.memo) delete records[key];
    });
    if (Object.keys(records).length > 0) requestPersistentStorage();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
        console.error("Failed to save records:", e);
        alert("記録の保存に失敗しました。ローカルストレージの容量が一杯か、無効化されている可能性があります。");
    }
}

// バックアップ用: 全記録の取得と、検証済みデータでの置き換え
export const getAllRecords = () => JSON.parse(JSON.stringify(records));

export function replaceRecords(data) {
    clearTimeout(memoTimer);
    memoTimer = null;
    records = JSON.parse(JSON.stringify(data));
    persist();
    notifyChange();
}

const pad = (n) => String(n).padStart(2, '0');

export function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ensure = (key) => (records[key] ??= { attendance: [], memo: '' });

export function getRecord(key) {
    return records[key] ?? { attendance: [], memo: '' };
}

export function attendanceCounts(key) {
    const counts = { present: 0, late: 0 };
    getRecord(key).attendance.forEach(a => { counts[a.status] += 1; });
    return counts;
}

// 出席ログを変更する共通処理。変更前を Undo 履歴に控えてから保存・通知する
function changeAttendance(key, mutate) {
    const rec = ensure(key);
    const before = rec.attendance.map(a => ({ ...a }));
    mutate(rec.attendance);
    rec.attendance.sort((a, b) => a.date.localeCompare(b.date));
    pushUndo(() => {
        ensure(key).attendance = before;
        persist();
    });
    persist();
    notifyChange();
}

const toggledStatus = (status) => (status === 'present' ? 'late' : 'present');

// 今日の記録がなければ「出席」で追加し、あれば 出席⇄遅刻 を切り替える
export function markToday(key) {
    const today = todayString();
    changeAttendance(key, (list) => {
        const entry = list.find(a => a.date === today);
        if (entry) entry.status = toggledStatus(entry.status);
        else list.push({ date: today, status: 'present' });
    });
}

export function cycleAttendance(key, date) {
    changeAttendance(key, (list) => {
        const entry = list.find(a => a.date === date);
        if (entry) entry.status = toggledStatus(entry.status);
    });
}

export function removeAttendance(key, date) {
    changeAttendance(key, (list) => {
        const idx = list.findIndex(a => a.date === date);
        if (idx > -1) list.splice(idx, 1);
    });
}

// --- メモ: 入力は即メモリに反映し、保存は少し待ってまとめて行う ---

let memoTimer = null;

export function setMemo(key, text) {
    ensure(key).memo = text;
    clearTimeout(memoTimer);
    memoTimer = setTimeout(persist, MEMO_SAVE_DELAY_MS);
}

export function flushRecords() {
    if (memoTimer === null) return;
    clearTimeout(memoTimer);
    memoTimer = null;
    persist();
}

window.addEventListener('pagehide', flushRecords);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushRecords();
});

// ブラウザの保存領域の使用量（UTF-16 換算の概算バイト数）
export function storageUsageBytes() {
    let chars = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            chars += k.length + (localStorage.getItem(k) ?? '').length;
        }
    } catch (e) {
        return 0;
    }
    return chars * 2;
}
