import os
import json
import re

BLOG_DIR = r"C:\Blog\on9games\src\blog"

def get_date_from_md(filepath):
    """Extract date from frontmatter"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'date:\s*"([^"]+)"', content)
        return match.group(1) if match else None
    except:
        return None

def get_year_from_date(date_str):
    """Extract YY from YYYY-MM-DD"""
    if date_str and len(date_str) >= 4:
        return date_str[2:4]
    return None

def main():
    redirects = []
    
    # Walk through all blog folders
    for root, dirs, files in os.walk(BLOG_DIR):
        if 'index.md' not in files:
            continue
        
        # Get the folder name (slug)
        folder_name = os.path.basename(root)
        
        # Skip if it's a year folder (23, 24, 25, 26)
        if re.match(r'^\d{2}$', folder_name):
            continue
        
        # Get the relative path from BLOG_DIR
        rel_path = os.path.relpath(root, BLOG_DIR)
        parts = rel_path.split(os.sep)
        
        # Determine the category (Snakie, Hfok, Others, WordPress)
        category = parts[0] if parts else None
        
        # Get date from frontmatter
        md_file = os.path.join(root, 'index.md')
        date = get_date_from_md(md_file)
        year = get_year_from_date(date)
        
        if not year:
            continue
        
        # Old URL: /folder-name/
        old_url = f"/{folder_name}/"
        
        # New URL: /YY/folder-name/
        new_url = f"/{year}/{folder_name}/"
        
        # Only add redirect if old != new
        if old_url != new_url:
            redirects.append((old_url, new_url))
    
    # Sort by old URL
    redirects.sort(key=lambda x: x[0])
    
    # Write _redirects file
    redirects_file = os.path.join(r"C:\Blog\on9games\src", '_redirects')
    with open(redirects_file, 'w', encoding='utf-8') as f:
        for old_url, new_url in redirects:
            f.write(f"{old_url} {new_url} 301\n")
    
    print(f"Generated {len(redirects)} redirects")
    print(f"Saved to: {redirects_file}")
    
    # Print first 10 as example
    print(f"\n=== FIRST 10 REDIRECTS ===")
    for old_url, new_url in redirects[:10]:
        print(f"  {old_url} -> {new_url}")

if __name__ == '__main__':
    main()
