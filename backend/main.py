import os
from fastapi import FastAPI, Request, Depends, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import engine, get_db, Base
import models
from chatbot import process_message

from auth_router import router as auth_router
from auth import get_password_hash

# Create all tables (if they don't exist yet)
Base.metadata.create_all(bind=engine)

# Auto-seed default admin user if not present
def seed_admin_user():
    db = next(get_db())
    try:
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            new_admin = models.User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="superadmin"
            )
            db.add(new_admin)
            db.commit()
    except Exception as e:
        print("Seed user exception:", e)
    finally:
        db.close()

seed_admin_user()

app = FastAPI(title="Smart WhatsApp Food Pre-Booking System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def read_root():
    return {"message": "WhatsApp Food Bot API is running!"}

# TWILIO WEBHOOK ENDPOINT
@app.post("/whatsapp")
async def whatsapp_webhook(
    request: Request,
    Body: str = Form(...),
    From: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Twilio sends a POST request here when a user messages the WhatsApp Sandbox.
    """
    # phone_number comes as "whatsapp:+1234567890"
    sender_phone = From.replace("whatsapp:", "")
    user_message = Body.strip()
    
    # Process the message
    response_text, new_order = process_message(sender_phone, user_message, db)
    
    if new_order:
        import asyncio
        asyncio.create_task(manager.broadcast("NEW_ORDER"))
        
    # Twilio expects TwiML XML format for responses
    from twilio.twiml.messaging_response import MessagingResponse
    resp = MessagingResponse()
    resp.message(response_text)
    
    from fastapi.responses import Response
    return Response(content=str(resp), media_type="application/xml")

@app.post("/api/menu/{item_id}/toggle")
def toggle_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_available = not item.is_available
    db.commit()
    return {"message": "Toggled", "is_available": item.is_available}

# API ENDPOINTS FOR WEB DASHBOARD
class OrderResponse(BaseModel):
    id: int
    student_id: int
    restaurant_id: int
    status: str
    pickup_time: str
    total_amount: float
    created_at: str

    class Config:
        from_attributes = True

@app.get("/api/orders", response_model=List[dict])
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    result = []
    for o in orders:
        student_name = o.student.name if o.student else "Unknown"
        restaurant_name = o.restaurant.name if o.restaurant else "Unknown"
        items = [{"name": item.menu_item.item_name, "quantity": item.quantity} for item in o.items]
        
        result.append({
            "id": o.id,
            "student_name": student_name,
            "restaurant_name": restaurant_name,
            "status": o.status,
            "pickup_time": o.pickup_time,
            "total_amount": o.total_amount,
            "items": items,
            "created_at": str(o.created_at)
        })
    return result

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_orders = db.query(models.Order).count()
    total_revenue = sum([o.total_amount for o in db.query(models.Order).all()])
    total_students = db.query(models.Student).count()
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_students": total_students
    }

@app.get("/api/menu")
def get_menu(db: Session = Depends(get_db)):
    items = db.query(models.MenuItem).limit(500).all() # Limit to 500 for performance
    result = []
    for i in items:
        result.append({
            "id": i.id,
            "restaurant": i.restaurant.name if i.restaurant else "Unknown",
            "category": i.category,
            "item_name": i.item_name,
            "price": i.price,
            "is_available": i.is_available
        })
    return result
