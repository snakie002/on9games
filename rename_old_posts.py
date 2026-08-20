import os
import re
import json

BLOG_DIR = r"C:\Blog\on9games\src\blog\WordPress"

def slugify(title):
    """Convert title to URL-friendly slug"""
    # Remove common prefixes like 【POE】
    title = re.sub(r'【[^】]+】\s*', '', title)
    # Remove special chars, keep Chinese and alphanumeric
    title = re.sub(r'[^\w\s\u4e00-\u9fff-]', '', title)
    # Replace spaces with underscores
    title = re.sub(r'\s+', '_', title.strip())
    # Truncate to reasonable length
    if len(title) > 60:
        title = title[:60]
    return title.rstrip('_')

def get_post_info(filepath):
    """Extract title and date from frontmatter"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract frontmatter
    match = re.match(r'^---\r?\n(.*?)\r?\n---', content, re.DOTALL)
    if not match:
        return None, None
    
    fm = match.group(1)
    
    # Extract title
    title_match = re.search(r'title:\s*"([^"]+)"', fm)
    title = title_match.group(1) if title_match else None
    
    # Extract date
    date_match = re.search(r'date:\s*"([^"]+)"', fm)
    date = date_match.group(1) if date_match else None
    
    return title, date

def generate_new_name(title, date):
    """Generate new folder name from title and date"""
    if not date:
        return None
    
    # Extract YYMMDD from date (YYYY-MM-DD)
    parts = date.split('-')
    if len(parts) != 3:
        return None
    
    yy = parts[0][2:]  # Last 2 digits of year
    mm = parts[1]
    dd = parts[2]
    
    date_prefix = f"{yy}{mm}{dd}"
    
    if title:
        slug = slugify(title)
        return f"{date_prefix}-{slug}"
    
    return date_prefix

def main():
    renames = []
    errors = []
    
    for folder in os.listdir(BLOG_DIR):
        if not folder.startswith('old ('):
            continue
        
        folder_path = os.path.join(BLOG_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        
        md_file = os.path.join(folder_path, 'index.md')
        if not os.path.exists(md_file):
            errors.append(f"{folder}: no index.md")
            continue
        
        title, date = get_post_info(md_file)
        new_name = generate_new_name(title, date)
        
        if new_name:
            renames.append({
                'old': folder,
                'new': new_name,
                'title': title,
                'date': date
            })
        else:
            errors.append(f"{folder}: could not generate name (title={title}, date={date})")
    
    # Sort by date
    renames.sort(key=lambda x: x['date'] or '')
    
    # Print summary
    print(f"\n=== RENAME PLAN ===")
    print(f"Total posts to rename: {len(renames)}")
    print(f"Errors: {len(errors)}")
    
    # Check for conflicts
    new_names = [r['new'] for r in renames]
    duplicates = set([n for n in new_names if new_names.count(n) > 1])
    if duplicates:
        print(f"\nWARNING: {len(duplicates)} duplicate names found!")
        for dup in sorted(duplicates):
            print(f"  - {dup}")
    
    # Print first 10 as example
    print(f"\n=== FIRST 10 RENAMES ===")
    for r in renames[:10]:
        print(f"  {r['old']} -> {r['new']}")
        print(f"    Title: {r['title'][:60]}...")
        print(f"    Date: {r['date']}")
    
    # Save full plan to JSON
    plan_file = os.path.join(BLOG_DIR, 'rename_plan.json')
    with open(plan_file, 'w', encoding='utf-8') as f:
        json.dump(renames, f, ensure_ascii=False, indent=2)
    print(f"\nFull plan saved to: {plan_file}")
    
    if errors:
        print(f"\n=== ERRORS ===")
        for e in errors:
            print(f"  {e}")

if __name__ == '__main__':
    main()
