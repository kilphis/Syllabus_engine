 import { DEPT_CODE_MAP } from './constants.js';
        // Exported functions
        export function getSyllabusUrl(lecture) {
            const deptCode = deptCodeMap[lecture.dept] || '26';
            return `https://syllabus.kumamoto-u.ac.jp/pub/syllabus.html?locale=ja&nendo=2025&jikanwari_shozokucd=${deptCode}&jikanwaricd=${lecture.id}`;
        }
