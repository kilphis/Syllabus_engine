import { TERM_MAP, PERIOD_TIMES, QUARTER_DATES } from '../constants.js';
import { getSyllabusUrl } from '../syllabus.js';

const DAY_NAMES = ['月', '火', '水', '木', '金'];

function getSelectedLectures(allLectures, timetableData) {
    const currentSelectedIds = timetableData.plans[timetableData.currentPlan];
    return allLectures.filter(l => currentSelectedIds.includes(`${l.dept}_${l.id}`));
}

// tags からその講義が開講される クォーター(T1-T4) の集合を求める
function getLectureQuarters(lecture) {
    const tags = lecture.tags || [];
    const quarters = new Set();

    tags.forEach(tag => {
        if (QUARTER_DATES[tag]) quarters.add(tag);
        if (TERM_MAP[tag]) TERM_MAP[tag].forEach(q => quarters.add(q));
    });

    // どのタグからも判別できない場合は通年開講とみなす
    if (quarters.size === 0) {
        Object.keys(QUARTER_DATES).forEach(q => quarters.add(q));
    }

    return [...quarters];
}

// 該当する全クォーターの最早開始日〜最遅終了日を返す
function getLectureDateRange(lecture) {
    const quarters = getLectureQuarters(lecture);
    const starts = quarters.map(q => QUARTER_DATES[q].start);
    const ends = quarters.map(q => QUARTER_DATES[q].end);
    return {
        start: starts.reduce((a, b) => (a < b ? a : b)),
        end: ends.reduce((a, b) => (a > b ? a : b))
    };
}

function downloadFile(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function formatICalDate(year, month, day) {
    return `${year}${pad2(month)}${pad2(day)}`;
}

// dateStr(YYYY-MM-DD) 以降で、最初に指定曜日(1=月...5=金)になる日を返す
function firstOccurrenceOnOrAfter(dateStr, targetDay) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const currentDay = date.getDay() === 0 ? 7 : date.getDay(); // JS: 日=0 -> 月=1...日=7
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    date.setDate(date.getDate() + diff);
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function escapeICalText(text) {
    return String(text || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

export function exportToICal(allLectures, timetableData) {
    const selected = getSelectedLectures(allLectures, timetableData);
    if (selected.length === 0) {
        alert('講義が選択されていません。');
        return;
    }

    const withPeriods = selected.filter(l => l.periods && l.periods.length > 0);
    const skipped = selected.length - withPeriods.length;

    const events = [];

    withPeriods.forEach(lecture => {
        const range = getLectureDateRange(lecture);
        const syllabusUrl = getSyllabusUrl(lecture);

        lecture.periods.forEach(p => {
            if (p.day < 1 || p.day > 5) return; // 集中講義など曜日不明はスキップ
            const time = PERIOD_TIMES[p.time];
            if (!time) return;

            const first = firstOccurrenceOnOrAfter(range.start, p.day);
            const dtStartDate = formatICalDate(first.year, first.month, first.day);
            const [endY, endM, endD] = range.end.split('-').map(Number);

            const description = [
                lecture.teacher ? `担当: ${lecture.teacher}` : '',
                lecture.dept ? `学部: ${lecture.dept}` : '',
                `シラバス: ${syllabusUrl}`
            ].filter(Boolean).join('\\n');

            events.push([
                'BEGIN:VEVENT',
                `UID:${lecture.dept}-${lecture.id}-${p.day}-${p.time}@kumadai-timetable`,
                `DTSTART;TZID=Asia/Tokyo:${dtStartDate}T${time.start.replace(':', '')}00`,
                `DTEND;TZID=Asia/Tokyo:${dtStartDate}T${time.end.replace(':', '')}00`,
                `RRULE:FREQ=WEEKLY;UNTIL=${formatICalDate(endY, endM, endD)}T145959Z`,
                `SUMMARY:${escapeICalText(lecture.title)}`,
                lecture.teacher ? `LOCATION:${escapeICalText(lecture.teacher)}` : '',
                `DESCRIPTION:${escapeICalText(description)}`,
                'END:VEVENT'
            ].filter(Boolean).join('\r\n'));
        });
    });

    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Kumadai Timetable//JP',
        'CALSCALE:GREGORIAN',
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Tokyo',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0900',
        'TZOFFSETTO:+0900',
        'TZNAME:JST',
        'END:STANDARD',
        'END:VTIMEZONE',
        ...events,
        'END:VCALENDAR'
    ].join('\r\n');

    downloadFile(`時間割_${timetableData.currentPlan}.ics`, ical, 'text/calendar;charset=utf-8');

    if (skipped > 0) {
        alert(`カレンダーファイルを書き出しました。\n※ 曜日・時限が無い集中講義など ${skipped} 件は含まれていません。`);
    }
}

function quarterLabel(lecture) {
    return getLectureQuarters(lecture).sort().join('/');
}

export function exportToObsidian(allLectures, timetableData) {
    const selected = getSelectedLectures(allLectures, timetableData);
    if (selected.length === 0) {
        alert('講義が選択されていません。');
        return;
    }

    const planName = timetableData.currentPlan;
    const withPeriods = selected.filter(l => l.periods && l.periods.length > 0);
    const noPeriod = selected.filter(l => !l.periods || l.periods.length === 0);

    // 週間タイムテーブルのグリッドを構築
    const grid = {};
    for (let t = 1; t <= 5; t++) {
        grid[t] = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    }
    withPeriods.forEach(l => {
        l.periods.forEach(p => {
            if (grid[p.time] && grid[p.time][p.day]) grid[p.time][p.day].push(l);
        });
    });

    const tableHeader = `| | ${DAY_NAMES.join(' | ')} |\n|---|${DAY_NAMES.map(() => '---').join('|')}|`;
    const tableRows = [1, 2, 3, 4, 5].map(t => {
        const cells = [1, 2, 3, 4, 5].map(d =>
            grid[t][d].map(l => l.title.trim()).join('<br>') || ' '
        );
        return `| ${t}限 | ${cells.join(' | ')} |`;
    }).join('\n');

    const lectureList = withPeriods.concat(noPeriod).map(l => {
        const url = getSyllabusUrl(l);
        const teacher = l.teacher ? `　担当: ${l.teacher}` : '';
        const term = l.periods && l.periods.length > 0 ? `　[${quarterLabel(l)}]` : '　[集中講義]';
        return `- **${l.title.trim()}**${term}${teacher}　[シラバス](${url})`;
    }).join('\n');

    const md = `---
tags: [時間割]
plan: ${planName}
year: 2026
---

# ${planName}

## 週間タイムテーブル

${tableHeader}
${tableRows}

## 講義一覧

${lectureList}

---
※ Full Calendar プラグインで週表示したい場合は、同時に書き出した .ics ファイルもこの保管庫に置いてください。
`;

    downloadFile(`時間割_${planName}.md`, md, 'text/markdown;charset=utf-8');
}
