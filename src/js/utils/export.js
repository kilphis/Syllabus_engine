import { elements } from '../ui/elements.js';

export async function exportToImage() {
    const { timetableGrid, exportModal, exportImage } = elements;
    const container = timetableGrid.closest('table').parentElement; // overflow-x-auto を持っている親

    document.body.style.cursor = 'wait';

    try {
        // html2canvas に「全幅・全高」を明示的に教え込む
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            // ここが重要：スクロールで見切れている分を含めた「全体の幅」を指定
            width: container.scrollWidth,
            height: container.scrollHeight,
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc) => {
                // クローンされたDOMの中で、一時的にスクロール制限を解除する
                const clonedContainer = clonedDoc.querySelector('.overflow-x-auto');
                if (clonedContainer) {
                    clonedContainer.style.overflow = 'visible';
                    clonedContainer.style.width = 'auto';
                }
            }
        });

        const dataUrl = canvas.toDataURL('image/png');
        exportImage.src = dataUrl;
        exportModal.classList.remove('hidden');

    } catch (err) {
        console.error("Export failed:", err);
        alert("画像の生成に失敗しました。");
    } finally {
        document.body.style.cursor = 'default';
    }
}

export async function generateWallpaper(allLectures, timetableData) {
    if (!wallpaperExportRoot) return;

    document.body.style.cursor = 'wait';

    try {
        const planName = timetableData.currentPlan;
        const currentSelectedIds = timetableData.plans[planName];

        // Update Plan Name
        const planNameElem = document.getElementById('wallpaper-plan-name');
        if (planNameElem) planNameElem.textContent = planName;

        // Populate Table
        const table = document.getElementById('wallpaper-table');
        table.innerHTML = '';

        const days = 5; // Mon-Fri
        const slots = 5; // 1-5

        // Header
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr><th></th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th></tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let t = 1; t <= slots; t++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="text-align:center; vertical-align:middle; font-weight:bold; color:#94a3b8;">${t}</td>`;

            for (let d = 1; d <= days; d++) {
                const td = document.createElement('td');
                const matches = allLectures.filter(l =>
                    currentSelectedIds.includes(`${l.dept}_${l.id}`) &&
                    l.periods.some(p => p.day === d && p.time === t)
                );

                matches.forEach(m => {
                    const div = document.createElement('div');
                    div.className = `wp-lecture ${matches.length > 1 ? 'wp-conflict' : 'wp-cell-active'}`;
                    div.style.padding = '4px';
                    div.style.borderRadius = '4px';
                    div.style.marginBottom = '2px';
                    div.innerHTML = `<div class="wp-lecture-title">${m.title}</div>`;
                    td.appendChild(div);
                });
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        // Capture
        const canvas = await html2canvas(wallpaperExportRoot, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            width: 360,
            height: 640,
        });

        const dataUrl = canvas.toDataURL('image/png');

        // Wait for image to load before showing modal
        exportImage.onload = () => {
            // Add "Long press to save" message
            const msg = exportModal.querySelector('p.text-slate-500');
            if (msg) msg.textContent = "壁紙として保存するには、画像を長押しまたは右クリックしてください。";
            exportModal.classList.remove('hidden');
            document.body.style.cursor = 'default';
        };
        exportImage.src = dataUrl;

    } catch (err) {
        console.error("Wallpaper generation failed:", err);
        alert("壁紙の生成に失敗しました。");
        document.body.style.cursor = 'default';
    }
}