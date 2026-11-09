import { elements } from './elements.js';

const DURATION_MS = 6000;
let timer = null;

// withUndo=true のとき「元に戻す」ボタンを出す
export function showToast(message, { withUndo = false } = {}) {
    const { toast, toastMessage, toastUndo } = elements;
    toastMessage.textContent = message;
    toastUndo.classList.toggle('hidden', !withUndo);
    toast.classList.remove('hidden');
    clearTimeout(timer);
    timer = setTimeout(hideToast, DURATION_MS);
}

export function hideToast() {
    clearTimeout(timer);
    elements.toast.classList.add('hidden');
}
