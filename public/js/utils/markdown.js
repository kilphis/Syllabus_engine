import { esc } from './html.js';

// メモ用の最小限の Markdown 変換。先に必ずエスケープしてから記法を置き換えるので、入力中の HTML は実行されない。
// 対応: 見出し(#〜###)、箇条書き(- / * / 1.)、チェックボックス(- [ ] / - [x])、``` コード、**太字**、`コード`、[文字](http(s)URL)

function inline(text) {
    return esc(text)
        .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-[0.9em]">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 underline">$1</a>');
}

function listItem(body) {
    const task = body.match(/^\[([ xX])\]\s+(.*)$/);
    if (!task) return `<li>${inline(body)}</li>`;
    const done = task[1] !== ' ';
    return `<li class="list-none -ml-5">${done ? '☑' : '☐'} <span class="${done ? 'line-through text-slate-400' : ''}">${inline(task[2])}</span></li>`;
}

export function renderMarkdown(source) {
    const out = [];
    let list = null;      // { tag, items }
    let paragraph = [];
    let code = null;      // コードブロック中の行

    const flushParagraph = () => {
        if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
        paragraph = [];
    };
    const flushList = () => {
        if (!list) return;
        const cls = list.tag === 'ul' ? 'list-disc' : 'list-decimal';
        out.push(`<${list.tag} class="${cls} pl-5">${list.items.join('')}</${list.tag}>`);
        list = null;
    };
    const pushItem = (tag, body) => {
        flushParagraph();
        if (list && list.tag !== tag) flushList();
        list ??= { tag, items: [] };
        list.items.push(listItem(body));
    };

    source.split('\n').forEach(line => {
        if (code) {
            if (/^```/.test(line)) {
                out.push(`<pre class="bg-slate-100 rounded p-2 overflow-x-auto text-xs"><code>${esc(code.join('\n'))}</code></pre>`);
                code = null;
            } else {
                code.push(line);
            }
            return;
        }
        let m;
        if (/^```/.test(line)) {
            flushParagraph(); flushList();
            code = [];
        } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
            flushParagraph(); flushList();
            const size = ['text-base', 'text-sm', 'text-sm'][m[1].length - 1];
            out.push(`<div class="font-bold ${size} mt-2">${inline(m[2])}</div>`);
        } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
            pushItem('ul', m[1]);
        } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
            pushItem('ol', m[1]);
        } else if (line.trim() === '') {
            flushParagraph(); flushList();
        } else {
            flushList();
            paragraph.push(line);
        }
    });
    if (code) out.push(`<pre class="bg-slate-100 rounded p-2 overflow-x-auto text-xs"><code>${esc(code.join('\n'))}</code></pre>`);
    flushParagraph(); flushList();
    return out.join('') || '<p class="text-slate-400">（メモはまだありません）</p>';
}
