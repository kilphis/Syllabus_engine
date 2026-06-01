# ここだけ変更すれば年度対応できる
YEAR = "2026"

# API エンドポイント
REST_BASE_URL = "https://syllabus.kumamoto-u.ac.jp/rest"
MASTER_DEPTS_URL = f"{REST_BASE_URL}/master/shozoku.json"
LIST_API_URL = f"{REST_BASE_URL}/auth/syllabusList.json"
DETAIL_API_URL = f"{REST_BASE_URL}/auth/courseInfoBasic.json"

# データ保存先（プロジェクトルートからの相対パス）
DATA_DIR = "data"
ALL_CODES_FILE = f"{DATA_DIR}/all_course_codes.json"
RAW_DETAILS_FILE = f"{DATA_DIR}/raw_details.json"
CLEANED_FILE = f"{DATA_DIR}/cleaned_lectures.json"
PUBLIC_DATA_FILE = "public/data/lectures.json"
