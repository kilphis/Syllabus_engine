import requests
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import YEAR, MASTER_DEPTS_URL, LIST_API_URL, DATA_DIR, ALL_CODES_FILE

def fetch_active_departments():
    print("--- Step 1: 所属マスターを取得中 ---")
    try:
        response = requests.get(MASTER_DEPTS_URL, params={"locale": "ja"}, timeout=10)
        response.raise_for_status()
        data = response.json()
        dept_map = {item[0]: item[1] for item in data[1:] if item[0]}
        print(f"成功: {len(dept_map)} の所属を特定しました。")
        return dept_map
    except Exception as e:
        print(f"Error: {e}")
        return {}

def fetch_ids_for_dept(dept_code, dept_name):
    params = {
        "locale": "ja",
        "nendo": YEAR,
        "jikanwari_shozokucd": dept_code,
        "limitS": "9999"
    }
    try:
        response = requests.get(LIST_API_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        if len(data) <= 1:
            return []
        return [
            {
                "id": row[3],
                "term_code": row[4],
                "title": row[5],
                "teacher": row[6] if len(row) > 6 else ""
            }
            for row in data[1:]
        ]
    except Exception as e:
        print(f"  [Skip] {dept_name}({dept_code}) でエラー発生: {e}")
        return []

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"対象年度: {YEAR}")

    departments = fetch_active_departments()
    if not departments:
        return

    master_id_map = {}
    print("\n--- Step 2: 全講義IDの自動収集を開始 ---")
    for code, name in departments.items():
        print(f"Scanning: {name} ({code})...", end="", flush=True)
        time.sleep(0.5)
        ids = fetch_ids_for_dept(code, name)
        if ids:
            master_id_map[code] = {"dept_name": name, "count": len(ids), "lectures": ids}
            print(f" -> {len(ids)}件発見")
        else:
            print(" -> 0件 (スキップ)")

    with open(ALL_CODES_FILE, "w", encoding="utf-8") as f:
        json.dump(master_id_map, f, ensure_ascii=False, indent=4)

    total = sum(d['count'] for d in master_id_map.values())
    print(f"\n【同期完了】{total} 件 → {ALL_CODES_FILE}")

if __name__ == "__main__":
    main()
