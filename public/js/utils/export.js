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
    const { exportModal, exportImage } = elements;
    const wallpaperExportRoot = document.getElementById('wallpaper-export-root');

    document.body.style.cursor = 'wait';

    try {
        if (!wallpaperExportRoot) {
            throw new Error('Export root (#wallpaper-export-root) not found');
        }

        const planName = timetableData.currentPlan;
        const currentSelectedIds = timetableData.plans[planName];

        // Update Plan Name
        const planNameElem = document.getElementById('wallpaper-plan-name');
        if (planNameElem) planNameElem.textContent = planName;

        // Populate Table
        const table = document.getElementById('wallpaper-table');
        if (!table) throw new Error('Wallpaper table not found');
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
                    div.innerHTML = `
                        <div class="wp-lecture-title">${m.title}</div>
                        <div class="wp-teacher">${m.teacher || ''}</div>
                    `;
                    td.appendChild(div);
                });
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        // Capture
        window.scrollTo(0, 0); // Prevent offset issues

        // Wait a bit for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Temporarily remove overflow-hidden and truncate classes for capture
        const hiddenElements = wallpaperExportRoot.querySelectorAll('.overflow-hidden, .truncate');
        const originalClasses = new Map();
        hiddenElements.forEach(el => {
            originalClasses.set(el, el.className);
            el.classList.remove('overflow-hidden', 'truncate');
        });

        const canvas = await html2canvas(wallpaperExportRoot, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: true, // Enable logging for debugging
            backgroundColor: null,
            width: 360,
            height: 640,
            onclone: (clonedDoc) => {
                const clonedRoot = clonedDoc.getElementById('wallpaper-export-root');
                if (clonedRoot) {
                    clonedRoot.style.position = 'relative';
                    clonedRoot.style.top = '0';
                    clonedRoot.style.left = '0';
                    clonedRoot.style.opacity = '1';
                    clonedRoot.style.pointerEvents = 'auto';
                }
            }
        });

        // Restore classes
        hiddenElements.forEach(el => {
            el.className = originalClasses.get(el);
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
        alert("画像生成に失敗しました: " + err.message);
        document.body.style.cursor = 'default';
    }
}