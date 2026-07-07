import { initStore, saveStore, renamePlan, timetableData, allLectures, activeTerms, isStrictMode, setStrictMode } from './store.js';
import { fetchLectures } from './api.js';
import { elements } from './ui/elements.js';
import { renderGrid, renderTabs, switchTab } from './ui/grid.js';
import { handleSearch, loadMore, resetPagination } from './ui/search.js';
import { printTimetable } from './utils/print.js';
import { generateShareUrl, checkForSharedPlan } from './utils/share.js';
import { toggleTerm as utilsToggleTerm, toggleSemester as utilsToggleSemester, updateTermButtons } from './utils/filters.js';
import { initFilters } from './ui/filters.js';
import { exportToImage, generateWallpaper } from './utils/export.js';
import { exportToICal, exportToObsidian } from './utils/calendar.js';

// --- Global Orchestration ---

// Render everything: Tabs, Grid, Search Results, Term Buttons
window.renderAll = function () {
    renderTabs();
    renderGrid(allLectures);
    handleSearch();
    updateTermButtons();
};

// Toggle Lecture (Called from Grid/Search)
window.toggleLecture = function (dept, id) {
    const compositeKey = `${dept}_${id}`;
    const currentPlan = timetableData.currentPlan;
    let currentSelectedIds = timetableData.plans[currentPlan];

    if (currentSelectedIds.includes(compositeKey)) {
        timetableData.plans[currentPlan] = currentSelectedIds.filter(k => k !== compositeKey);
    } else {
        timetableData.plans[currentPlan].push(compositeKey);
    }
    saveStore();
    window.renderAll();
};

// Reset Timetable
window.resetTimetable = function () {
    if (confirm(`「${timetableData.currentPlan}」の講義をすべてリセットしますか？`)) {
        timetableData.plans[timetableData.currentPlan] = [];
        saveStore();
        window.renderAll();
    }
};

// Strict Mode Toggle
window.toggleStrictMode = function () {
    const { strictModeToggle } = elements;
    if (strictModeToggle && typeof setStrictMode === 'function') {
        setStrictMode(strictModeToggle.checked);
        handleSearch();
    } else {
        console.warn("setStrictMode is not available or toggle missing");
        // Fallback: reload or manual update if possible
        handleSearch();
    }
};

// Wrap Filter Toggles to trigger Search
window.toggleTerm = function (term) {
    utilsToggleTerm(term);
    handleSearch();
};

window.toggleSemester = function (semester) {
    utilsToggleSemester(semester);
    handleSearch();
};

// Rename Tab
window.renameTab = function (currentName) {
    const newName = prompt(`タブ名を変更します（現在: ${currentName}）`, currentName);
    if (!newName || newName === currentName) return;
    if (timetableData.plans[newName] !== undefined) {
        alert('その名前はすでに使われています。');
        return;
    }
    if (renamePlan(currentName, newName)) {
        window.renderAll();
    }
};

