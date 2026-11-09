import { selectedLectures, lectureKey } from '../store.js';
import { DEADLINE_RULES, getDeadlineRule } from '../utils/deadlines.js';
import { esc } from '../utils/html.js';

const DAY_NAMES = ['月', '火', '水', '木', '金'];
const PERIODS = [1, 2, 3, 4, 5];
const isWeekday = (p) => p.day >= 1 && p.day <= 5;

export const openModal = (id) => document.getElementById(id).classList.remove('hidden');
export const closeModal = (id) => document.getElementById(id).classList.add('hidden');

// --- 授業コード一覧 ---

// 曜日×時限ごとの講義と、曜日時限を持たない講義（集中など）に振り分ける
function buildCodeGrid(lectures) {
    const grid = {};
    PERIODS.forEach(t => {
        grid[t] = {};
        PERIODS.forEach(d => { grid[t][d] = []; });
    });
    const noPeriod = [];

    lectures.forEach(l => {
        if (!l.periods || l.periods.length === 0) {
            noPeriod.push(l);
            return;
        }
        l.periods.forEach(p => grid[p.time]?.[p.day]?.push(l));
    });
    return { grid, noPeriod };
}

function codeCell(lectures) {
    if (lectures.length === 0) {
        return `<td class="px-2 py-3 text-center text-slate-200 border border-slate-100 text-xs">-</td>`;
    }
    const content = lectures.map(l =>
        `<div class="font-mono font-bold text-blue-700">${esc(l.id)}</div><div class="text-[10px] text-slate-500 truncate max-w-[80px]">${esc(l.title)}</div>`
    ).join('');
    return `<td class="px-2 py-2 text-center border border-slate-100">${content}</td>`;
}

function buildCsv(lectures) {
    const lines = ['曜日,時限,授業コード,科目名'];
    lectures.forEach(l => {
        if (!l.periods || l.periods.length === 0) {
            lines.push(`集中,-,${l.id},${l.title}`);
            return;
        }
        l.periods.filter(isWeekday).forEach(p => lines.push(`${DAY_NAMES[p.day - 1]},${p.time},${l.id},${l.title}`));
    });
    return lines.join('\n');
}

export function showCourseCodeList() {
    const selected = selectedLectures();
    if (selected.length === 0) {
        alert('講義が選択されていません。');
        return;
    }

    const { grid, noPeriod } = buildCodeGrid(selected);

    const rows = PERIODS.map(t =>
        `<tr><td class="px-3 py-3 text-center text-sm font-bold text-slate-500 bg-slate-50 border border-slate-100 whitespace-nowrap">${t}限</td>${
            PERIODS.map(d => codeCell(grid[t][d])).join('')}</tr>`
    ).join('');

    const noPeriodRows = noPeriod.map(l =>
        `<tr class="border-b border-slate-100"><td colspan="6" class="px-3 py-2 text-sm">
            <span class="font-mono font-bold text-blue-700 mr-2">${esc(l.id)}</span>${esc(l.title)}
            <span class="ml-2 text-xs bg-slate-100 px-1 rounded">集中</span>
        </td></tr>`
    ).join('');

    document.getElementById('courseCodeTableBody').innerHTML = rows + (noPeriodRows
        ? `<tr><td colspan="6" class="px-3 pt-3 pb-1 text-xs font-bold text-slate-400">集中講義・曜日なし</td></tr>${noPeriodRows}`
        : '');
    document.getElementById('courseCodeText').textContent = buildCsv(selected);
    openModal('courseCodeModal');
}

export function copyCourseCodeText() {
    const text = document.getElementById('courseCodeText').textContent;
    const btn = document.getElementById('copyCodesBtn');
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'コピー済み！';
        setTimeout(() => { btn.textContent = 'コピー'; }, 1500);
    });
}

// --- 課題の締切タイミング ---

export function showDeadlineSettings() {
    // 毎週タスクの対象＝月〜金の通常コマを持つ講義のみ
    const targets = selectedLectures().filter(l => l.periods && l.periods.some(isWeekday));
    const listEl = document.getElementById('deadlineList');

    if (targets.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-slate-400 py-6 text-center">対象の講義がありません。<br>（月〜金の通常コマを持つ講義を選択してください）</p>`;
        openModal('deadlineModal');
        return;
    }

    const optionsFor = (current) => Object.entries(DEADLINE_RULES).map(([value, label]) =>
        `<option value="${value}"${value === current ? ' selected' : ''}>${label}</option>`
    ).join('');

    listEl.innerHTML = targets.map(l => {
        const key = lectureKey(l);
        const when = l.periods.filter(isWeekday).map(p => `${DAY_NAMES[p.day - 1]}${p.time}`).join('・');
        return `<div class="flex items-center justify-between gap-3 py-2 border-b border-slate-100">
            <div class="min-w-0">
                <div class="text-sm font-medium text-slate-700 truncate">${esc(l.title.trim())}</div>
                <div class="text-xs text-slate-400">${when}</div>
            </div>
            <select data-change-action="set-deadline" data-key="${esc(key)}"
                class="shrink-0 text-sm border border-slate-200 rounded px-2 py-1 bg-white text-slate-700">
                ${optionsFor(getDeadlineRule(key))}
            </select>
        </div>`;
    }).join('');

    openModal('deadlineModal');
}
