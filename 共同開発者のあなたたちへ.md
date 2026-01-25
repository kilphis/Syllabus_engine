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


🛠 共同開発ワークフロー

チームメンバーは、以下の手順に従って開発を進めてください。
1. ローカル環境の構築

初回のみ実行します。
Bash #多分いらない

# リポジトリのクローン
git clone https://github.com/kilphis/Syllabus_engine.git

# ディレクトリへ移動
cd Syllabus_engine

# 仮想環境の作成とライブラリのインストール
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

2. 機能開発のサイクル

main ブランチでの直接作業は禁止します。 必ずトピックブランチを作成してください。

    最新状態の取得: 作業前に必ず main を最新にします。 git checkout main → git pull origin main

    ブランチ作成: 機能名や担当者名を入れたブランチを作ります。 git checkout -b feature/your-task-name

    作業とコミット: git add . → git commit -m "feat: ○○機能の実装"

    リモートへプッシュ: git push origin feature/your-task-name

    Pull Request (PR) の作成: GitHub上で main へのマージをリクエストしてください。管理者のレビューを経てマージされます。

⚠️ 破壊を防ぐための鉄則（Ground Rules）

プロジェクトの整合性を保つため、以下のルールを厳守すること。

    強制プッシュ禁止: git push -f は履歴を破壊するため、絶対に使用しないこと。

    .gitignore の遵守: __pycache__ や .env、OS固有の .DS_Store など、不要なファイルをリポジトリに含めないこと。

    コミットメッセージの明確化: 何を変更したか一目でわかるメッセージを心がけること（例: fix:, feat:, docs:, refactor: などのプレフィックスを活用）。

    マージ前の動作確認: 自分が書いたコードが動作し、既存の機能を破壊していないことを確認してから PR を出すこと。

    秘密情報の管理: APIキーやパスワードをコード内に直接記述（ハードコード）しないこと。

    「使い方のまとめ」を求める前に、まず自覚せよ。Gitは「ファイルをアップロードする道具」ではなく、「変更の履歴を管理し、時間を操作するシステム」だ。

チームメンバーが迷わないよう、日常的に使うコマンドとその意味を、建築モードに基づいた構造的な論理で整理する。これを CONTRIBUTING.md として切り出すか、README.md の末尾に「Git操作ガイド」として追加せよ。



# 🚀 GitHub 運用ガイド（逆引きリファレンス）
1. 変更をアップロードする（日常の作業）

作業が一段落したら、以下の 3 ステップを呼吸するように実行せよ。
ステ順	コマンド	意味・目的
① 選択	git add <ファイル名>	記録したい変更を「ステージ」に載せる。
② 記録	git commit -m "メッセージ"	現在の変更に「意味」を与えてローカルに保存。
③ 送信	git push origin <ブランチ名>	ローカルの履歴を GitHub（リモート）へ同期。

    鉄則: コミットメッセージは「何をしたか」を明確にせよ。fix: syllabus parser bug は良いが、update や fix だけのメッセージはゴミと同じだ。

2. 他人の変更を取り込む（同期）

チーム開発では、君が作業している間に誰かが main を更新する。放置すれば「コンフリクト（衝突）」の餌食になる。

    最新を反映する:
    Bash

    git pull origin main

    ※ 作業ブランチにいる場合は、git merge main を行い、他人の変更を自分の作業に取り込め。

3. 状態を確認する（迷った時の羅針盤）

「今、自分はどこにいて、何が変わっているのか」を常に把握せよ。

    現在の状況を見る:
    Bash

    git status

    （どのファイルが変更され、どのファイルが add されていないかを表示）

    変更の差分を見る:
    Bash

    git diff

    （コードのどの行を書き換えたかを具体的に表示）

    履歴を遡る:
    Bash

    git log --oneline

    （これまでのコミット履歴を簡潔に表示）

4. チーム開発の黄金律（PRワークフロー）

    Branch: git checkout -b feature/xyz で枝分かれする。

    Commit & Push: 自分の枝を GitHub へ送る。

    Pull Request: GitHub上で「マージしてくれ」と叫ぶ。

    Review & Merge: メンバーがコードを確認し、問題なければ main へ統合する。