export let timetableData = {
    plans: { "案1": [], "案2": [], "案3": [] },
    currentPlan: "案1"
};

export let allLectures = [];
export let activeTerms = ['T1']; // Default: T1 selected
export let isStrictMode = false;

export function setStrictMode(value) {
    isStrictMode = value;
}

// ローカルストレージから復元
export function initStore() {
    const saved = localStorage.getItem('myTimetableData');
    if (saved) {
        timetableData = JSON.parse(saved);
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
