# クマダイ時間割

熊本大学のシラバスを、使いやすく。

大学1年生のとき、時間割登録期間にシラバスにアクセスすると重くなる、複数の講義を並べて比較できない、という体験から作り始めたWebアプリです。
新入生が「URLを開くだけ」で使えることを最優先に設計しています。

**→ [クマダイ時間割を開く](https://syllabus-engine.vercel.app)**

** [使い心地の評価もお願いします](https://docs.google.com/forms/d/e/1FAIpQLSeck0NLwS5-R0kFzdxHvJlPDCKxDreAJfMhHWmTu7YPHr-Lnw/viewform)**
---

## 機能

- **仮時間割の作成** — 気になる講義をワンクリックでカレンダーに追加・削除
- **複数講義の比較** — 同じ時間帯に被った講義を並べて確認
- **シラバスへの直リンク** — セルから公式シラバスに即アクセス
- **時間割の印刷** — そのままプリントアウトできるレイアウト
- **ローカル保存** — ブラウザを閉じても時間割が消えない（LocalStorage）
- **時間割コードの表示** — sosekiへの入力の際に便利

---

## 仕組み

ログイン不要・サーバーなし・完全静的で動作します。

```
Python スクリプト（年度更新時のみ実行）
  └─ 熊本大学シラバスAPI を叩く
  └─ 全学部の講義データを JSON に変換
        ↓
JavaScript（ブラウザ側）
  └─ lectures.json を読み込んで時間割を描画
  └─ 操作結果を LocalStorage に保存
```

講義データは年度更新時に手動でビルドし、Vercel にデプロイします。

---

## ローカルで動かす

```bash
# データ収集（年度更新時のみ）
uv run scripts/sync_all_syllabus.py   # 全講義IDを収集
uv run scripts/extract_details.py     # 詳細情報を取得
uv run scripts/clean_data.py          # データをクリーニング
uv run scripts/build.py               # public/data/lectures.json に出力

# ローカルサーバーで確認
python -m http.server 8000 --directory public
# → http://localhost:8000
```

---

## 年度更新の手順

1. `scripts/config.py` の `YEAR` を新年度に変更
2. 上記のデータ収集スクリプトを順番に実行（`extract_details.py` は完了を待ってから次へ）
3. 動作確認後、Vercel にデプロイ

---

## 技術スタック

| レイヤー | 使用技術 |
|---|---|
| フロントエンド | Vanilla JS (ES Modules), Tailwind CSS |
| データ収集 | Python 3, uv, requests |
| ホスティング | Vercel（静的配信） |

---

## 開発者

熊本大学 情報系  
[GitHub](https://github.com/kilphis/Syllabus_engine) / [お問い合わせ](mailto:258x1143@st.kumamoto-u.ac.jp)
