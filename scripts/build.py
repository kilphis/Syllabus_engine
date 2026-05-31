#!/usr/bin/env python3
"""
Build Script - Simply copies cleaned data to public directory
No anonymization - real data for practical use
"""
import json
import os
import shutil

INPUT_FILE = "data/cleaned_lectures.json"
OUTPUT_FILE = "public/data/lectures.json"

def main():
    # 1. Copy data
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Run data collection scripts first.")
        return 1
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    print(f"Copying {INPUT_FILE} to {OUTPUT_FILE}...")
    shutil.copy2(INPUT_FILE, OUTPUT_FILE)
    
    # 2. Sync src to public
    print("Syncing src/ to public/...")
    src_dir = "src"
    public_dir = "public"
    
    for root, dirs, files in os.walk(src_dir):
        # Determine the relative path from src
        rel_path = os.path.relpath(root, src_dir)
        dest_path = os.path.join(public_dir, rel_path)
        
        os.makedirs(dest_path, exist_ok=True)
        
        for file in files:
            if file.startswith('.'): continue # Skip hidden files
            src_file = os.path.join(root, file)
            dest_file = os.path.join(dest_path, file)
            shutil.copy2(src_file, dest_file)

    # Count lectures for confirmation
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        lectures = json.load(f)
    
    print(f"✓ Build complete! {len(lectures)} lectures copied to {OUTPUT_FILE}")
    return 0

if __name__ == "__main__":
    exit(main())
