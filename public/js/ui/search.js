import { elements } from './elements.js';
import { isTermMatch, expandTerms } from '../utils/filters.js';
import { getSyllabusUrl } from '../syllabus.js';
import { activeTerms, isStrictMode, allLectures, currentSelectedIds, lectureKey } from '../store.js';
import { esc } from '../utils/html.js';

const PAGE_SIZE = 50;
let displayLimit = PAGE_SIZE;

// 現在のフォーム入力を検索条件として読み取る
function readCriteria() {
    const { searchInput, teacherFilter, deptFilter, gradeFilter, dayFilter, periodFilter } = elements;
    return {
        query: searchInput.value.toLowerCase(),
        teacher: teacherFilter.value.toLowerCase(),
        dept: deptFilter.value,
        grade: gradeFilter.value,
        day: dayFilter.value,
        period: periodFilter.value,
    };
}

function matches(l, c) {
    // 1. 教員名（期間の選択状況に依存しない）
    if (c.teacher !== '' && !(l.teacher && l.teacher.toLowerCase().includes(c.teacher))) return false;

    // 2. 期間（教員名指定があり期間未選択なら素通し）
    if (activeTerms.length === 0) {
        if (c.teacher === '') return false;
    } else if (!isTermMatch(l.tags, activeTerms, isStrictMode)) {
        return false;
    }

    // 3. 科目名・所属・年次・曜日時限
    if (c.query !== '' && !l.title.toLowerCase().includes(c.query)) return false;
    if (c.dept !== '' && l.dept !== c.dept) return false;
    if (c.grade !== '' && l.grade != c.grade) return false;
    if (c.day !== '' || c.period !== '') {
        return l.periods.some(p =>
            (c.day === '' || p.day == c.day) && (c.period === '' || p.time == c.period));
    }
    return true;
}

function resultCard(l, isSelected, badgeTerms) {
    const badges = (l.tags ?? []).filter(t => badgeTerms.has(t)).slice(0, 2).map(t =>
        `<span class="inline-block bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1 font-bold">${esc(t)}</span>`
    ).join('');

    return `
        <div data-action="toggle-lecture" data-key="${esc(lectureKey(l))}"
             class="p-3 border rounded-xl cursor-pointer transition-all duration-200 hover:border-blue-500 relative
             ${isSelected ? 'bg-blue-100 border-blue-500' : 'bg-white border-slate-200'}">
            ${isSelected ? '<span class="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">追加済み</span>' : ''}
            <div class="mb-1">${badges}</div>
            <div class="text-sm font-bold text-slate-800">${esc(l.title)}</div>
            <div class="text-xs text-slate-500">${esc(l.teacher)}</div>
            <div class="text-xs text-slate-400 mt-1 flex gap-2 items-center">
                <span>${esc(l.dept || '-')}</span>
                <span>${l.grade ? esc(l.grade) + '年' : '-'}</span>
                <a href="${esc(getSyllabusUrl(l))}" target="_blank" rel="noopener" class="text-blue-600 hover:underline ml-auto">シラバス ></a>
            </div>
        </div>`;
}

export function renderSearch() {
    const { searchResults, resultsCount } = elements;
    const criteria = readCriteria();
    const filtered = allLectures.filter(l => matches(l, criteria));
    const showing = filtered.slice(0, displayLimit);

    resultsCount.textContent = `${filtered.length}件中 ${showing.length}件表示`;

    if (filtered.length === 0) {
        searchResults.innerHTML = `<div class="text-center text-slate-400 py-8">条件に一致する講義が見つかりませんでした</div>`;
        return;
    }

    const selectedIds = new Set(currentSelectedIds());
    const badgeTerms = isStrictMode ? new Set(activeTerms) : expandTerms(activeTerms);

    let html = showing.map(l => resultCard(l, selectedIds.has(lectureKey(l)), badgeTerms)).join('');
    if (filtered.length > displayLimit) {
        html += `
            <button data-action="load-more" class="w-full py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors">
                さらに表示 (${filtered.length - displayLimit}件)
            </button>`;
    }
    searchResults.innerHTML = html;
}

export function loadMore() {
    displayLimit += PAGE_SIZE;
    renderSearch();
}

export function resetPagination() {
    displayLimit = PAGE_SIZE;
    renderSearch();
}
