import { elements } from './elements.js';
import { resetPagination } from './search.js';

export function initFilters(allLectures) {
    const { deptFilter, gradeFilter, dayFilter, periodFilter, searchInput, strictModeToggle } = elements;

    // Populate Dept Filter
    const depts = new Set();
    allLectures.forEach(l => {
        if (l.dept) depts.add(l.dept);
    });
    Array.from(depts).sort().forEach(d => {
        const option = document.createElement('option');
        option.value = d;
        option.textContent = d;
        deptFilter.appendChild(option);
    });

    // Add Listeners
    [deptFilter, gradeFilter, dayFilter, periodFilter].forEach(el => {
        if (el) el.addEventListener('change', resetPagination);
    });

    if (searchInput) {
        searchInput.addEventListener('input', resetPagination);
    }

    // Strict Mode Listener (also handled by onclick in HTML, but change event is safer)
    if (strictModeToggle) {
        strictModeToggle.addEventListener('change', () => {
            if (window.toggleStrictMode) {
                window.toggleStrictMode();
            }
        });
    }
}
