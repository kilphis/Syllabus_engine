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

// --- Undo 履歴（セッション内のみ。講義の追加・削除、リセット、共有プランの上書きが対象） ---

const HISTORY_LIMIT = 30;
// 履歴の要素: { plan, ids }（中身の変更）／ { plan, ids, order, deleted: true }（タブごとの削除。order は planOrder 内の位置）
const history = [];

// 変更前のプラン内容を控える。必ず変更の直前に呼ぶ
function record(plan) {
    history.push({ plan, ids: [...(timetableData.plans[plan] ?? [])] });
    if (history.length > HISTORY_LIMIT) history.shift();
}

export const canUndo = () => history.length > 0;

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

// 追加なら 'added'、削除なら 'removed' を返す
export function toggleLecture(key) {
    const name = timetableData.currentPlan;
    const ids = currentSelectedIds();
    const wasSelected = ids.includes(key);
    record(name);
    timetableData.plans[name] = wasSelected ? ids.filter(k => k !== key) : [...ids, key];
    commit();
    return wasSelected ? 'removed' : 'added';
}

export function resetCurrentPlan() {
    record(timetableData.currentPlan);
    timetableData.plans[timetableData.currentPlan] = [];
    commit();
}

// 削除したタブを元の位置へ戻して開く（同名のタブが作られていたら別名にする）
function restoreDeletedPlan(entry) {
    const name = timetableData.plans[entry.plan] === undefined ? entry.plan : uniquePlanName(entry.plan);
    timetableData.plans[name] = entry.ids;
    if (entry.order > -1) {
        timetableData.planOrder.splice(Math.min(entry.order, timetableData.planOrder.length), 0, name);
    }
    timetableData.currentPlan = name;
    commit();
}

// 直前の変更を取り消し、そのプランのタブへ移動する。戻せるものがなければ null
export function undo() {
    while (history.length > 0) {
        const entry = history.pop();
        if (entry.deleted) {
            restoreDeletedPlan(entry);
            return entry;
        }
        if (timetableData.plans[entry.plan] === undefined) continue; // タブ名変更などで消えたプランは飛ばす
        timetableData.plans[entry.plan] = entry.ids;
        timetableData.currentPlan = entry.plan;
        commit();
        return entry;
    }
    notify();
    return null;
}

export function switchPlan(name) {
    timetableData.currentPlan = name;
    commit();
}

// 重複しない名前にする（例: "T4" が使用済みなら "T4 (2)"）
function uniquePlanName(base) {
    if (timetableData.plans[base] === undefined) return base;
    let n = 2;
    while (timetableData.plans[`${base} (${n})`] !== undefined) n++;
    return `${base} (${n})`;
}

// 使われていない最小の「案N」（案1〜3があれば案4）
function nextNumberedPlanName() {
    let n = 1;
    while (timetableData.plans[`案${n}`] !== undefined) n++;
    return `案${n}`;
}

// 新しいタブを末尾に追加して開く。term を渡すと名前をその期間にし、検索の期間もその期間だけに切り替える
export function addPlan(term = null) {
    const name = term
        ? uniquePlanName(term)
        : nextNumberedPlanName();
    timetableData.plans[name] = [];
    timetableData.planOrder.push(name);
    timetableData.currentPlan = name;
    if (term) {
        activeTerms.splice(0, activeTerms.length, term);
        persistFilters();
    }
    commit();
    return name;
}

export const canDeletePlan = () => planNames().length > 1;

// タブを削除する。最後の1枚は消せない。開いているタブを消したら隣のタブへ移る。消したタブの名前と講義数を返す
export function deletePlan(name) {
    const names = planNames();
    const pos = names.indexOf(name);
    if (pos === -1 || names.length <= 1) return null;

    const ids = [...(timetableData.plans[name] ?? [])];
    const order = timetableData.planOrder.indexOf(name);
    history.push({ plan: name, ids, order, deleted: true });
    if (history.length > HISTORY_LIMIT) history.shift();

    if (timetableData.currentPlan === name) timetableData.currentPlan = names[pos - 1] ?? names[pos + 1];
    delete timetableData.plans[name];
    if (order > -1) timetableData.planOrder.splice(order, 1);
    commit();
    return { name, count: ids.length };
}

export function renamePlan(oldName, newName) {
    newName = newName.trim();
    if (!newName || newName === oldName || timetableData.plans[newName] !== undefined) return false;
    timetableData.plans[newName] = timetableData.plans[oldName];
    delete timetableData.plans[oldName];
    const idx = timetableData.planOrder.indexOf(oldName);
    if (idx !== -1) timetableData.planOrder[idx] = newName;
    if (timetableData.currentPlan === oldName) timetableData.currentPlan = newName;
    history.forEach(h => { if (h.plan === oldName && !h.deleted) h.plan = newName; });
    commit();
    return true;
}

export function importSharedPlan(ids) {
    if (timetableData.plans[SHARED_PLAN]) record(SHARED_PLAN);
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
