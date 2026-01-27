import json
import os

# 入出力設定
INPUT_FILE = "../data/raw_details.json"
OUTPUT_FILE = "../data/cleaned_lectures.json"

def map_semester(semes_value):
    s = str(semes_value)
    
    # 真のマッピング定義
    mapping = {
        "1": ["前期", "T1", "T2"],
        "2": ["後期", "T3", "T4"],
        "3": ["通年", "前期", "後期", "T1", "T2", "T3", "T4"],
        "4": ["集中"],
        "5": ["年度", "通年"],
        "6": ["T1", "前期"],
        "7": ["T2", "前期"],
        "8": ["T3", "後期"],
        "9": ["T4", "後期"]
    }
    
    return mapping.get(s, ["その他"])

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} が見つかりません。")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    cleaned_data = []

    for item in raw_data:
        # 1. 曜日・時限の正規化
        periods = []
        if "when" in item and isinstance(item["when"], list):
            for w in item["when"]:
                try:
                    periods.append({
                        "day": int(w.get("yobi")),   # 1=月...
                        "time": int(w.get("jigen"))  # 1=1限...
                    })
                except (ValueError, TypeError):
                    continue

        # 2. データの軽量化とタグ付け
        cleaned_item = {
            "id": item.get("code"),
            "title": item.get("nameJp"),
            "title_en": item.get("nameEn"),
            "teacher": item.get("profs"),
            "periods": periods,
            "tags": map_semester(item.get("semes")), # 論理タグを追加
            "dept": item.get("dept_name"),
            "grade": item.get("grade")
        }
        
        # タイトルが存在するもののみリストに加える
        if cleaned_item["title"]:
            cleaned_data.append(cleaned_item)

    # 3. 成果物の保存
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=4)

    print(f"--- クレンジング完了 ---")
    print(f"入力: {len(raw_data)} 件")
    print(f"出力: {len(cleaned_data)} 件 (軽量化・タグ付与済み)")
    print(f"保存先: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()