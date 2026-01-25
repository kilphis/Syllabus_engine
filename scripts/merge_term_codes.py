import json
import os

# ファイルパス設定
LIST_FILE = "data/all_course_codes.json"  # 新しく作った「正解のターム情報入り」リスト
DETAIL_FILE = "data/raw_details.json"     # すでに持っている「詳細データ」
OUTPUT_FILE = "data/raw_details_patched.json" # 合体後のファイル

def main():
    print("--- データの接ぎ木（マージ）を開始 ---")

    # 1. リストファイルから「ID -> タームコード」の辞書を作成
    with open(LIST_FILE, "r", encoding="utf-8") as f:
        list_data = json.load(f)
    
    term_map = {}
    for dept_code, content in list_data.items():
        for lec in content["lectures"]:
            # IDをキーにして、term_code (row[4]) を覚える
            term_map[lec["id"]] = lec.get("term_code")

    print(f"リストから {len(term_map)} 件のターム情報をロードしました。")

    # 2. 詳細データにターム情報を注入
    with open(DETAIL_FILE, "r", encoding="utf-8") as f:
        details = json.load(f)

    patched_count = 0
    for item in details:
        lec_id = item.get("code") # 詳細データのIDキー
        if lec_id in term_map:
            # ここで上書き！詳細データの曖昧なsemesではなく、リストの正確なコードを使う
            item["semes"] = term_map[lec_id] 
            patched_count += 1
    
    # 3. 保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(details, f, ensure_ascii=False, indent=4)

    print(f"完了: {patched_count} 件のデータに正確なターム情報を注入しました。")
    print(f"保存先: {OUTPUT_FILE}")
    print("次は clean_data.py の入力ファイルを 'data/raw_details_patched.json' に変更して実行してください。")

if __name__ == "__main__":
    main()
