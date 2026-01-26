import { timetableData } from '../store.js';

export function printTimetable() {
    const originalTitle = document.title;
    const currentPlan = timetableData.currentPlan;
    document.title = `クマダイ時間割_${currentPlan}_2025`;

    window.print();

    // Restore title after print dialog is closed
    // Note: onafterprint support varies, but is generally good in modern browsers
    window.onafterprint = () => {
        document.title = originalTitle;
        window.onafterprint = null; // Cleanup
    };

    // Fallback for browsers that don't block or support onafterprint well
    setTimeout(() => {
        document.title = originalTitle;
    }, 1000);
}

// Assign to window for global access (as per requirement)
window.printTimetable = printTimetable;
