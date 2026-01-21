This is my first repositor made for me.

syllabus_engine/
├── main.py             # 【指揮官】全体の流れ（Extract -> Transform -> Load）を記述
├── data/               # 【倉庫】一時的なJSONや最終的なテーブルを保管
└── utils/              # 【道具箱】具体的な作業を分担
    ├── config.py       # 【定数】URL、年度、保存先パスなどの「設定」のみを持つ
    ├── generator.py    # 【設計】パラメータからURLを組み立てる「URL生成」専用
    └── parser.py       # 【解析】HTMLから中身を抜き出す「スクレイピング」専用

    依存の方向は、具体utils -> 抽象　main
    4. なぜこのように分けるのか？（建築的メリット）

    メンテナンス性: 大学のURLが変わったら config.py だけ、HTMLのタグが変わったら parser.py だけを直せば済み、全体の流れ（main.py）を壊さずに済みます。

    再利用性: 「カレンダーに表示するツール」を作るとき、parser.py だけを別のプロジェクトに持っていけます。

    情報の可視化: あなたが「今、どの層のコードを書いているか」を意識することで、スパゲッティコード化（全ての機能が1ファイルに混ざること）を防げます。
    