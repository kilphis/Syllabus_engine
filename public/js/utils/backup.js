// バックアップの作成・検証・復元。対象は 時間割(プラン)・出席記録とメモ・課題締切設定。
// 読み込むファイルは信用せず、形式を厳密に検証してから適用する。
import { timetableData, replaceTimetable, pushUndo } from '../store.js';
import { getAllRecords, replaceRecords, STATUS_LABELS } from '../records.js';
import { getAllDeadlines, replaceDeadlines, DEADLINE_RULES } from './deadlines.js';
import { requestPersistentStorage } from './storage.js';

const APP_ID = 'syllabus-engine';
const FORMAT_VERSION = 1;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_MEMO_CHARS = 200000;
const LAST_BACKUP_KEY = 'lastBackupAt';
const SHARED_PLAN = '共有';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// __proto__ などをキーにした書き込みでオブジェクトの型が壊れるのを防ぐ
const isSafeKey = (k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype';

function fail(message) {
    throw new Error(message);
}

// --- 現在のデータ ---

function currentData() {
    return {
        timetable: JSON.parse(JSON.stringify(timetableData)),
        records: getAllRecords(),
        deadlines: getAllDeadlines(),
    };
}

export function summarize(data = currentData()) {
    const records = Object.values(data.records);
    const planNames = Object.keys(data.timetable.plans);
    return {
        plans: planNames.length,
        lectures: new Set(planNames.flatMap(n => data.timetable.plans[n])).size,
        attendance: records.reduce((sum, r) => sum + r.attendance.length, 0),
        memos: records.filter(r => r.memo).length,
        deadlines: Object.keys(data.deadlines).length,
    };
}

export const lastBackupAt = () => {
    try {
        return localStorage.getItem(LAST_BACKUP_KEY);
    } catch (e) {
        return null;
    }
};

// --- 書き出し ---

const pad = (n) => String(n).padStart(2, '0');

export function backupFileName(now = new Date()) {
    return `クマダイ時間割_backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export function buildBackupJson(now = new Date()) {
    return JSON.stringify({
        app: APP_ID,
        version: FORMAT_VERSION,
        exportedAt: now.toISOString(),
        data: currentData(),
    }, null, 2);
}

// ファイルとして保存する（ブラウザのダウンロード）
export function downloadBackup() {
    const now = new Date();
    const blob = new Blob([buildBackupJson(now)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    try {
        localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
    } catch (e) {
        console.error('Failed to save last backup time:', e);
    }
    requestPersistentStorage();
}

// --- 検証 ---

function validateTimetable(t) {
    if (!isPlainObject(t) || !isPlainObject(t.plans)) fail('時間割のデータが見つかりません。');
    const plans = {};
    for (const [name, ids] of Object.entries(t.plans)) {
        if (!isSafeKey(name)) fail(`プラン名「${name}」は使えません。`);
        if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) fail(`プラン「${name}」の形式が正しくありません。`);
        plans[name] = [...new Set(ids)];
    }
    const own = (name) => Object.prototype.hasOwnProperty.call(plans, name);
    const order = (Array.isArray(t.planOrder) ? t.planOrder : []).filter(n => typeof n === 'string' && own(n) && n !== SHARED_PLAN);
    Object.keys(plans).forEach(n => {
        if (n !== SHARED_PLAN && !order.includes(n)) order.push(n);
    });
    if (order.length === 0) {
        order.push('案1');
        plans['案1'] = [];
    }
    const currentPlan = typeof t.currentPlan === 'string' && own(t.currentPlan) ? t.currentPlan : order[0];
    return { plans, planOrder: [...new Set(order)], currentPlan };
}

function validateRecords(r) {
    if (!isPlainObject(r)) fail('出席・メモのデータの形式が正しくありません。');
    const out = {};
    for (const [key, rec] of Object.entries(r)) {
        if (!isSafeKey(key) || !isPlainObject(rec) || !Array.isArray(rec.attendance)) fail('出席・メモのデータの形式が正しくありません。');
        const seen = new Set();
        const attendance = [];
        for (const a of rec.attendance) {
            if (!isPlainObject(a) || !DATE_PATTERN.test(a.date) || !Object.prototype.hasOwnProperty.call(STATUS_LABELS, a.status)) {
                fail('出席記録に正しくない日付または状態が含まれています。');
            }
            if (seen.has(a.date)) continue;
            seen.add(a.date);
            attendance.push({ date: a.date, status: a.status });
        }
        attendance.sort((x, y) => x.date.localeCompare(y.date));
        const memo = typeof rec.memo === 'string' ? rec.memo : '';
        if (memo.length > MAX_MEMO_CHARS) fail('メモが大きすぎます。');
        out[key] = { attendance, memo };
    }
    return out;
}

function validateDeadlines(d) {
    if (!isPlainObject(d)) fail('課題締切のデータの形式が正しくありません。');
    const out = {};
    for (const [key, rule] of Object.entries(d)) {
        if (!isSafeKey(key) || !Object.prototype.hasOwnProperty.call(DEADLINE_RULES, rule)) fail('課題締切の設定に正しくない値が含まれています。');
        out[key] = rule;
    }
    return out;
}

// ファイルの文字列を検証して、適用できる形のデータを返す。問題があれば Error(利用者向けメッセージ) を投げる
export function parseBackup(text) {
    let obj;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        fail('JSONとして読み込めませんでした。バックアップ用のファイルを選んでください。');
    }
    if (!isPlainObject(obj) || obj.app !== APP_ID) fail('このアプリのバックアップファイルではありません。');
    if (obj.version !== FORMAT_VERSION) fail('対応していない形式のバックアップです（新しいバージョンで作られた可能性があります）。');
    if (!isPlainObject(obj.data)) fail('バックアップの中身が見つかりません。');
    return {
        exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null,
        data: {
            timetable: validateTimetable(obj.data.timetable),
            records: validateRecords(obj.data.records ?? {}),
            deadlines: validateDeadlines(obj.data.deadlines ?? {}),
        },
    };
}

export function readBackupFile(file) {
    return new Promise((resolve, reject) => {
        if (file.size > MAX_FILE_BYTES) {
            reject(new Error('ファイルが大きすぎます（10MBまで）。'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('ファイルを読み込めませんでした。'));
        reader.readAsText(file);
    });
}

// --- 復元 ---

function applyData(data) {
    replaceDeadlines(data.deadlines);
    replaceRecords(data.records);
    replaceTimetable(data.timetable);
}

// 検証済みのバックアップで現在のデータを置き換える。直前の状態は Undo 履歴に控える
export function restoreBackup(data) {
    const before = currentData();
    pushUndo(() => applyData(before));
    applyData(data);
}
