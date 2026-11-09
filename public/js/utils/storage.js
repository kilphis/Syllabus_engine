// ブラウザによる保存データの自動削除を起きにくくするよう申請する（1セッションに1回だけ）。
// 許可されるかはブラウザ次第。失敗しても動作には影響しない。
let asked = false;

export function requestPersistentStorage() {
    if (asked) return;
    asked = true;
    try {
        navigator.storage?.persist?.()?.catch(() => {});
    } catch (e) {
        // 非対応環境では何もしない
    }
}
