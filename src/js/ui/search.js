import { elements } from './elements.js';
import { isTermMatch } from '../utils/filters.js';
import { getSyllabusUrl } from '../syllabus.js';
import { TERM_MAP } from '../constants.js';
import { timetableData, activeTerms, isStrictMode, allLectures } from '../store.js';

let displayLimit = 50;

export function handleSearch() {
    const { searchInput, deptFilter, gradeFilter, dayFilter, periodFilter, searchResults, resultsCount } = elements;

    const query = searchInput.value.toLowerCase();
    const deptVal = deptFilter.value;
    const gradeVal = gradeFilter.value;
    const dayVal = dayFilter.value;
    const periodVal = periodFilter.value;

    const currentSelectedIds = timetableData.plans[timetableData.currentPlan];

    // Prepare Effective Terms for Badge Display
    let displayTerms = [];
    if (isStrictMode) {
        displayTerms = [...activeTerms];
    } else {
        activeTerms.forEach(t => {
            displayTerms.push(t);
            if (TERM_MAP[t]) displayTerms.push(...TERM_MAP[t]);
        });
        displayTerms = [...new Set(displayTerms)];
    }

    // Filter Logic
    const filtered = allLectures.filter(l => {
        // 1. Period Check
        if (activeTerms.length === 0) return false;
        if (!isTermMatch(l.tags, activeTerms, isStrictMode)) return false;

        // 2. Text Search
        const matchesQuery = query === '' ||
            l.title.toLowerCase().includes(query) ||
            (l.teacher && l.teacher.toLowerCase().includes(query));

        // 3. Attribute Filters
        const matchesDept = deptVal === '' || l.dept === deptVal;
        const matchesGrade = gradeVal === '' || l.grade == gradeVal;

        const matchesDayPeriod = (dayVal === '' && periodVal === '') ||
            l.periods.some(p =>
                (dayVal === '' || p.day == dayVal) &&
                (periodVal === '' || p.time == periodVal)
            );

        return matchesQuery && matchesDept && matchesGrade && matchesDayPeriod;
    });

    const totalCount = filtered.length;
    const showing = filtered.slice(0, displayLimit);

    if (resultsCount) {
        resultsCount.innerText = `${totalCount}件中 ${showing.length}件表示`;
    }

    if (totalCount === 0) {
        searchResults.innerHTML = `<div class="text-center text-slate-400 py-8">条件に一致する講義が見つかりませんでした</div>`;
        return;
    }

    // Render Results
    let html = showing.map(l => {
        const compositeKey = `${l.dept}_${l.id}`;
        const isSelected = currentSelectedIds.includes(compositeKey);
        const url = getSyllabusUrl(l);

        // Badge
        const matchingTags = l.tags ? l.tags.filter(t => displayTerms.includes(t)) : [];
        const badgeHtml = matchingTags.slice(0, 2).map(t =>
            `<span class="inline-block bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1 font-bold">${t}</span>`
        ).join('');

        return `
        <div onclick="window.toggleLecture('${l.dept}', '${l.id}')" 
             class="p-3 border rounded-xl cursor-pointer transition-all duration-200 hover:border-blue-500 relative 
             ${isSelected ? 'bg-blue-100 border-blue-500' : 'bg-white border-slate-200'}">
            
            ${isSelected ? '<span class="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">追加済み</span>' : ''}
            
            <div class="mb-1">${badgeHtml}</div>
            <div class="text-sm font-bold text-slate-800">${l.title}</div>
            <div class="text-xs text-slate-500">${l.teacher || ''}</div>
            <div class="text-xs text-slate-400 mt-1 flex gap-2 items-center">
                <span>${l.dept || '-'}</span>
                <span>${l.grade ? l.grade + '年' : '-'}</span>
                <a href="${url}" target="_blank" onclick="event.stopPropagation()" class="text-blue-600 hover:underline ml-auto">シラバス ></a>
            </div>
        </div>
        `;
    }).join('');

    // Show More Button
    if (totalCount > displayLimit) {
        html += `
            <button onclick="window.loadMore()" class="w-full py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors">
                さらに表示 (${totalCount - displayLimit}件)
            </button>
        `;
    }

    searchResults.innerHTML = html;
}

export function loadMore() {
    displayLimit += 50;
    handleSearch();
}

export function resetPagination() {
    displayLimit = 50;
    handleSearch();
}

// Expose to window for HTML onclick handlers
window.handleSearch = handleSearch;
window.loadMore = loadMore;
window.resetPagination = resetPagination;
