import requests
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import YEAR, DETAIL_API_URL, ALL_CODES_FILE, RAW_DETAILS_FILE

def main():
    if not os.path.exists(ALL_CODES_FILE):
        print(f"Error: {ALL_CODES_FILE} が見つかりません。sync_all_syllabus.py を先に実行してください。")
        return

    with open(ALL_CODES_FILE, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    all_details = []
    print(f"--- Step 2: 講義詳細情報の全件取得を開始 (年度: {YEAR}) ---")

    for dept_code, dept_info in master_data.items():
        dept_name = dept_info["dept_name"]
        lectures = dept_info["lectures"]
        print(f"\n学部: {dept_name} ({len(lectures)}件)")

        for lec in lectures:
            params = {
                "locale": "ja",
                "nendo": YEAR,
                "jikanwari_shozokucd": dept_code,
                "jikanwaricd": lec["id"]
            }
            try:
                response = requests.get(DETAIL_API_URL, params=params, timeout=10)
                data = response.json()
                if data and len(data) > 0:
                    detail = data[0]
                    detail["dept_code"] = dept_code
                    detail["dept_name"] = dept_name
                    all_details.append(detail)
                    print(f"\r  取得中: {lec['id']} {detail.get('nameJp', '')[:20]}...", end="")
                time.sleep(0.1)
            except Exception as e:
                print(f"\n  [Error] {lec['id']}: {e}")

    with open(RAW_DETAILS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_details, f, ensure_ascii=False, indent=4)

    print(f"\n\n完了! {len(all_details)} 件 → {RAW_DETAILS_FILE}")

if __name__ == "__main__":
    main()
