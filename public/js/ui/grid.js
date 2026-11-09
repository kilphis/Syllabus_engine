import { elements } from './elements.js';
import { getSyllabusUrl } from '../syllabus.js';
import { allLectures, currentSelectedIds, lectureKey, planNames, isSharedPlan, timetableData, selectedLectures } from '../store.js';
import { esc } from '../utils/html.js';

const DAYS = 5;  // 月〜金
const SLOTS = 5; // 1〜5限

function lectureCard(lecture, isConflict) {
    const teacher = lecture.teacher ? lecture.teacher.split(',')[0] : '';
    return `
        <div data-action="toggle-lecture" data-key="${esc(lectureKey(lecture))}"
             class="text-[8px] sm:text-[10px] leading-tight p-1.5 rounded shadow-sm cursor-pointer flex-shrink-0 ${isConflict ? 'conflict' : 'cell-active'}">
            <div class="font-bold truncate">${esc(lecture.title)}</div>
            <div class="truncate text-slate-600 hidden sm:block">${esc(teacher)}</div>
            <a href="${esc(getSyllabusUrl(lecture))}" target="_blank" rel="noopener" class="text-blue-700 hover:underline block mt-0.5 font-bold text-[9px] text-right hidden sm:block">シラバス ></a>
        </div>`;
}

export function renderGrid() {
    const selected = selectedLectures();
    let html = '';

    for (let t = 1; t <= SLOTS; t++) {
        html += `<tr><td class="text-center font-bold text-slate-400 border-b border-r border-slate-100">${t}</td>`;
        for (let d = 1; d <= DAYS; d++) {
            const matches = selected.filter(l => l.periods.some(p => p.day === d && p.time === t));
            html += `<td id="cell-${d}-${t}" class="border-b border-r border-slate-100 p-1 h-24 vertical-top relative align-top">
                <div class="flex flex-col gap-1 h-full overflow-hidden">
                    ${matches.map(m => lectureCard(m, matches.length > 1)).join('')}
                </div>
            </td>`;
        }
        html += '</tr>';
    }
    elements.timetableGrid.innerHTML = html;
}

export function renderTabs() {
    elements.tabContainer.innerHTML = planNames().map(plan => {
        const isActive = plan === timetableData.currentPlan;
        const count = (timetableData.plans[plan] ?? []).length;
        const renamable = !isSharedPlan(plan);
        return `
            <button data-action="switch-plan" data-plan="${esc(plan)}" ${renamable ? 'data-renamable' : ''}
                title="${renamable ? 'ダブルクリックで名前変更' : ''}"
                class="px-4 py-2 text-sm font-bold transition-colors border-b-4 ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
                ${esc(plan)} <span class="text-xs font-normal ml-1 text-slate-400">(${count})</span>
            </button>`;
    }).join('');
}
