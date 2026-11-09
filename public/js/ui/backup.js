import { elements } from './elements.js';
import { openModal } from './modals.js';
import { summarize, lastBackupAt, downloadBackup, readBackupFile, parseBackup, restoreBackup } from '../utils/backup.js';
import { esc } from '../utils/html.js';

const countLine = (s) =>
    `プラン ${s.plans}件（講義 ${s.lectures}件）／ 出席記録 ${s.attendance}件 ／ メモ ${s.memos}件 ／ 課題締切の設定 ${s.deadlines}件`;

function setMessage(text, tone = 'info') {
    const tones = { info: 'text-slate-500', ok: 'text-green-700', error: 'text-red-600' };
    elements.backupMessage.className = `mt-4 text-sm ${tones[tone]}`;
    elements.backupMessage.textContent = text;
}

function renderSummary() {
    const last = lastBackupAt();
    const lastText = last ? new Date(last).toLocaleString('ja-JP') : 'まだ作成していません';
    elements.backupSummary.innerHTML = `
        <div class="text-xs font-bold text-slate-500">いまブラウザに入っているデータ</div>
        <div class="text-slate-700">${esc(countLine(summarize()))}</div>
        <div class="text-xs text-slate-500">最後のバックアップ: ${esc(lastText)}</div>`;
}

export function showBackupModal() {
    renderSummary();
    setMessage('');
    openModal('backupModal');
}

export function exportBackup() {
    downloadBackup();
    renderSummary();
    setMessage('バックアップを保存しました。ダウンロードしたファイルは大切に保管してください。', 'ok');
}

// <input type="file"> で選ばれたファイルを検証し、確認のうえ復元する
export async function importBackup(input) {
    const file = input.files?.[0];
    input.value = ''; // 同じファイルをもう一度選べるようにする
    if (!file) return;

    try {
        const { data, exportedAt } = parseBackup(await readBackupFile(file));
        const when = exportedAt ? `（${new Date(exportedAt).toLocaleString('ja-JP')} 作成）` : '';
        const ok = confirm(`バックアップ${when}の内容に置き換えます。\n${countLine(summarize(data))}\n\n現在のデータは上書きされます（直後なら Ctrl/⌘+Z で元に戻せます）。続けますか？`);
        if (!ok) {
            setMessage('復元を取りやめました。');
            return;
        }
        restoreBackup(data);
        renderSummary();
        setMessage('復元しました。間違えたときは、このあと Ctrl/⌘+Z で元に戻せます。', 'ok');
    } catch (e) {
        setMessage(e.message || '復元に失敗しました。', 'error');
    }
}
