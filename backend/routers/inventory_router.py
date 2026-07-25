from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter()

@router.get("/inventory", response_model=list[dict])
def list_inventory(db: Session = Depends(get_db)):
    items = db.query(models.MenuItem).all()
    return [{
        "id": i.id,
        "restaurant": i.restaurant.name if i.restaurant else None,
        "category": i.category,
        "item_name": i.item_name,
        "price": i.price,
        "is_available": i.is_available,
    } for i in items]

@router.post("/inventory/{item_id}/toggle")
def toggle_item(item_id: int, db: Session = Depends(get_db)):

    item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_available = not item.is_available
    db.commit()
    return {"message": "Toggled", "is_available": item.is_available}
