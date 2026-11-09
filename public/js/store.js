// 単一の状態管理（Observer パターン）。
// 状態の変更は必ずここの action 経由で行い、変更後に subscribe 済みの描画関数が呼ばれる。

const STORAGE_KEY = 'myTimetableData';
const LEGACY_KEY = 'myTimetable';
const FILTERS_KEY = 'searchFilters';
const SHARED_PLAN = '共有';

export let timetableData = {
    plans: { "案1": [], "案2": [], "案3": [] },
    planOrder: ["案1", "案2", "案3"],
    currentPlan: "案1"
};

export let allLectures = [];
export const activeTerms = ['T1']; // Default: T1 selected
export let isStrictMode = false;

// --- Observer ---

const listeners = new Set();

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify() {
    listeners.forEach(fn => fn());
}

// --- Selectors ---

export const lectureKey = (lecture) => `${lecture.dept}_${lecture.id}`;

export function currentSelectedIds() {
    return timetableData.plans[timetableData.currentPlan] ?? [];
}

export function selectedLectures() {
    const ids = new Set(currentSelectedIds());
    return allLectures.filter(l => ids.has(lectureKey(l)));
}

// 表示用のプラン一覧（「共有」は存在する／選択中のときだけ末尾に出す）
export function planNames() {
    const names = [...timetableData.planOrder];
    const hasShared = timetableData.plans[SHARED_PLAN] || timetableData.currentPlan === SHARED_PLAN;
    if (hasShared && !names.includes(SHARED_PLAN)) names.push(SHARED_PLAN);
    return names;
}

export const isSharedPlan = (name) => name === SHARED_PLAN;

// --- Persistence ---

// 検索条件（期間・厳密モード・フォーム値）の保存と復元
let savedForm = {};

function persistFilters() {
    try {
        localStorage.setItem(FILTERS_KEY, JSON.stringify({
            terms: activeTerms, strict: isStrictMode, form: savedForm
        }));
    } catch (e) {
        console.error("Failed to save search filters:", e);
    }
}

function restoreFilters() {
    try {
        const saved = JSON.parse(localStorage.getItem(FILTERS_KEY));
        if (!saved) return;
        if (Array.isArray(saved.terms)) activeTerms.splice(0, activeTerms.length, ...saved.terms);
        isStrictMode = saved.strict === true;
        if (saved.form && typeof saved.form === 'object') savedForm = saved.form;
    } catch (e) {
        console.error("Failed to restore search filters:", e);
    }
}

export const getSavedForm = () => savedForm;

export function saveForm(form) {
    savedForm = form;
    persistFilters();
}

export function initStore() {
    restoreFilters();
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            timetableData = JSON.parse(saved);
            // 旧データに planOrder がない場合は補完
            if (!timetableData.planOrder) {
                timetableData.planOrder = Object.keys(timetableData.plans).filter(k => k !== SHARED_PLAN);
            }
            return;
        }
        // Migrate old data if exists
        const oldData = localStorage.getItem(LEGACY_KEY);
        if (oldData) {
            timetableData.plans["案1"] = JSON.parse(oldData);
            localStorage.removeItem(LEGACY_KEY);
        }
    } catch (e) {
        console.error("Failed to restore saved data:", e);
    }
    persist();
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timetableData));
    } catch (e) {
        console.error("Failed to save data to localStorage:", e);
        alert("データの保存に失敗しました。ローカルストレージの容量が一杯か、無効化されている可能性があります。");
    }
}

// 変更を保存してから購読者へ通知する
function commit() {
    persist();
    notify();
}

// --- Actions ---

export function setLectures(lectures) {
    allLectures = lectures;
    notify();
}

export function toggleLecture(key) {
    const name = timetableData.currentPlan;
    const ids = currentSelectedIds();
    timetableData.plans[name] = ids.includes(key) ? ids.filter(k => k !== key) : [...ids, key];
    commit();
}

export function resetCurrentPlan() {
    timetableData.plans[timetableData.currentPlan] = [];
    commit();
}

export function switchPlan(name) {
    timetableData.currentPlan = name;
    commit();
}

export function renamePlan(oldName, newName) {
    newName = newName.trim();
    if (!newName || newName === oldName || timetableData.plans[newName] !== undefined) return false;
    timetableData.plans[newName] = timetableData.plans[oldName];
    delete timetableData.plans[oldName];
    const idx = timetableData.planOrder.indexOf(oldName);
    if (idx !== -1) timetableData.planOrder[idx] = newName;
    if (timetableData.currentPlan === oldName) timetableData.currentPlan = newName;
    commit();
    return true;
}

export function importSharedPlan(ids) {
    timetableData.plans[SHARED_PLAN] = ids;
    timetableData.currentPlan = SHARED_PLAN;
    commit();
}

// 前期/後期（TERM_MAP のキー）も T1〜T4・集中も同じ扱いでトグルする
export function toggleTerm(term) {
    const idx = activeTerms.indexOf(term);
    if (idx > -1) activeTerms.splice(idx, 1);
    else activeTerms.push(term);
    persistFilters();
    notify();
}

export function setStrictMode(value) {
    isStrictMode = value;
    persistFilters();
    notify();
}
