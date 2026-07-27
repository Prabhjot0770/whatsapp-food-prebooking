import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import models
import os
from google import genai

# Configure Gemini AI with your key (loaded from .env via main.py)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    _genai_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    _genai_client = None

def ask_ai_recommendation(user_prompt: str, menu_context: str) -> str:
    if not _genai_client:
        return "AI is not configured yet. Please set GEMINI_API_KEY in your .env file."
    system_instruction = (
        "You are LPU FoodBot, a friendly campus food assistant.\n"
        f"Here is the available campus food menu:\n{menu_context}\n\n"
        "Answer the student's question accurately, suggest matching items with exact prices, "
        "and keep responses concise for WhatsApp!"
    )
    response = _genai_client.models.generate_content(
        model="gemini-1.5-flash",
        contents=f"{system_instruction}\nStudent asks: {user_prompt}"
    )
    return response.text

# In-memory state store (use Redis in production)
user_states = {}

# ─── helpers ────────────────────────────────────────────────────────────────

def _fmt_item(item):
    tag = "🥗" if item.category and "veg" in item.category.lower() else "🍽️"
    restaurant_name = item.restaurant.name if item.restaurant else "Unknown"
    # Ensure price is a positive number; otherwise show N/A
    try:
        price_val = float(item.price)
    except Exception:
        price_val = 0
    price_str = f"₹{int(price_val)}" if price_val > 0 else "₹N/A"
    return f"{tag} {item.item_name} – {price_str} ({restaurant_name})"

def _menu_block(items, header=""):
    lines = [header] if header else []
    for item in items:
        lines.append(_fmt_item(item))
    return "\n".join(lines)

def _last_order(student, db):
    return (
        db.query(models.Order)
        .filter(models.Order.student_id == student.id)
        .order_by(models.Order.created_at.desc())
        .first()
    )

def _main_menu_text():
    return (
        "🍔 *Welcome to LPU Food Booking Bot* 🍔\n\n"
        "Please choose an option:\n\n"
        "1️⃣ View Menu\n"
        "2️⃣ Pre Book Food\n"
        "3️⃣ Track Order\n"
        "4️⃣ Help\n\n"
        "(Type the option number)"
    )

# ─── main entry point ────────────────────────────────────────────────────────

