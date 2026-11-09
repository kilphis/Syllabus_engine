import { TERM_MAP } from '../constants.js';
import { activeTerms } from '../store.js';
import { elements } from '../ui/elements.js';

// 「前期」→ T1,T2 のように親ターム指定を子タームへ展開する
export function expandTerms(terms) {
    const expanded = new Set();
    terms.forEach(t => {
        expanded.add(t);
        (TERM_MAP[t] ?? []).forEach(sub => expanded.add(sub));
    });
    return expanded;
}

export function isTermMatch(lectureTags, terms, strictMode) {
    if (!lectureTags || lectureTags.length === 0) return false;
    const targets = strictMode ? new Set(terms) : expandTerms(terms);
    return lectureTags.some(tag => targets.has(tag));
}

const BTN_BASE = 'term-btn px-3 py-1 rounded-full text-sm transition-all';
const BTN_ACTIVE = `${BTN_BASE} font-bold shadow-md bg-blue-600 text-white border border-blue-600 transform scale-105`;
const BTN_INACTIVE = `${BTN_BASE} font-medium border bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200`;

export function updateTermButtons() {
    elements.termButtons.forEach(btn => {
        btn.className = activeTerms.includes(btn.dataset.term) ? BTN_ACTIVE : BTN_INACTIVE;
    });
}
