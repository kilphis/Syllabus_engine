# 01home/01academia/00_infra/syllabus_engine/main.py

import requests
import json
import os
import config, parser

def sync_departments():
    print("学部コードの同期を開始します...")
    
    # 1. データ取得
    try:
        response = requests.get(config.BASE_URL, params={"nendo": "2025", "locale": "ja"})
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        
        # 2. 解析 (parserに丸投げ)
        dept_map = parser.parse_department_codes(response.text)
        
        if not dept_map:
            print("エラー: 学部情報の抽出に失敗しました。")
            return

        # 3. 保存 (configのパスを使用)
        os.makedirs(config.DATA_DIR, exist_ok=True)
        save_path = os.path.join(config.DATA_DIR, config.DEPT_JSON_NAME)
        
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(dept_map, f, ensure_ascii=False, indent=4)
            
        print(f"完了: {len(dept_map)}件の学部を登録しました。")

    except Exception as e:
        print(f"実行エラー: {e}")

if __name__ == "__main__":
    sync_departments()