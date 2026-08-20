import os
import json

BLOG_DIR = r"C:\Blog\on9games\src\blog\WordPress"
PLAN_FILE = os.path.join(BLOG_DIR, 'rename_plan.json')

def main():
    with open(PLAN_FILE, 'r', encoding='utf-8') as f:
        renames = json.load(f)
    
    success = 0
    errors = []
    
    for r in renames:
        old_path = os.path.join(BLOG_DIR, r['old'])
        new_path = os.path.join(BLOG_DIR, r['new'])
        
        if not os.path.exists(old_path):
            errors.append(f"Source not found: {r['old']}")
            continue
        
        if os.path.exists(new_path):
            errors.append(f"Target exists: {r['new']}")
            continue
        
        try:
            os.rename(old_path, new_path)
            success += 1
        except Exception as e:
            errors.append(f"Failed {r['old']}: {e}")
    
    print(f"\n=== RENAME COMPLETE ===")
    print(f"Success: {success}")
    print(f"Errors: {len(errors)}")
    
    if errors:
        print(f"\n=== ERRORS ===")
        for e in errors:
            print(f"  {e}")

if __name__ == '__main__':
    main()
