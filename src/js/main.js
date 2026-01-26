import { DEPT_CODE_MAP, TERM_MAP } from './constants.js';
import { timetableData, initStore, saveStore } from './store.js';
import { fetchLectures } from './api.js';

let allLectures = [];

async function initApp() {
    // 1. 状態の初期化
    initStore();

    // 2. データの取得
    try {
        allLectures = await fetchLectures();
        // 3. UIの初期描画（今後、ui/grid.js などに分離していく）
        console.log("アプリ起動準備完了", allLectures.length, "件の講義をロード");
        // renderAll(); // まだ定義していないのでコメントアウト
    } catch (err) {
        // エラー表示ロジック
    }
}

initApp();
