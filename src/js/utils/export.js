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