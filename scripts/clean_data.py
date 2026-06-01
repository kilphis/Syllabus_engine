import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import RAW_DETAILS_FILE, CLEANED_FILE

def map_semester(semes_value):
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
    return mapping.get(str(semes_value), ["その他"])

def main():
    if not os.path.exists(RAW_DETAILS_FILE):
        print(f"Error: {RAW_DETAILS_FILE} が見つかりません。extract_details.py を先に実行してください。")
        return

    with open(RAW_DETAILS_FILE, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    cleaned_data = []
    for item in raw_data:
        periods = []
        if "when" in item and isinstance(item["when"], list):
            for w in item["when"]:
                try:
                    periods.append({"day": int(w.get("yobi")), "time": int(w.get("jigen"))})
                except (ValueError, TypeError):
                    continue

        cleaned_item = {
            "id": item.get("code"),
            "title": item.get("nameJp"),
            "title_en": item.get("nameEn"),
            "teacher": item.get("profs"),
            "periods": periods,
            "tags": map_semester(item.get("semes")),
            "dept": item.get("dept_name"),
            "grade": item.get("grade")
        }
        if cleaned_item["title"]:
            cleaned_data.append(cleaned_item)

    os.makedirs(os.path.dirname(CLEANED_FILE), exist_ok=True)
    with open(CLEANED_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=4)

    print(f"クレンジング完了: {len(raw_data)} 件 → {len(cleaned_data)} 件 → {CLEANED_FILE}")

if __name__ == "__main__":
    main()
