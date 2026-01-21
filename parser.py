# 01home/01academia/00_infra/syllabus_engine/utils/parser.py

from bs4 import BeautifulSoup

def parse_department_codes(html_content):
    """HTMLから所属コードと名称の辞書を抽出する"""
    soup = BeautifulSoup(html_content, 'html.parser')
    select_tag = soup.find('select', {'name': 'jikanwari_shozokucd'})
    
    if not select_tag:
        return None
    
    return {
        option.get('value'): option.text.strip() 
        for option in select_tag.find_all('option') 
        if option.get('value')
    }