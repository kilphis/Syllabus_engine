import {
    initStore, subscribe, setLectures, allLectures, timetableData,
    toggleLecture, resetCurrentPlan, switchPlan, renamePlan, toggleTerm, setStrictMode,
    undo, canUndo, lectureKey, addPlan, deletePlan, setView, toggleSyllabusLinks, showSyllabusLinks
} from './store.js';
import { fetchLectures } from './api.js';
import { elements } from './ui/elements.js';
import { renderGrid, renderTabs, isTabDeleteMode, setTabDeleteMode } from './ui/grid.js';
import { renderSearch, loadMore } from './ui/search.js';
import { initFilters } from './ui/filters.js';
import { showToast, hideToast } from './ui/toast.js';
import { renderRecords, toggleMemoPreview, applyView } from './ui/records.js';
import { initSurvey, openSurvey, answeredSurvey, closeSurvey, isSurveyOpen } from './ui/survey.js';
import { showBackupModal, exportBackup, importBackup } from './ui/backup.js';
import { markToday, cycleAttendance, removeAttendance, setMemo } from './records.js';
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
    renderRecords();
    elements.undoBtn.disabled = !canUndo();
}

const closeAddMenu = () => elements.addMenu.classList.add('hidden');

function closeMoreMenu() {
    elements.moreMenu.classList.add('hidden');
    elements.moreMenuWrap.querySelector('[aria-haspopup]').setAttribute('aria-expanded', 'false');
}

function toggleMoreMenu() {
    const open = elements.moreMenu.classList.toggle('hidden') === false;
    elements.moreMenuWrap.querySelector('[aria-haspopup]').setAttribute('aria-expanded', open);
}

function undoLast() {
    if (undo()) showToast('元に戻しました');
    else hideToast();
}

// --- Actions: HTML の data-action / data-change-action と対応する処理 ---
// 引数は押された要素（dataset から値を取る）

// Tailwind の sm（640px）未満。シラバスリンクのボタンが表示される幅と同じ
const isSmallScreen = () => window.matchMedia?.('(max-width: 639px)').matches ?? false;

// スマホでシラバスリンクを表示している間は、時間割のカードを押しても外れない（リンクを押し損ねて消すのを防ぐ）
const isCardLocked = (el) => showSyllabusLinks && isSmallScreen() && el.closest('#timetableGrid') !== null;

const clickActions = {
    'toggle-lecture': (el) => {
        if (isCardLocked(el)) {
            showToast('シラバスリンクを表示している間は、カードを外せません');
            return;
        }
        const key = el.dataset.key;
        if (toggleLecture(key) === 'removed') {
            const title = allLectures.find(l => lectureKey(l) === key)?.title.trim() ?? key;
            showToast(`「${title}」を外しました`, { withUndo: true });
        }
    },
    'undo': () => undoLast(),
    'survey-open': () => openSurvey(),
    'survey-answered': () => answeredSurvey(),
    'survey-close': () => closeSurvey(),
    'show-backup': () => showBackupModal(),
    'export-backup': () => exportBackup(),
    'toggle-tab-delete': () => setTabDeleteMode(!isTabDeleteMode()),
    'toggle-syllabus-links': () => toggleSyllabusLinks(),
    'delete-plan': (el) => {
        setTabDeleteMode(false); // 1枚消したら削除モードを抜ける
        const deleted = deletePlan(el.dataset.plan);
        if (deleted) showToast(`タブ「${deleted.name}」を削除しました`, { withUndo: true });
    },
    'set-view': (el) => setView(el.dataset.view),
    'mark-today': (el) => markToday(el.dataset.key),
    'cycle-attendance': (el) => cycleAttendance(el.dataset.key, el.dataset.date),
    'delete-attendance': (el) => {
        removeAttendance(el.dataset.key, el.dataset.date);
        showToast('出席の記録を削除しました', { withUndo: true });
    },
    'toggle-memo-preview': (el) => toggleMemoPreview(el.dataset.key),
    'toggle-more-menu': () => toggleMoreMenu(),
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
    'import-backup': (el) => importBackup(el),
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
    if (!e.target.closest('#moreMenuWrap')) closeMoreMenu();
    // 要素内のシラバスリンクは遷移だけさせ、カード全体の操作は発火させない
    if (e.target.closest('a[href]')) return;
    const el = e.target.closest('[data-action]');
    clickActions[el?.dataset.action]?.(el);
    // 「その他」メニューの項目を押したら、メニューを閉じる
    if (el?.closest('#moreMenu')) closeMoreMenu();
});

// メモは入力のたびに保存する（再描画するとカーソルが飛ぶので、画面は更新しない）
document.addEventListener('input', (e) => {
    const memo = e.target.closest?.('[data-memo-key]');
    if (memo) setMemo(memo.dataset.memoKey, memo.value);
});

document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change-action]');
    changeActions[el?.dataset.changeAction]?.(el);
});

// Ctrl/⌘+Z で元に戻す（入力欄の文字の取り消しは邪魔しない）
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAddMenu();
        closeMoreMenu();
        if (isTabDeleteMode()) setTabDeleteMode(false);
        if (isSurveyOpen()) closeSurvey();
    }
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
    try {
        initStore();
        applyView();
        subscribe(render);
        setLectures(await fetchLectures());
        initFilters(allLectures);
        checkForSharedPlan();
        render();
        initSurvey();
        document.documentElement.dataset.app = 'ready'; // index.html の見張りスクリプトが見る起動完了の目印
        console.log("App initialized with", allLectures.length, "lectures");
    } catch (err) {
        console.error("Initialization failed:", err);
        showStartupError();
    }
}

// 起動に失敗したとき、何が起きたか分からない白い画面にしない
function showStartupError() {
    const grid = elements.timetableGrid;
    if (!grid) return;
    grid.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-8">
        読み込みに失敗しました。ページを強制再読み込み（Mac: ⌘+Shift+R ／ Windows: Ctrl+Shift+R）してください。<br>
        それでも直らないときは、ブラウザのコンソールに出ているエラーを教えてください。</td></tr>`;
}

initApp();