// Show course code list modal (timetable grid format)
window.showCourseCodeList = function () {
    const currentSelectedIds = timetableData.plans[timetableData.currentPlan];
    const selected = allLectures.filter(l => currentSelectedIds.includes(`${l.dept}_${l.id}`));

    if (selected.length === 0) {
        alert('講義が選択されていません。');
        return;
    }

    const dayNames = ['月', '火', '水', '木', '金'];

    // 曜日×時限グリッドを構築
    const grid = {};
    for (let t = 1; t <= 5; t++) {
        grid[t] = {};
        for (let d = 1; d <= 5; d++) grid[t][d] = [];
    }
    const noPeriod = []; // 集中など曜日時限なし

    selected.forEach(l => {
        if (!l.periods || l.periods.length === 0) {
            noPeriod.push(l);
            return;
        }
        l.periods.forEach(p => {
            if (grid[p.time] && grid[p.time][p.day] !== undefined) {
                grid[p.time][p.day].push(l);
            }
        });
    });

    // グリッド行を生成
    const rows = [1, 2, 3, 4, 5].map(period => {
        const cells = [1, 2, 3, 4, 5].map(day => {
            const lectures = grid[period][day];
            if (lectures.length === 0) return `<td class="px-2 py-3 text-center text-slate-200 border border-slate-100 text-xs">-</td>`;
            const content = lectures.map(l =>
                `<div class="font-mono font-bold text-blue-700">${l.id}</div><div class="text-[10px] text-slate-500 truncate max-w-[80px]">${l.title}</div>`
            ).join('');
            return `<td class="px-2 py-2 text-center border border-slate-100">${content}</td>`;
        }).join('');
        return `<tr><td class="px-3 py-3 text-center text-sm font-bold text-slate-500 bg-slate-50 border border-slate-100 whitespace-nowrap">${period}限</td>${cells}</tr>`;
    }).join('');

    // 集中講義
    const noPeriodRows = noPeriod.map(l =>
        `<tr class="border-b border-slate-100"><td colspan="6" class="px-3 py-2 text-sm">
            <span class="font-mono font-bold text-blue-700 mr-2">${l.id}</span>${l.title}
            <span class="ml-2 text-xs bg-slate-100 px-1 rounded">集中</span>
        </td></tr>`
    ).join('');

    // CSV テキスト生成（曜日,時限,コード,科目名）
    const csvLines = ['曜日,時限,授業コード,科目名'];
    selected.forEach(l => {
        if (!l.periods || l.periods.length === 0) {
            csvLines.push(`集中,-,${l.id},${l.title}`);
        } else {
            l.periods.forEach(p => {
                if (p.day >= 1 && p.day <= 5) csvLines.push(`${dayNames[p.day - 1]},${p.time},${l.id},${l.title}`);
            });
        }
    });

    document.getElementById('courseCodeModal').classList.remove('hidden');
    document.getElementById('courseCodeTableBody').innerHTML = rows + (noPeriodRows ? `<tr><td colspan="6" class="px-3 pt-3 pb-1 text-xs font-bold text-slate-400">集中講義・曜日なし</td></tr>${noPeriodRows}` : '');
    document.getElementById('courseCodeText').textContent = csvLines.join('\n');
};

window.copyCourseCodeText = function () {
    const text = document.getElementById('courseCodeText').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyCodesBtn');
        btn.textContent = 'コピー済み！';
        setTimeout(() => btn.textContent = 'コードをコピー', 1500);
    });
};

// Expose other utils to window
window.generateShareUrl = generateShareUrl;
window.printTimetable = printTimetable;
window.switchTab = switchTab; // Already exposed in grid.js but good to be explicit
window.loadMore = loadMore;   // Already exposed in search.js
window.exportToImage = exportToImage;
window.exportToICal = () => exportToICal(allLectures, timetableData);
window.exportToObsidian = () => exportToObsidian(allLectures, timetableData);

// Event Listeners
document.getElementById('wallpaperBtn')?.addEventListener('click', () => {
    generateWallpaper(allLectures, timetableData);
});

// --- Initialization ---

async function initApp() {
    // 1. Initialize Store
    initStore();

    // 2. Fetch Data
    try {
        const data = await fetchLectures();
        // Update allLectures in place (assuming it's an array exported from store.js)
        if (Array.isArray(allLectures)) {
            allLectures.splice(0, allLectures.length, ...data);
        } else {
            console.error("allLectures is not an array");
        }

        // 3. Initialize Filters (UI)
        initFilters(allLectures);

        // 4. Check for Shared Plan
        checkForSharedPlan();

        // 5. Initial Render
        window.renderAll();

        console.log("App initialized with", allLectures.length, "lectures");
    } catch (err) {
        console.error("Initialization failed:", err);
        if (elements.timetableGrid) {
            elements.timetableGrid.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-8">データの読み込みに失敗しました。</td></tr>`;
        }
    }
}

function initFiltersLocal() {
    // This function is removed as it's now imported from ui/filters.js
    // Keeping this comment to ensure no confusion if old code persists
}

// Start the App
initApp();
