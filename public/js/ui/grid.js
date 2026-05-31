import { elements } from './elements.js';
import { getSyllabusUrl } from '../syllabus.js';
import { timetableData, saveStore } from '../store.js';

export function renderGrid(allLectures) {
    const { timetableGrid } = elements;
    timetableGrid.innerHTML = '';
    const days = 5; // 月〜金
    const slots = 5; // 1〜5限

    const currentSelectedIds = timetableData.plans[timetableData.currentPlan];

    for (let t = 1; t <= slots; t++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="text-center font-bold text-slate-400 border-b border-r border-slate-100">${t}</td>`;

        for (let d = 1; d <= days; d++) {
            const td = document.createElement('td');
            td.className = 'border-b border-r border-slate-100 p-1 h-24 vertical-top relative align-top';
            td.id = `cell-${d}-${t}`;

            // Flex container for cell content
            const cellContent = document.createElement('div');
            cellContent.className = 'flex flex-col gap-1 h-full overflow-hidden';
            td.appendChild(cellContent);

            // 選択された講義を配置 (Composite Key Check)
            const matches = allLectures.filter(l =>
                currentSelectedIds.includes(`${l.dept}_${l.id}`) &&
                l.periods.some(p => p.day === d && p.time === t)
            );

            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = `text-[8px] sm:text-[10px] leading-tight p-1.5 rounded shadow-sm cursor-pointer flex-shrink-0 ${matches.length > 1 ? 'conflict' : 'cell-active'}`;
                div.innerHTML = `
                    <div class="font-bold truncate">${m.title}</div>
                    <div class="truncate text-slate-600 hidden sm:block">${m.teacher ? m.teacher.split(',')[0] : ''}</div>
                    <a href="${getSyllabusUrl(m)}" target="_blank" onclick="event.stopPropagation()" class="text-blue-700 hover:underline block mt-0.5 font-bold text-[9px] text-right hidden sm:block">シラバス ></a>
                `;
                div.onclick = (e) => {
                    e.stopPropagation();
                    if (window.toggleLecture) window.toggleLecture(m.dept, m.id);
                };
                cellContent.appendChild(div);
            });

            tr.appendChild(td);
        }
        timetableGrid.appendChild(tr);
    }
}

export function renderTabs() {
    const { tabContainer } = elements;
    if (!tabContainer) return;

    // Ensure "共有" exists in plans if it's the current plan or has data
    const allPlans = ["案1", "案2", "案3"];
    if (timetableData.plans["共有"] || timetableData.currentPlan === "共有") {
        allPlans.push("共有");
        if (!timetableData.plans["共有"]) timetableData.plans["共有"] = [];
    }

    tabContainer.innerHTML = allPlans.map(plan => {
        const isActive = plan === timetableData.currentPlan;
        const count = timetableData.plans[plan] ? timetableData.plans[plan].length : 0;
        return `
            <button onclick="switchTab('${plan}')" 
                class="px-4 py-2 text-sm font-bold transition-colors border-b-4 ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
                ${plan} <span class="text-xs font-normal ml-1 text-slate-400">(${count})</span>
            </button>
        `;
    }).join('');
}

export function switchTab(planName) {
    timetableData.currentPlan = planName;
    saveStore();
    // Trigger render update via global function or event
    if (window.renderAll) {
        window.renderAll();
    } else {
        // Fallback: Dispatch event for main.js to listen
        document.dispatchEvent(new Event('render-required'));
    }
}

// Expose switchTab to window for onclick handlers in HTML
window.switchTab = switchTab;
