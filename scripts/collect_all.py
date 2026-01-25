import requests
from bs4 import BeautifulSoup
import json
import os
import time
import random

# ==========================================
# 設定エリア
# ==========================================
# ★必ず実際のURLに書き換えてください
BASE_URL = "https://syllabus.kumamoto-u.ac.jp/pub/syllabus.html" 
YEAR = "2025"

# 取得対象の学部コード (22:理学部, 26:工学部など)
TARGET_DEPTS = ["26"] 

# ★重要: ID探索範囲
# テスト用に狭く設定しています。本番では range(0, 99999) や
# 以前取得したリストを使う必要があります。
ID_RANGE = range(3000, 3005) 

OUTPUT_FILE = "data/detail_lectures.json"

# ==========================================
# 解析ロジック
# ==========================================

def get_lecture_detail(dept_code, lecture_id_num):
    # IDを5桁ゼロ埋め (例: 3004 -> "03004")
    lecture_id = f"{lecture_id_num:05}"
    
    params = {
        "locale": "ja",
        "nendo": YEAR,
        "jikanwari_shozokucd": dept_code,
        "jikanwaricd": lecture_id,
        "nendoS": YEAR,
        "jikanwari_shozokucdS": dept_code,
        "limitS": "100"
    }

    try:
        response = requests.get(BASE_URL, params=params)
        if response.status_code != 200:
            return None
            
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, 'html.parser')

        # -------------------------------------------------
        # HTML解析 (更新版)
        # -------------------------------------------------
        
        # 1. 存在確認 (コードがない＝ページ無効と判断)
        code_tag = soup.find("span", id="basicCode")
        if not code_tag:
            return None
        print(code_tag)
        # 2. 科目名 (ここを修正)
        title_j = soup.find("span", id="basicNameJ")
        title_e = soup.find("span", id="basicNameE")
        
        # 日本語名を優先、なければ英語名、それもなければ"名称不明"
        if title_j and title_j.text.strip():
            title_text = title_j.get_text(strip=True)
        elif title_e and title_e.text.strip():
            title_text = title_e.get_text(strip=True)
        else:
            title_text = "名称不明"

        # 3. その他の情報
        when_tag = soup.find("span", id="basicWhen")
        prof_tag = soup.find("span", id="basicProfs")
        semes_tag = soup.find("span", id="basicSemes")
        
        lecture_data = {
            "dept_code": dept_code,
            "id": lecture_id,
            "title": title_text,
            "teacher": prof_tag.get_text(" ", strip=True) if prof_tag else "",
            "period": when_tag.get_text(" ", strip=True) if when_tag else "",
            "semester": semes_tag.get_text(strip=True) if semes_tag else "",
            "url": response.url
        }
        
        return lecture_data

    except Exception as e:
        # 接続エラーなどはログに出すが、処理は継続
        print(f"Error fetching {dept_code}-{lecture_id}: {e}")
        return None

def main():
    results = []
    print("詳細データの取得を開始します...")
    print(f"ターゲット学部: {TARGET_DEPTS}")
    print(f"探索ID範囲: {ID_RANGE}")

    for dept in TARGET_DEPTS:
        for i in ID_RANGE:
            # サーバー負荷対策 (0.5~1.0秒待機)
            time.sleep(random.uniform(0.5, 1.0))
            
            # 進捗が見えるようにIDを表示（改行なし）
            print(f"\rScanning {dept}-{i:05}...", end="")
            
            data = get_lecture_detail(dept, i)
            
            if data:
                print(f" [HIT] {data['title']}")
                results.append(data)
    
    print("\n" + "="*30)
    
    # データを保存
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=4)

    print(f"完了: 合計 {len(results)} 件取得")
    print(f"ファイル: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()