def process_message(sender_phone: str, message: str, db: Session) -> tuple[str, bool]:
    msg = message.strip()
    msg_lower = msg.lower()

    # 1. Fetch or create student
    student = db.query(models.Student).filter(models.Student.phone_number == sender_phone).first()
    if not student:
        student = models.Student(
            phone_number=sender_phone,
            name="Student",
            registration_number=f"REG-{sender_phone[-4:]}"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    # Global Resets & Overrides (These take precedence over any state)
    if msg_lower in ["hi", "hello", "hey", "menu", "start", "0"]:
        user_states[sender_phone] = {"state": "MAIN_MENU", "menu_map": {}}
        return _main_menu_text(), False
        
    if msg_lower == "cancel":
        user_states[sender_phone] = {"state": "IDLE"}
        return "❌ Operation cancelled. Type *menu* to go back to the main menu.", False

    # Get Current State
    state_info = user_states.get(sender_phone, {"state": "MAIN_MENU", "menu_map": {}})
    current_state = state_info.get("state", "MAIN_MENU")
    menu_map = state_info.get("menu_map", {})

    # ── State: EXPECTING_PICKUP_TIME ───────────────────────────────────────
    if current_state == "EXPECTING_PICKUP_TIME":
        pickup_time = msg
        order_items_data = state_info.get("order_items", [])

        if not order_items_data:
            user_states[sender_phone] = {"state": "MAIN_MENU"}
            return "Something went wrong. Let's start over. Type *menu*.", False

        restaurant_id = order_items_data[0].restaurant_id
        total_amount = sum(item.price for item in order_items_data)

        order = models.Order(
            student_id=student.id,
            restaurant_id=restaurant_id,
            status="CONFIRMED",
            pickup_time=pickup_time,
            total_amount=total_amount
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        item_names = []
        for mi in order_items_data:
            oi = models.OrderItem(order_id=order.id, menu_item_id=mi.id, quantity=1, price=mi.price)
            db.add(oi)
            item_names.append(mi.item_name)
        db.commit()

        user_states[sender_phone] = {"state": "MAIN_MENU"}
        items_str = ", ".join(item_names)
        return (
            f"✅ *Order Confirmed!*\n\n"
            f"🆔 Order ID: #LPU{order.id}\n"
            f"🍱 Items: {items_str}\n"
            f"⏰ Pickup Time: {pickup_time}\n"
            f"💰 Total: ₹{total_amount}\n\n"
            f"Please collect your order at the selected time. Enjoy your meal! 😋\n\n"
            f"(Type *menu* to return to the main menu)"
        ), True

    # ── State: CONFIRM_CANCEL ────────────────────────────────────────────────
    if current_state == "CONFIRM_CANCEL":
        order = state_info.get("order")
        if any(w in msg_lower for w in ["yes", "confirm", "ok", "yeah", "haan"]):
            if order:
                order.status = "CANCELLED"
                db.commit()
            user_states[sender_phone] = {"state": "MAIN_MENU"}
            return f"❌ Order #LPU{order.id} has been cancelled. Sorry to see you go! Type *menu* to start over.", False
        else:
            user_states[sender_phone] = {"state": "MAIN_MENU"}
            return "✅ No worries! Your order is still active. Type *menu* to go back.", False

    # ════════════════════════════════════════════════════════════════════════
    #  STRUCTURED NUMERICAL NAVIGATION (STATE MACHINE)
    # ════════════════════════════════════════════════════════════════════════
    
    if current_state == "MAIN_MENU":
        if msg == "1" or msg == "2":
            # Flow: Select Area
            areas = db.query(models.Restaurant.area).filter(models.Restaurant.area != None).distinct().all()
            if not areas:
                return "No areas available right now. Type *menu* to go back.", False
                
            lines = ["📍 *Select an Area*\n"]
            new_map = {}
            for i, (area_name,) in enumerate(areas, 1):
                # Clean up empty strings just in case
                if area_name.strip():
                    lines.append(f"{i}. {area_name}")
                    new_map[str(i)] = area_name
                    
            lines.append("\n_Type a number to select_")
            user_states[sender_phone] = {"state": "SELECT_AREA", "menu_map": new_map}
            return "\n".join(lines), False
            
        elif msg == "3":
            # Track Order
            last = _last_order(student, db)
            if not last:
                return "You don't have any recent orders. Type *menu* to place your first order! 😊", False
            status_emoji = {"CONFIRMED": "✅", "PENDING": "⏳", "CANCELLED": "❌"}.get(last.status, "📦")
            item_names = ", ".join(i.menu_item.item_name for i in last.items) if last.items else "N/A"
            return (
                f"📦 *Your Latest Order*\n\n"
                f"🆔 Order #LPU{last.id}\n"
                f"🍱 Items: {item_names}\n"
                f"⏰ Pickup: {last.pickup_time}\n"
                f"💰 Total: ₹{last.total_amount}\n"
                f"{status_emoji} Status: *{last.status}*\n\n"
                f"(Type *menu* to return)"
            ), False
            
        elif msg == "4":
            # Help
            return (
                "🤖 *LPU Food Bot – Help Guide*\n\n"
                "I am now fully menu-driven! Simply reply with the *number* corresponding to your choice in the menu.\n\n"
                "• Type *menu* at any time to start over.\n"
                "• Type *cancel* to stop the current flow.\n\n"
                "I can still answer general queries if you type a normal sentence!"
            ), False
    
    elif current_state == "SELECT_AREA":
        if msg in menu_map:
            selected_area = menu_map[msg]
            restaurants = db.query(models.Restaurant).filter(models.Restaurant.area == selected_area).all()
            if not restaurants:
                return f"No restaurants found in {selected_area}. Type *menu* to go back.", False
                
            lines = [f"🍽️ *Restaurants in {selected_area}*\n"]
            new_map = {}
            for i, r in enumerate(restaurants, 1):
                lines.append(f"{i}. {r.name}")
                new_map[str(i)] = r.id
                
            lines.append("\n_Type a number to select_")
            user_states[sender_phone] = {
                "state": "SELECT_RESTAURANT", 
                "menu_map": new_map, 
                "area": selected_area
            }
            return "\n".join(lines), False

    elif current_state == "SELECT_RESTAURANT":
        if msg in menu_map:
            selected_restaurant_id = menu_map[msg]
            restaurant = db.query(models.Restaurant).filter(models.Restaurant.id == selected_restaurant_id).first()
            
            categories = db.query(models.MenuItem.category).filter(
                models.MenuItem.restaurant_id == selected_restaurant_id,
                models.MenuItem.is_available == True,
                models.MenuItem.price > 0
            ).distinct().all()
            
            if not categories:
                return f"No menu available for {restaurant.name} right now. Type *menu* to go back.", False
                
            lines = [f"📋 *Categories in {restaurant.name}*\n"]
            new_map = {}
            idx = 1
            for (cat_name,) in categories:
                if cat_name and cat_name.strip():
                    lines.append(f"{idx}. {cat_name}")
                    new_map[str(idx)] = cat_name
                    idx += 1
                    
            lines.append("\n_Type a number to select_")
            user_states[sender_phone] = {
                "state": "SELECT_CATEGORY", 
                "menu_map": new_map, 
                "restaurant_id": selected_restaurant_id,
                "restaurant_name": restaurant.name
            }
            return "\n".join(lines), False

    elif current_state == "SELECT_CATEGORY":
        if msg in menu_map:
            selected_category = menu_map[msg]
            restaurant_id = state_info.get("restaurant_id")
            restaurant_name = state_info.get("restaurant_name", "Unknown")
            
            items = db.query(models.MenuItem).filter(
                models.MenuItem.restaurant_id == restaurant_id,
                models.MenuItem.category == selected_category,
                models.MenuItem.is_available == True,
                models.MenuItem.price > 0
            ).all()
            
            if not items:
                return "No items available in this category. Type *menu* to go back.", False
                
            lines = [f"🍕 *Items in {selected_category} ({restaurant_name})*\n"]
            new_map = {}
            for i, item in enumerate(items, 1):
                price_val = float(item.price)
                lines.append(f"{i}. {item.item_name} - ₹{int(price_val)}")
                new_map[str(i)] = item.id
                
            lines.append("\n_Type a number to select an item to order_")
            user_states[sender_phone] = {
                "state": "SELECT_ITEM", 
                "menu_map": new_map
            }
            return "\n".join(lines), False

    elif current_state == "SELECT_ITEM":
        if msg in menu_map:
            item_id = menu_map[msg]
            item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
            if not item:
                return "Item not found. Type *menu* to go back.", False
                
            user_states[sender_phone] = {
                "state": "EXPECTING_PICKUP_TIME",
                "order_items": [item]
            }
            return (
                f"😋 *You selected:* {item.item_name} - ₹{int(item.price)}\n\n"
                f"⏰ *What time would you like to pick up?*\n"
                f"(e.g. _12:30 PM_, _1:00 PM_, _5 PM_)\n\n"
                f"_Type 'cancel' to abort._"
            ), False

    # ════════════════════════════════════════════════════════════════════════
    #  FALLBACK TO NLP & LEGACY COMMANDS IF NOT A NUMBER
    # ════════════════════════════════════════════════════════════════════════

    # Only process NLP if the user didn't type a number, or if they typed a number that was invalid for the current menu.
    if msg.isdigit():
        return f"⚠️ Invalid option. Please select a valid number from the menu, or type *menu* to start over.", False

    # Legacy NLP commands...
    if any(w in msg_lower for w in ["cancel order", "cancel my order"]):
        last = _last_order(student, db)
        if not last:
            return "You don't have any active orders to cancel.", False
        if last.status == "CANCELLED":
            return f"Order #LPU{last.id} is already cancelled.", False
        if last.status == "CONFIRMED":
            user_states[sender_phone] = {"state": "CONFIRM_CANCEL", "order": last}
            return (
                f"⚠️ Are you sure you want to cancel Order #LPU{last.id}?\n"
                f"Items: {', '.join(i.menu_item.item_name for i in last.items) if last.items else 'N/A'}\n"
                f"Total: ₹{last.total_amount}\n\n"
                f"Reply *YES* to confirm or *NO* to keep the order."
            ), False
        return f"Order #LPU{last.id} is currently *{last.status}* and cannot be cancelled.", False

    if any(w in msg_lower for w in ["track", "status", "my order", "where is my"]):
        last = _last_order(student, db)
        if not last:
            return "You don't have any recent orders. Type *menu* to place your first order! 😊", False
        status_emoji = {"CONFIRMED": "✅", "PENDING": "⏳", "CANCELLED": "❌"}.get(last.status, "📦")
        item_names = ", ".join(i.menu_item.item_name for i in last.items) if last.items else "N/A"
        return (
            f"📦 *Your Latest Order*\n\n"
            f"🆔 Order #LPU{last.id}\n"
            f"🍱 Items: {item_names}\n"
            f"⏰ Pickup: {last.pickup_time}\n"
            f"💰 Total: ₹{last.total_amount}\n"
            f"{status_emoji} Status: *{last.status}*"
        ), False

    # AI fallback for complex queries
    if len(msg.split()) > 3 or "?" in msg_lower:
        menu_items = db.query(models.MenuItem).filter(models.MenuItem.is_available == True).limit(50).all()
        menu_context = _menu_block(menu_items, "📋 Menu Overview (limited)")
        ai_response = ask_ai_recommendation(msg, menu_context)
        return ai_response, False

    # Catch-all
    return (
        "🤔 I didn't quite catch that.\n\n"
        "Please type *menu* to see the structured options, or type a descriptive sentence if you want AI assistance!"
    ), False
