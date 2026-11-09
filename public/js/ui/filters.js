import { elements } from './elements.js';
import { resetPagination } from './search.js';
import { getSavedForm, saveForm, isStrictMode } from '../store.js';

const FORM_FIELDS = ['searchInput', 'teacherFilter', 'deptFilter', 'gradeFilter', 'dayFilter', 'periodFilter'];

const readForm = () => Object.fromEntries(FORM_FIELDS.map(k => [k, elements[k].value]));

// 所属の選択肢を講義データから生成し、保存済みの条件を復元して、入力イベントを検索・保存に結びつける
export function initFilters(allLectures) {
    const { deptFilter, gradeFilter, dayFilter, periodFilter, searchInput, teacherFilter, strictModeToggle } = elements;

    [...new Set(allLectures.map(l => l.dept).filter(Boolean))].sort().forEach(d => {
        const option = document.createElement('option');
        option.value = option.textContent = d;
        deptFilter.appendChild(option);
    });

    // 所属 option を作ったあとに復元する（存在しない値は select が空に戻す）
    const saved = getSavedForm();
    FORM_FIELDS.forEach(k => { if (typeof saved[k] === 'string') elements[k].value = saved[k]; });
    strictModeToggle.checked = isStrictMode;

    const onFormChange = () => {
        saveForm(readForm());
        resetPagination();
    };
    [deptFilter, gradeFilter, dayFilter, periodFilter].forEach(el => el.addEventListener('change', onFormChange));
    [searchInput, teacherFilter].forEach(el => el.addEventListener('input', onFormChange));
}
