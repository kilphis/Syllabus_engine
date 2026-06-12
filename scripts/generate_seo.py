#!/usr/bin/env python3
"""
SEO Generation Script
Generates:
  - public/lessons/{id}/index.html  (6852 static lecture detail pages)
  - public/sitemap.xml
  - public/robots.txt
"""
import json
import os
from pathlib import Path
from datetime import date

BASE_URL = "https://syllabus-engine.vercel.app"
LECTURES_FILE = Path("public/data/lectures.json")
OUTPUT_DIR = Path("public")
LESSONS_DIR = OUTPUT_DIR / "lessons"
YEAR = 2026

DAY_MAP = {1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土"}


def format_periods(periods):
    if not periods:
        return "集中講義"
    return "・".join(
        f"{DAY_MAP.get(p.get('day', 0), '?')}{p.get('time', '?')}限"
        for p in periods
    )


def generate_lecture_html(lecture: dict) -> str:
    lid = lecture["id"]
    title = lecture["title"].strip()
    title_en = lecture.get("title_en", "").strip()
    teacher = lecture.get("teacher", "").strip()
    dept = lecture.get("dept", "").strip()
    grade = lecture.get("grade", "").strip()
    tags = lecture.get("tags", [])
    periods_str = format_periods(lecture.get("periods", []))

    term_tags = [t for t in tags if t in ("前期", "後期", "T1", "T2", "T3", "T4", "集中")]
    term_str = "・".join(term_tags)

    meta_title = f"【熊大シラバス{YEAR}】{title}（{teacher}）- クマダイ時間割"
    meta_desc = (
        f"熊本大学{YEAR}年度「{title}」のシラバス情報。"
        f"担当：{teacher}。{dept} {grade}年次。"
        f"開講期間：{term_str}。時間割コード：{lid}。"
        f"sosekiより高速にシラバス確認・時間割作成ができます。"
    )

    en_block = f'<p class="en">{title_en}</p>' if title_en else ""
    periods_display = f"{term_str}　{periods_str}" if term_str else periods_str

    json_ld = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": title,
            "courseCode": lid,
            "description": meta_desc,
            "provider": {"@type": "Organization", "name": "熊本大学"},
            "instructor": {"@type": "Person", "name": teacher},
        },
        ensure_ascii=False,
    )

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{meta_title}</title>
<meta name="description" content="{meta_desc}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="{meta_title}">
<meta property="og:description" content="{meta_desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="{BASE_URL}/lessons/{lid}/">
<meta property="og:site_name" content="クマダイ時間割">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{meta_title}">
<meta name="twitter:description" content="{meta_desc}">
<link rel="canonical" href="{BASE_URL}/lessons/{lid}/">
<script type="application/ld+json">{json_ld}</script>
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;margin:0;padding:0}}
.container{{max-width:720px;margin:0 auto;padding:2rem 1rem}}
.card{{background:#fff;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.1);border:1px solid #e2e8f0;padding:2rem;margin-bottom:1.5rem}}
h1{{font-size:1.5rem;font-weight:800;margin:0 0 .25rem;line-height:1.3}}
.en{{color:#64748b;font-size:.9rem;margin:.25rem 0 1.5rem}}
.info-grid{{display:grid;grid-template-columns:auto 1fr;gap:.5rem 1rem;font-size:.95rem}}
.label{{color:#64748b;font-weight:600;white-space:nowrap}}
.value{{color:#1e293b}}
.cta{{display:block;background:#3b82f6;color:#fff;text-align:center;padding:1rem;border-radius:.75rem;font-weight:700;font-size:1rem;text-decoration:none;margin-top:1.5rem}}
.cta:hover{{background:#2563eb}}
.back{{color:#64748b;font-size:.85rem;text-decoration:none}}
.back:hover{{color:#1e293b}}
nav{{margin-bottom:1.5rem}}
footer{{font-size:.8rem;color:#94a3b8;text-align:center;margin-top:1rem}}
</style>
</head>
<body>
<div class="container">
<nav><a href="{BASE_URL}" class="back">← クマダイ時間割 トップへ</a></nav>
<div class="card">
<h1>{title}</h1>
{en_block}
<div class="info-grid">
<span class="label">担当教員</span><span class="value">{teacher}</span>
<span class="label">所属</span><span class="value">{dept}</span>
<span class="label">対象年次</span><span class="value">{grade}年次</span>
<span class="label">開講期間</span><span class="value">{periods_display}</span>
<span class="label">時間割コード</span><span class="value">{lid}</span>
</div>
<a href="{BASE_URL}" class="cta">時間割シミュレーターで時間割を組む →</a>
</div>
<footer>© {YEAR} クマダイ時間割 | 熊本大学非公式時間割アプリ</footer>
</div>
</body>
</html>"""


def generate_sitemap(lecture_ids: list[str]) -> str:
    today = date.today().isoformat()
    entries = [f"""  <url>
    <loc>{BASE_URL}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
    <lastmod>{today}</lastmod>
  </url>"""]
    for lid in lecture_ids:
        entries.append(f"""  <url>
    <loc>{BASE_URL}/lessons/{lid}/</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
    <lastmod>{today}</lastmod>
  </url>""")
    body = "\n".join(entries)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{body}
</urlset>"""


def main() -> int:
    with open(LECTURES_FILE, encoding="utf-8") as f:
        lectures = json.load(f)

    LESSONS_DIR.mkdir(parents=True, exist_ok=True)

    for i, lecture in enumerate(lectures):
        lid = lecture["id"]
        lesson_dir = LESSONS_DIR / lid
        lesson_dir.mkdir(exist_ok=True)
        (lesson_dir / "index.html").write_text(
            generate_lecture_html(lecture), encoding="utf-8"
        )
        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{len(lectures)} 件生成済み...")

    print(f"✓ 講義個別ページ {len(lectures)} 件 → {LESSONS_DIR}")

    sitemap = generate_sitemap([lec["id"] for lec in lectures])
    (OUTPUT_DIR / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"✓ sitemap.xml 生成 ({len(lectures) + 1} URLs)")

    robots = f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n"
    (OUTPUT_DIR / "robots.txt").write_text(robots, encoding="utf-8")
    print("✓ robots.txt 生成")

    return 0


if __name__ == "__main__":
    exit(main())
