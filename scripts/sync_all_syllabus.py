import requests
import json
import os
import time

# ==========================================
# 建築設計: エンドポイント定義
# ==========================================
BASE_URL = "https://syllabus.kumamoto-u.ac.jp/rest"
MASTER_DEPTS_URL = f"{BASE_URL}/master/shozoku.json"
LIST_API_URL = f"{BASE_URL}/auth/syllabusList.json"

YEAR = "2025"
DATA_DIR = "data"
OUTPUT_FILE = os.path.join(DATA_DIR, "all_course_codes.json")

def fetch_active_departments():
    """ステップ1: 現在有効な全ての所属コードと名称を取得する"""
    print("--- Step 1: 所属マスターを取得中 ---")
    params = {"locale": "ja"}
    try:
        response = requests.get(MASTER_DEPTS_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        # data[0]はヘッダー['cd', 'name']なので[1:]を回す
        dept_map = {item[0]: item[1] for item in data[1:] if item[0]}
        print(f"成功: {len(dept_map)} の所属を特定しました。")
        return dept_map
    except Exception as e:
        print(f"Error: {e}")
        return {}

def fetch_ids_for_dept(dept_code, dept_name):
    """ステップ2: 特定の学部に紐付く全講義IDを取得する"""
    params = {
        "locale": "ja",
        "nendo": YEAR,
        "jikanwari_shozokucd": dept_code,
        "limitS": "9999" # 全件取得を試みる
    }
    try:
        response = requests.get(LIST_API_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        # data[0]はヘッダー。データがない場合は[項目名]のみが返る
        if len(data) <= 1:
            return []

        # JS解析に基づき index 3 が ID, index 5 が科目名
        ids = []
        for row in data[1:]:
            ids.append({
                "id": row[3],
                "term_code": row[4],
                "title": row[5],
                "teacher": row[6] if len(row) > 6 else ""
            })
        return ids
    except Exception as e:
        print(f"  [Skip] {dept_name}({dept_code}) でエラー発生: {e}")
        return []

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 1. 所属の自動特定
    departments = fetch_active_departments()
    if not departments:
        return

    # 2. 各所属に対して講義IDを自動収集
    master_id_map = {}
    
    print("\n--- Step 2: 全講義IDの自動収集を開始 ---")
    for code, name in departments.items():
        print(f"Scanning: {name} ({code})...", end="", flush=True)
        
        # サーバーへの礼儀（インターバル）
        time.sleep(0.5)
        
        ids = fetch_ids_for_dept(code, name)
        if ids:
            master_id_map[code] = {
                "dept_name": name,
                "count": len(ids),
                "lectures": ids
            }
            print(f" -> {len(ids)}件発見")
        else:
            print(" -> 0件 (スキップ)")

    # 3. 成果物の保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(master_id_map, f, ensure_ascii=False, indent=4)

    print("\n" + "="*30)
    print(f"【同期完了】")
    print(f"保存先: {OUTPUT_FILE}")
    print(f"総取得件数: {sum(d['count'] for d in master_id_map.values())} 件")

if __name__ == "__main__":
    main()
