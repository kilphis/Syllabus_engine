import {
    initStore, subscribe, setLectures, allLectures, timetableData,
    toggleLecture, resetCurrentPlan, switchPlan, renamePlan, toggleTerm, setStrictMode,
    undo, canUndo, lectureKey, addPlan, deletePlan
} from './store.js';
import { fetchLectures } from './api.js';
import { elements } from './ui/elements.js';
import { renderGrid, renderTabs } from './ui/grid.js';
import { renderSearch, loadMore } from './ui/search.js';
import { initFilters } from './ui/filters.js';
import { showToast, hideToast } from './ui/toast.js';
import { openModal, closeModal, showCourseCodeList, copyCourseCodeText, showDeadlineSettings } from './ui/modals.js';
import { updateTermButtons } from './utils/filters.js';
import { printTimetable } from './utils/print.js';
import { generateShareUrl, checkForSharedPlan } from './utils/share.js';
import { generateWallpaper } from './utils/export.js';
import { exportToICal, exportToObsidian } from './utils/calendar.js';
import { setDeadlineRule } from './utils/deadlines.js';

// --- Rendering: store の変更に購読して全体を再描画する ---

function render() {
    renderTabs();
    renderGrid();
    renderSearch();
    updateTermButtons();
    elements.undoBtn.disabled = !canUndo();
}

const closeAddMenu = () => elements.addMenu.classList.add('hidden');

function undoLast() {
    if (undo()) showToast('元に戻しました');
    else hideToast();
}

// --- Actions: HTML の data-action / data-change-action と対応する処理 ---
// 引数は押された要素（dataset から値を取る）

const clickActions = {
    'toggle-lecture': (el) => {
        const key = el.dataset.key;
        if (toggleLecture(key) === 'removed') {
            const title = allLectures.find(l => lectureKey(l) === key)?.title.trim() ?? key;
            showToast(`「${title}」を外しました`, { withUndo: true });
        }
    },
    'undo': () => undoLast(),
    'delete-plan': (el) => {
        const deleted = deletePlan(el.dataset.plan);
        if (deleted) showToast(`タブ「${deleted.name}」を削除しました`, { withUndo: true });
    },
    'toggle-add-menu': () => elements.addMenu.classList.toggle('hidden'),
    'add-plan': (el) => {
        closeAddMenu();
        addPlan(el.dataset.term || null);
    },
    'switch-plan': (el) => switchPlan(el.dataset.plan),
    'toggle-term': (el) => toggleTerm(el.dataset.term),
    'load-more': () => loadMore(),
    'reset-timetable': () => {
        if (confirm(`「${timetableData.currentPlan}」の講義をすべてリセットしますか？`)) {
            resetCurrentPlan();
            showToast(`「${timetableData.currentPlan}」をリセットしました`, { withUndo: true });
        }
    },
    'share-url': () => generateShareUrl(),
    'print': () => printTimetable(),
    'wallpaper': () => generateWallpaper(allLectures, timetableData),
    'export-ical': () => exportToICal(allLectures, timetableData),
    'export-obsidian': () => exportToObsidian(allLectures, timetableData),
    'show-course-codes': () => showCourseCodeList(),
    'copy-course-codes': () => copyCourseCodeText(),
    'show-deadlines': () => showDeadlineSettings(),
    'open-modal': (el) => openModal(el.dataset.modal),
    'close-modal': (el) => closeModal(el.dataset.modal),
};

const changeActions = {
    'toggle-strict': (el) => setStrictMode(el.checked),
    'set-deadline': (el) => setDeadlineRule(el.dataset.key, el.value),
};

function promptRename(currentName) {
    const newName = prompt(`タブ名を変更します（現在: ${currentName}）`, currentName);
    if (!newName || newName === currentName) return;
    if (timetableData.plans[newName.trim()] !== undefined) {
        alert('その名前はすでに使われています。');
        return;
    }
    renamePlan(currentName, newName);
}

// イベント委譲: 動的に再生成される要素にも個別のハンドラを付けずに済む
document.addEventListener('click', (e) => {
    // タブ追加メニューの外を押したら閉じる
    if (!e.target.closest('#addMenuWrap')) closeAddMenu();
    // 要素内のシラバスリンクは遷移だけさせ、カード全体の操作は発火させない
    if (e.target.closest('a[href]')) return;
    const el = e.target.closest('[data-action]');
    clickActions[el?.dataset.action]?.(el);
});

document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change-action]');
    changeActions[el?.dataset.changeAction]?.(el);
});

// Ctrl/⌘+Z で元に戻す（入力欄の文字の取り消しは邪魔しない）
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAddMenu();
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
    if (e.target.closest?.('input, textarea, select')) return;
    e.preventDefault();
    undoLast();
});

elements.tabContainer.addEventListener('dblclick', (e) => {
    const el = e.target.closest('[data-renamable]');
    if (el) promptRename(el.dataset.plan);
});

// --- Initialization ---

async function initApp() {
    initStore();
    subscribe(render);

    try {
        setLectures(await fetchLectures());
        initFilters(allLectures);
        checkForSharedPlan();
        render();
        console.log("App initialized with", allLectures.length, "lectures");
    } catch (err) {
        console.error("Initialization failed:", err);
        elements.timetableGrid.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-8">データの読み込みに失敗しました。</td></tr>`;
    }
}

initApp();
