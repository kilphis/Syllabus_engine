const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// innerHTML に差し込む文字列は必ずこれを通す
export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);
}
