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

// Show course code list modal
window.showCourseCodeList = function () {
    const currentSelectedIds = timetableData.plans[timetableData.currentPlan];
    const selected = allLectures.filter(l => currentSelectedIds.includes(`${l.dept}_${l.id}`));

    if (selected.length === 0) {
        alert('講義が選択されていません。');
        return;
    }

    const dayNames = ['', '月', '火', '水', '木', '金', '土'];
    const rows = selected.map(l => {
        const period = l.periods.map(p => `${dayNames[p.day]}${p.time}限`).join(', ');
        return `<tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="px-3 py-2 font-mono text-sm text-slate-600">${l.id}</td>
            <td class="px-3 py-2 text-sm font-bold">${l.title}</td>
            <td class="px-3 py-2 text-sm text-slate-500">${l.teacher ? l.teacher.split(',')[0].trim() : '-'}</td>
            <td class="px-3 py-2 text-sm text-slate-500">${period}</td>
        </tr>`;
    }).join('');

    const codes = selected.map(l => l.id).join(', ');

    document.getElementById('courseCodeModal').classList.remove('hidden');
    document.getElementById('courseCodeTableBody').innerHTML = rows;
    document.getElementById('courseCodeText').textContent = codes;
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
