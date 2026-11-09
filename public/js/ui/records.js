import { elements } from './elements.js';
import { activeView, selectedLectures, lectureKey, timetableData } from '../store.js';
import { getRecord, attendanceCounts, todayString, storageUsageBytes, STATUS_LABELS } from '../records.js';
import { renderMarkdown } from '../utils/markdown.js';
import { esc } from '../utils/html.js';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_NAMES = ['月', '火', '水', '木', '金'];
const STORAGE_LIMIT_LABEL = '約5MB';

// メモをプレビュー表示中の講義キー（画面の一時状態。保存しない）
const previewing = new Set();

const VIEW_ON = 'px-4 py-1.5 rounded-lg text-sm font-bold bg-blue-600 text-white';
const VIEW_OFF = 'px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-500 hover:bg-slate-200';

// 表示する画面（時間割／記録）に合わせてパネルの表示とスイッチの見た目を切り替える
export function applyView() {
    const isRecords = activeView === 'records';
    elements.timetablePanel.classList.toggle('hidden', isRecords);
    elements.toolbar.classList.toggle('records-view', isRecords);
    elements.recordsPanel.classList.toggle('hidden', !isRecords);
    elements.viewSwitch.querySelectorAll('[data-view]').forEach(btn => {
        const on = btn.dataset.view === (isRecords ? 'records' : 'timetable');
        btn.className = on ? VIEW_ON : VIEW_OFF;
        btn.setAttribute('aria-pressed', on);
    });
}

function formatDate(date) {
    const [y, m, d] = date.split('-').map(Number);
    return `${m}/${d}(${DAY_NAMES[new Date(y, m - 1, d).getDay()]})`;
}

// 曜日・時限の表示（例: 月2・木2）。曜日時限がなければ「集中・その他」
function periodLabel(lecture) {
    const label = (lecture.periods ?? [])
        .filter(p => p.day >= 1 && p.day <= 5)
        .map(p => `${WEEKDAY_NAMES[p.day - 1]}${p.time}`)
        .join('・');
    return label || '集中・その他';
}

// 一覧の並び: 曜日→時限の早い順、曜日時限のない講義は最後
function sortKey(lecture) {
    const first = (lecture.periods ?? []).filter(p => p.day >= 1 && p.day <= 5)
        .map(p => p.day * 10 + p.time).sort((a, b) => a - b)[0];
    return first ?? 999;
}

function todayButton(key, today) {
    const entry = getRecord(key).attendance.find(a => a.date === today);
    const base = 'shrink-0 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors';
    if (!entry) {
        return `<button data-action="mark-today" data-key="${esc(key)}" class="${base} bg-blue-600 hover:bg-blue-700 text-white">今日の出席を記録</button>`;
    }
    const isLate = entry.status === 'late';
    return `<button data-action="mark-today" data-key="${esc(key)}" title="押すと${isLate ? '出席' : '遅刻'}に変更"
        class="${base} ${isLate ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-green-100 hover:bg-green-200 text-green-800'}">
        今日: ${STATUS_LABELS[entry.status]}（${isLate ? '出席に戻す' : '遅刻に変更'}）</button>`;
}

function attendanceChips(key, today) {
    const list = getRecord(key).attendance;
    if (list.length === 0) return `<span class="text-xs text-slate-400">まだ出席の記録がありません</span>`;
    return [...list].reverse().map(a => {
        const isLate = a.status === 'late';
        const tone = isLate ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-green-50 border-green-300 text-green-800';
        return `<span class="inline-flex items-center rounded-full border text-xs ${tone} ${a.date === today ? 'font-bold' : ''}">
            <button data-action="cycle-attendance" data-key="${esc(key)}" data-date="${a.date}" title="${a.date}（押すと${isLate ? '出席' : '遅刻'}に変更）"
                class="pl-2.5 pr-1.5 py-0.5">${formatDate(a.date)} ${STATUS_LABELS[a.status]}</button>
            <button data-action="delete-attendance" data-key="${esc(key)}" data-date="${a.date}" aria-label="${a.date}の記録を削除" title="この記録を削除"
                class="pr-2 pl-0.5 py-0.5 opacity-50 hover:opacity-100">✕</button>
        </span>`;
    }).join('');
}

function memoSection(key) {
    const { memo } = getRecord(key);
    const isPreview = previewing.has(key);
    return `
        <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-slate-500">メモ（Markdown）</span>
            <button data-action="toggle-memo-preview" data-key="${esc(key)}" class="text-xs text-blue-600 hover:underline">${isPreview ? '編集に戻る' : 'プレビュー'}</button>
        </div>
        ${isPreview
            ? `<div class="text-sm text-slate-700 space-y-1 min-h-[5rem] p-3 bg-slate-50 rounded-lg break-words">${renderMarkdown(memo)}</div>`
            : `<textarea data-memo-key="${esc(key)}" rows="4" placeholder="# 第3回&#10;- 課題: レポート&#10;- [ ] 教科書p.30を読む"
                class="w-full p-3 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y">${esc(memo)}</textarea>`}`;
}

function lectureCard(lecture, today) {
    const key = lectureKey(lecture);
    const { present, late } = attendanceCounts(key);
    const teacher = lecture.teacher ? lecture.teacher.split(',')[0] : '';
    return `
        <article class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="font-bold text-slate-800 break-words">${esc(lecture.title.trim())}</h3>
                    <div class="text-xs text-slate-500">${esc(periodLabel(lecture))}${teacher ? ` ・ ${esc(teacher)}` : ''}</div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs text-slate-500 tabular-nums">出席 ${present} ／ 遅刻 ${late}</span>
                    ${todayButton(key, today)}
                </div>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-3">${attendanceChips(key, today)}</div>
            <div class="mt-3">${memoSection(key)}</div>
        </article>`;
}

export function renderRecords() {
    applyView();
    if (activeView !== 'records') return;

    const lectures = [...selectedLectures()].sort((a, b) => sortKey(a) - sortKey(b) || a.title.localeCompare(b.title));
    const today = todayString();
    const kb = (storageUsageBytes() / 1024).toFixed(1);

    const body = lectures.length === 0
        ? `<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
               「${esc(timetableData.currentPlan)}」にはまだ講義がありません。<br>「時間割」に切り替えて講義を追加すると、ここに出席とメモの欄が出ます。
           </div>`
        : lectures.map(l => lectureCard(l, today)).join('');

    elements.recordsPanel.innerHTML = `
        <div class="space-y-4">
            ${body}
            <p class="text-xs text-slate-400">この端末のブラウザに保存しています（使用 ${kb} KB ／ 目安 ${STORAGE_LIMIT_LABEL}）。ブラウザのデータ消去や端末の変更で失われるため、<button data-action="show-backup" class="text-blue-600 underline">バックアップ</button>を作っておくと安心です。</p>
        </div>`;
}

export function toggleMemoPreview(key) {
    if (!previewing.delete(key)) previewing.add(key);
    renderRecords();
}
