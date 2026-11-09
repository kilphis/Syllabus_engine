# proposals

## P1 ブラウザで実機確認してコミット
- 状態: 未着手（リファクタ済み・未コミット）
- 期限の目安: 次に触るとき
- 私（ユーザー）にしてほしいこと: `cd public && python3 -m http.server 8000` で開き、講義の追加/削除・タブ切替・ダブルクリックで名前変更・共有URL・壁紙/ICS/Obsidian出力を触って確認。問題なければ「P1 採用」と一言。
- Claudeがすること: 差分をコミット（挙動確認の結果に応じて修正）。

## P2 Tailwind CDN をビルド済みCSSに置き換え
- 状態: 未着手
- 期限の目安: 余裕があるとき
- 私（ユーザー）にしてほしいこと: 「P2 採用」
- Claudeがすること: `cdn.tailwindcss.com`（本番非推奨・毎回実行時にCSS生成）をやめ、Tailwind CLI で静的CSSを生成。初回表示の高速化。

## P3 export.js / calendar.js の store 直結化
- 状態: 未着手
- 期限の目安: 余裕があるとき
- 私（ユーザー）にしてほしいこと: 「P3 採用」
- Claudeがすること: `(allLectures, timetableData)` を引数で渡す形をやめ、`selectedLectures()` 等のセレクタに統一。壁紙のHTML組み立てに `esc()` も適用。
