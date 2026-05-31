import { TERM_MAP } from '../constants.js';
import { activeTerms } from '../store.js';
import { elements } from '../ui/elements.js';

export function isTermMatch(lectureTags, activeTerms, strictMode) {
    if (!lectureTags || lectureTags.length === 0) return false;

    if (strictMode) {
        // Strict Mode: Intersection of lectureTags and activeTerms
        return lectureTags.some(tag => activeTerms.includes(tag));
    } else {
        // Inclusive Mode:
        // Expand activeTerms
        const expandedActiveTerms = new Set();
        activeTerms.forEach(t => {
            expandedActiveTerms.add(t);
            if (TERM_MAP[t]) {
                TERM_MAP[t].forEach(sub => expandedActiveTerms.add(sub));
            }
        });

        return lectureTags.some(tag => expandedActiveTerms.has(tag));
    }
}

export function toggleTerm(term) {
    if (activeTerms.includes(term)) {
        const idx = activeTerms.indexOf(term);
        if (idx > -1) activeTerms.splice(idx, 1);
    } else {
        activeTerms.push(term);
    }
    updateTermButtons();
    if (typeof handleSearch === 'function') handleSearch();
}

export function toggleSemester(semester) {
    if (activeTerms.includes(semester)) {
        const idx = activeTerms.indexOf(semester);
        if (idx > -1) activeTerms.splice(idx, 1);
    } else {
        activeTerms.push(semester);
    }
    updateTermButtons();
    if (typeof handleSearch === 'function') handleSearch();
}

export function updateTermButtons() {
    // Use elements.termButtons if available, otherwise fallback to querySelectorAll
    const buttons = elements.termButtons || document.querySelectorAll('.term-btn');

    buttons.forEach(btn => {
        const term = btn.getAttribute('data-term');
        // Highlight ONLY if explicitly in activeTerms
        const isActive = activeTerms.includes(term);

        if (isActive) {
            btn.className = 'term-btn px-3 py-1 rounded-full text-sm font-bold transition-all shadow-md bg-blue-600 text-white border-blue-600 transform scale-105';
        } else {
            btn.className = 'term-btn px-3 py-1 rounded-full text-sm font-medium transition-colors border bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
        }
    });
}
