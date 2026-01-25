import requests
import json
import os
import time

# 設定
ID_LIST_FILE = "data/all_course_codes.json"
OUTPUT_FILE = "data/raw_details.json"
BASE_DETAIL_URL = "https://syllabus.kumamoto-u.ac.jp/rest/auth/courseInfoBasic.json"

def main():
    if not os.path.exists(ID_LIST_FILE):
        print(f"Error: {ID_LIST_FILE} が見つかりません。Step 1を実行してください。")
        return

    with open(ID_LIST_FILE, "r", encoding="utf-8") as f:
        master_data = json.load(f)

    all_details = []
    
    print("--- Step 2: 講義詳細情報の全件取得を開始 ---")
    
    for dept_code, dept_info in master_data.items():
        dept_name = dept_info["dept_name"]
        lectures = dept_info["lectures"]
        
        print(f"\n学部: {dept_name} ({len(lectures)}件)")
        
        for lec in lectures:
            lec_id = lec["id"]
            
            # APIを叩いて詳細を取得
            params = {
                "locale": "ja",
                "nendo": "2025",
                "jikanwari_shozokucd": dept_code,
                "jikanwaricd": lec_id
            }
            
            try:
                response = requests.get(BASE_DETAIL_URL, params=params, timeout=10)
                data = response.json()
                
                if data and len(data) > 0:
                    detail = data[0]
                    # 元のIDや学部名も紐付けて保存
                    detail["dept_code"] = dept_code
                    detail["dept_name"] = dept_name
                    all_details.append(detail)
                    print(f"\r  取得中: {lec_id} {detail.get('nameJp', '')[:15]}...", end="")
                
                # 負荷対策
                time.sleep(0.1) 
                
            except Exception as e:
                print(f"\n  [Error] {lec_id}: {e}")

    # 保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_details, f, ensure_ascii=False, indent=4)

    print(f"\n\n完了! 全 {len(all_details)} 件の詳細データを {OUTPUT_FILE} に保存しました。")

if __name__ == "__main__":
    main()
