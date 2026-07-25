import pandas as pd
import sys
import os

# Add parent directory to path so we can import from database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Restaurant, MenuItem

def import_data(file_path):
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print(f"Reading {file_path}...")
    df = pd.read_excel(file_path)
    
    # Track created restaurants to avoid duplicates
    restaurant_cache = {}
    
    items_added = 0
    
    for index, row in df.iterrows():
        area = str(row['Area']).strip()
        block = str(row['Block']).strip()
        rest_name = str(row['Restaurant']).strip()
        category = str(row['Category']).strip()
        item_name = str(row['Item']).strip()
        variant = str(row['Variant']) if pd.notna(row['Variant']) else None
        
        # Handle cases where price might be non-numeric or missing
        try:
            price = float(row['Price'])
        except (ValueError, TypeError):
            price = 0.0
            
        notes = str(row['Notes']) if pd.notna(row['Notes']) else None
        
        # Get or create restaurant
        rest_key = (area, block, rest_name)
        if rest_key not in restaurant_cache:
            rest = db.query(Restaurant).filter_by(name=rest_name, block=block, area=area).first()
            if not rest:
                rest = Restaurant(name=rest_name, block=block, area=area)
                db.add(rest)
                db.flush() # get the ID
            restaurant_cache[rest_key] = rest
        
        rest = restaurant_cache[rest_key]
        
        # Add menu item
        menu_item = MenuItem(
            restaurant_id=rest.id,
            category=category,
            item_name=item_name,
            variant=variant,
            price=price,
            notes=notes
        )
        db.add(menu_item)
        items_added += 1
        
        # Commit every 500 items to save memory
        if items_added % 500 == 0:
            db.commit()
            print(f"Added {items_added} items...")
            
    db.commit()
    db.close()
    print(f"Successfully imported {items_added} menu items!")

if __name__ == "__main__":
    file_path = "/Users/prabhjotsingh/Desktop/bot bot/Project2_merged_data.xlsx"
    if os.path.exists(file_path):
        import_data(file_path)
    else:
        print(f"File not found: {file_path}")
