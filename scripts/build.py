#!/usr/bin/env python3
"""
Build Script - Copies cleaned data to public/data/lectures.json
Run after data collection scripts to update the deployed data.
"""
import json
import os
import shutil

INPUT_FILE = "data/cleaned_lectures.json"
OUTPUT_FILE = "public/data/lectures.json"

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Run data collection scripts first.")
        return 1

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    shutil.copy2(INPUT_FILE, OUTPUT_FILE)

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        lectures = json.load(f)

    print(f"✓ Build complete! {len(lectures)} lectures copied to {OUTPUT_FILE}")
    return 0

if __name__ == "__main__":
    exit(main())
