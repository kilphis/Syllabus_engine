import { initStore, saveStore, timetableData, allLectures, activeTerms, isStrictMode, setStrictMode } from './store.js';
import { fetchLectures } from './api.js';
import { elements } from './ui/elements.js';
import { renderGrid, renderTabs, switchTab } from './ui/grid.js';
import { handleSearch, loadMore, resetPagination } from './ui/search.js';
import { printTimetable } from './utils/print.js';
import { generateShareUrl, checkForSharedPlan } from './utils/share.js';
import { toggleTerm as utilsToggleTerm, toggleSemester as utilsToggleSemester, updateTermButtons } from './utils/filters.js';
import { initFilters } from './ui/filters.js';

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

// Expose other utils to window
window.generateShareUrl = generateShareUrl;
window.printTimetable = printTimetable;
window.switchTab = switchTab; // Already exposed in grid.js but good to be explicit
window.loadMore = loadMore;   // Already exposed in search.js

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
