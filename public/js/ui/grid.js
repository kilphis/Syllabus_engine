import { elements } from './elements.js';
import { getSyllabusUrl } from '../syllabus.js';
import { planNames, isSharedPlan, timetableData, selectedLectures, canDeletePlan, lectureKey, showSyllabusLinks } from '../store.js';
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
            <a href="${esc(getSyllabusUrl(lecture))}" target="_blank" rel="noopener" class="syllabus-link text-blue-700 hover:underline block mt-0.5 font-bold text-[9px] text-right hidden sm:block">シラバス ></a>
        </div>`;
}

const LINK_BTN_ON = 'sm:hidden text-xs flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded transition-colors';
const LINK_BTN_OFF = 'sm:hidden text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors';

export function renderGrid() {
    // スマホではカード内のシラバスリンクを既定で隠している。ボタンで表示に切り替える
    elements.timetablePanel.classList.toggle('show-syllabus-links', showSyllabusLinks);
    elements.syllabusLinksBtn.className = showSyllabusLinks ? LINK_BTN_ON : LINK_BTN_OFF;
    elements.syllabusLinksBtn.setAttribute('aria-pressed', showSyllabusLinks);

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

// タブの削除ボタンは「タブを削除」を押した間だけ出す（誤操作防止）。1枚消すか「完了」で抜ける
let deleteMode = false;

export const isTabDeleteMode = () => deleteMode;

export function setTabDeleteMode(on) {
    deleteMode = on;
    renderTabs();
}

const DELETE_BTN_ON = 'text-xs px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 font-bold transition-colors';

export function renderTabs() {
    const deletable = canDeletePlan();
    if (!deletable) deleteMode = false; // 最後の1枚は消せないのでモードも解除する

    // 削除モードに入るのは「その他」メニューの項目。モード中だけ、タブ列に「完了」を出して抜けられるようにする
    elements.tabDeleteBtn.className = deleteMode ? DELETE_BTN_ON : 'hidden';
    elements.tabDeleteMenuItem.disabled = !deletable;

    elements.tabContainer.innerHTML = planNames().map(plan => {
        const isActive = plan === timetableData.currentPlan;
        const count = (timetableData.plans[plan] ?? []).length;
        const renamable = !isSharedPlan(plan);
        const showDelete = deleteMode && deletable;
        return `
            <div class="flex items-center border-b-4 transition-colors ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
                <button data-action="switch-plan" data-plan="${esc(plan)}" ${renamable ? 'data-renamable' : ''}
                    title="${renamable ? 'ダブルクリックで名前変更' : ''}"
                    class="pl-4 ${showDelete ? 'pr-1' : 'pr-4'} py-2 text-sm font-bold">
                    ${esc(plan)} <span class="text-xs font-normal ml-1 text-slate-400">(${count})</span>
                </button>
                ${showDelete ? `<button data-action="delete-plan" data-plan="${esc(plan)}" aria-label="タブ「${esc(plan)}」を削除" title="このタブを削除"
                    class="mr-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold">✕</button>` : ''}
            </div>`;
    }).join('');
}
