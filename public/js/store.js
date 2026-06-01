export let timetableData = {
    plans: { "案1": [], "案2": [], "案3": [] },
    planOrder: ["案1", "案2", "案3"],
    currentPlan: "案1"
};

export let allLectures = [];
export let activeTerms = ['T1']; // Default: T1 selected
export let isStrictMode = false;

export function setStrictMode(value) {
    isStrictMode = value;
}

export function renamePlan(oldName, newName) {
    newName = newName.trim();
    if (!newName || newName === oldName || timetableData.plans[newName] !== undefined) return false;
    timetableData.plans[newName] = timetableData.plans[oldName];
    delete timetableData.plans[oldName];
    const idx = timetableData.planOrder.indexOf(oldName);
    if (idx !== -1) timetableData.planOrder[idx] = newName;
    if (timetableData.currentPlan === oldName) timetableData.currentPlan = newName;
    saveStore();
    return true;
}

// ローカルストレージから復元
export function initStore() {
    const saved = localStorage.getItem('myTimetableData');
    if (saved) {
        timetableData = JSON.parse(saved);
        // 旧データに planOrder がない場合は補完
        if (!timetableData.planOrder) {
            timetableData.planOrder = Object.keys(timetableData.plans).filter(k => k !== '共有');
        }
    } else {
        // Migrate old data if exists
        const oldData = localStorage.getItem('myTimetable');
        if (oldData) {
            timetableData.plans["案1"] = JSON.parse(oldData);
            localStorage.removeItem('myTimetable'); // Cleanup old key
        }
        saveStore();
    }
}

export function saveStore() {
    try {
        localStorage.setItem('myTimetableData', JSON.stringify(timetableData));
    } catch (e) {
        console.error("Failed to save data to localStorage:", e);
        alert("データの保存に失敗しました。ローカルストレージの容量が一杯か、無効化されている可能性があります。");
    }
}
