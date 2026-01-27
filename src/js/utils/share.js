import { timetableData, saveStore } from '../store.js';
import { DEPT_CODE_MAP } from '../constants.js';

export function checkForSharedPlan() {
    const params = new URLSearchParams(window.location.search);
    const sharedPlanCompressed = params.get('plan');

    if (sharedPlanCompressed) {
        try {
            const sharedPlan = decompressPlan(sharedPlanCompressed);
            if (Array.isArray(sharedPlan) && confirm("共有された時間割が見つかりました。「共有」タブにインポートしますか？\n(既存の「共有」タブの内容は上書きされます)")) {
                timetableData.plans["共有"] = sharedPlan;
                timetableData.currentPlan = "共有";
                saveStore();
                // Remove query param from URL without reload
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {
            console.error("Failed to parse shared plan", e);
            alert("共有された時間割データの読み込みに失敗しました。");
        }
    }
}

export function generateShareUrl() {
    const currentData = timetableData.plans[timetableData.currentPlan];
    if (!currentData || currentData.length === 0) {
        alert("共有する講義が選択されていません。");
        return;
    }

    const compressed = compressPlan(currentData);
    const url = `${window.location.origin}${window.location.pathname}?plan=${compressed}`;

    navigator.clipboard.writeText(url).then(() => {
        alert("共有用URLをクリップボードにコピーしました！");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        prompt("以下のURLをコピーしてください:", url);
    });
}

export function compressPlan(lectureIds) {
    // 1. Map full IDs to short IDs: "工学部_12345" -> "25:12345"
    const shortIds = lectureIds.map(id => {
        const [deptName, lectureId] = id.split('_');
        const deptCode = DEPT_CODE_MAP[deptName];
        if (deptCode) {
            return `${deptCode}:${lectureId}`;
        }
        return id; // Fallback if dept not found
    });

    // 2. Stringify and Compress
    const json = JSON.stringify(shortIds);
    return LZString.compressToEncodedURIComponent(json);
}

export function decompressPlan(compressed) {
    // 1. Decompress
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) throw new Error("Decompression failed");

    const shortIds = JSON.parse(json);

    // 2. Map short IDs back to full IDs: "25:12345" -> "工学部_12345"
    // Create reverse map for lookup
    const codeToDeptMap = Object.entries(DEPT_CODE_MAP).reduce((acc, [name, code]) => {
        acc[code] = name;
        return acc;
    }, {});

    return shortIds.map(shortId => {
        if (shortId.includes(':')) {
            const [code, id] = shortId.split(':');
            const deptName = codeToDeptMap[code];
            if (deptName) {
                return `${deptName}_${id}`;
            }
        }
        return shortId; // Fallback
    });
}
