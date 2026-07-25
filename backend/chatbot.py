import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import models

# In-memory state store (use Redis in production)
user_states = {}

# ─── helpers ────────────────────────────────────────────────────────────────

def _fmt_item(item):
    tag = "🥗" if item.category and "veg" in item.category.lower() else "🍽️"
    restaurant_name = item.restaurant.name if item.restaurant else "Unknown"
    price = int(item.price) if item.price == int(item.price) else item.price
    return f"{tag} {item.item_name} – ₹{price} ({restaurant_name})"

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

    state_info = user_states.get(sender_phone, {"state": "IDLE"})
    current_state = state_info["state"]

    # ── State: waiting for pickup time ───────────────────────────────────────
    if current_state == "EXPECTING_PICKUP_TIME":
        # Allow cancellation mid-flow
        if any(w in msg_lower for w in ["cancel", "no", "stop", "quit", "exit"]):
            user_states[sender_phone] = {"state": "IDLE"}
            return "No problem! Your order has been cancelled. Type *Hi* to start again. 😊", False

        pickup_time = msg
        order_items_data = state_info.get("order_items", [])

        if not order_items_data:
            user_states[sender_phone] = {"state": "IDLE"}
            return "Something went wrong. Let's start over — what would you like to order?", False

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

        user_states[sender_phone] = {"state": "IDLE"}
        items_str = ", ".join(item_names)
        return (
            f"✅ *Order Confirmed!*\n\n"
            f"🆔 Order ID: #LPU{order.id}\n"
            f"🍱 Items: {items_str}\n"
            f"⏰ Pickup Time: {pickup_time}\n"
            f"💰 Total: ₹{total_amount}\n\n"
            f"Please collect your order at the selected time. Enjoy your meal! 😋"
        ), True

    # ── State: waiting for cancel confirmation ────────────────────────────────
    if current_state == "CONFIRM_CANCEL":
        order = state_info.get("order")
        if any(w in msg_lower for w in ["yes", "confirm", "ok", "yeah", "haan"]):
            if order:
                order.status = "CANCELLED"
                db.commit()
            user_states[sender_phone] = {"state": "IDLE"}
            return f"❌ Order #LPU{order.id} has been cancelled. Sorry to see you go! Type *Hi* to place a new order.", False
        else:
            user_states[sender_phone] = {"state": "IDLE"}
            return "✅ No worries! Your order is still active. Type *track* to check its status.", False

    # ════════════════════════════════════════════════════════════════════════
    #  INTENT DETECTION
    # ════════════════════════════════════════════════════════════════════════

    # ── Greetings ─────────────────────────────────────────────────────────
    if msg_lower in ["hi", "hello", "hey", "hii", "helo", "start", "1"] or msg_lower == "menu":
        return (
            "👋 *Welcome to LPU Food Pre-Booking Bot!*\n\n"
            "Here's what I can do:\n\n"
            "🍔 *Order Food* – just say what you want\n"
            "   e.g. _I want Paneer Tikka_\n\n"
            "📋 *Browse Menu* – by category, restaurant, or budget\n"
            "   e.g. _Show me veg items_\n"
            "   e.g. _What's under ₹100?_\n"
            "   e.g. _Show menu of Punjabi Dhaba_\n\n"
            "📦 *Track Order* – type _track_\n\n"
            "❌ *Cancel Order* – type _cancel_\n\n"
            "❓ *Help* – type _help_"
        ), False

    # ── Help ──────────────────────────────────────────────────────────────
    if "help" in msg_lower or msg_lower == "4":
        return (
            "🤖 *LPU Food Bot – Help Guide*\n\n"
            "You can talk to me naturally! Here are examples:\n\n"
            "• _I want a Veg Burger_\n"
            "• _Show me pizza options_\n"
            "• _What's cheapest under ₹80?_\n"
            "• _Show me non-veg items_\n"
            "• _Show menu of Taste of Punjab_\n"
            "• _Track my order_\n"
            "• _Cancel my order_\n"
            "• _What restaurants are available?_\n\n"
            "Type *Hi* to go back to the main menu."
        ), False

    # ── Cancel order ──────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["cancel", "cancel order", "cancel my order"]):
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

    # ── Track order ───────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["track", "status", "my order", "order status", "where is my"]) or msg_lower == "3":
        last = _last_order(student, db)
        if not last:
            return "You don't have any recent orders. Type *Hi* to place your first order! 😊", False
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

    # ── What restaurants are available? ───────────────────────────────────
    if any(w in msg_lower for w in ["restaurant", "restaurants", "stalls", "outlets", "canteen", "which restaurant"]):
        restaurants = db.query(models.Restaurant).all()
        if not restaurants:
            return "No restaurants are registered yet.", False
        lines = ["🏪 *Available Restaurants on Campus:*\n"]
        for r in restaurants:
            lines.append(f"• {r.name}")
        lines.append("\nType _Show menu of [restaurant name]_ to see their items!")
        return "\n".join(lines), False

    # ── Show menu of a specific restaurant ───────────────────────────────
    restaurant_match = re.search(r"(?:menu of|from|at)\s+(.+)", msg_lower)
    if restaurant_match:
        restaurant_name = restaurant_match.group(1).strip()
        restaurant = db.query(models.Restaurant).filter(
            models.Restaurant.name.ilike(f"%{restaurant_name}%")
        ).first()
        if restaurant:
            items = db.query(models.MenuItem).filter(
                models.MenuItem.restaurant_id == restaurant.id,
                models.MenuItem.is_available == True
            ).limit(15).all()
            if items:
                header = f"📋 *Menu – {restaurant.name}* (showing up to 15 items)\n"
                return _menu_block(items, header), False
            return f"No available items at {restaurant.name} right now.", False

    # ── Budget filter: under ₹X ───────────────────────────────────────────
    budget_match = re.search(r"(?:under|below|less than|cheapest|cheap|budget|₹?rs?\.?\s*)(\d+)", msg_lower)
    if budget_match:
        budget = int(budget_match.group(1))
        items = (
            db.query(models.MenuItem)
            .filter(models.MenuItem.price <= budget, models.MenuItem.is_available == True)
            .order_by(models.MenuItem.price.asc())
            .limit(10)
            .all()
        )
        if items:
            header = f"💸 *Items under ₹{budget}* (cheapest first):\n"
            return _menu_block(items, header) + "\n\nJust tell me what you want to order! 😊", False
        return f"No available items under ₹{budget} right now. Try a higher budget.", False

    # ── Veg filter ────────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["veg", "vegetarian", "only veg", "pure veg", "no meat"]):
        items = (
            db.query(models.MenuItem)
            .filter(models.MenuItem.category.ilike("%veg%"), models.MenuItem.is_available == True)
            .limit(12)
            .all()
        )
        if items:
            header = "🥗 *Vegetarian Items Available:*\n"
            return _menu_block(items, header) + "\n\nTell me what you'd like to order!", False
        return "No vegetarian items found. Please try again later.", False

    # ── Non-veg filter ────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["non veg", "non-veg", "chicken", "mutton", "egg", "meat", "fish"]):
        keyword_items = (
            db.query(models.MenuItem)
            .filter(
                or_(
                    models.MenuItem.item_name.ilike("%chicken%"),
                    models.MenuItem.item_name.ilike("%mutton%"),
                    models.MenuItem.item_name.ilike("%egg%"),
                    models.MenuItem.item_name.ilike("%fish%"),
                    models.MenuItem.item_name.ilike("%prawn%"),
                ),
                models.MenuItem.is_available == True
            )
            .limit(12)
            .all()
        )
        if keyword_items:
            header = "🍗 *Non-Vegetarian Items Available:*\n"
            return _menu_block(keyword_items, header) + "\n\nTell me what you'd like to order!", False
        return "No non-veg items found right now. Please try again later.", False

    # ── Category browse (snacks, drinks, biryani, etc.) ──────────────────
    category_keywords = ["snack", "drink", "beverage", "dessert", "breakfast", "lunch", "dinner",
                         "coffee", "tea", "juice", "burger", "pizza", "sandwich", "roll",
                         "biryani", "thali", "paratha", "noodle", "maggi", "pasta"]
    for cat in category_keywords:
        if cat in msg_lower:
            items = (
                db.query(models.MenuItem)
                .filter(
                    or_(
                        models.MenuItem.item_name.ilike(f"%{cat}%"),
                        models.MenuItem.category.ilike(f"%{cat}%")
                    ),
                    models.MenuItem.is_available == True
                )
                .limit(10)
                .all()
            )
            if items:
                header = f"🔍 *Search results for '{cat.title()}':*\n"
                return _menu_block(items, header) + "\n\nReply with what you'd like to order! 😋", False

    # ── Order intent: "I want X", "order X", "give me X", "get me X" ─────
    order_prefixes = ["i want", "i'd like", "i would like", "order", "give me", "get me",
                      "book", "pre-book", "prebook", "can i get", "please get"]
    is_order_intent = any(msg_lower.startswith(p) or p in msg_lower for p in order_prefixes)

    # ── General keyword food search ───────────────────────────────────────
    clean = msg_lower
    for prefix in order_prefixes:
        clean = clean.replace(prefix, "")
    clean = re.sub(r'\b(a|an|the|some|please|me)\b', '', clean)

    # Split by comma/and for multiple items
    raw_terms = re.split(r'[,&]| and ', clean)
    search_terms = [t.strip() for t in raw_terms if len(t.strip()) > 2]

    found_items = []
    for term in search_terms:
        items = (
            db.query(models.MenuItem)
            .filter(models.MenuItem.item_name.ilike(f"%{term}%"), models.MenuItem.is_available == True)
            .limit(3)
            .all()
        )
        found_items.extend(items)

    # Fallback: word-by-word
    if not found_items:
        for word in msg_lower.split():
            if len(word) > 3:
                items = (
                    db.query(models.MenuItem)
                    .filter(models.MenuItem.item_name.ilike(f"%{word}%"), models.MenuItem.is_available == True)
                    .limit(3)
                    .all()
                )
                if items:
                    found_items.extend(items)
                    break

    # De-duplicate
    found_items = list({item.id: item for item in found_items}.values())

    if found_items:
        items_str = "\n".join([f"• {_fmt_item(i)}" for i in found_items])
        user_states[sender_phone] = {
            "state": "EXPECTING_PICKUP_TIME",
            "order_items": found_items
        }
        return (
            f"😋 *Great choice!* I found:\n\n"
            f"{items_str}\n\n"
            f"💰 Total: ₹{sum(i.price for i in found_items)}\n\n"
            f"⏰ *What time would you like to pick up?*\n"
            f"(e.g. _12:30 PM_, _1:00 PM_, _5 PM_)\n\n"
            f"_Type 'cancel' to go back._"
        ), False

    # ── Nothing matched ───────────────────────────────────────────────────
    return (
        "🤔 I couldn't find that item (it might be out of stock).\n\n"
        "Try:\n"
        "• _Show me veg items_\n"
        "• _What's under ₹100?_\n"
        "• _Show me Pizza_\n"
        "• _What restaurants are available?_\n\n"
        "Or type *Hi* for the main menu."
    ), False
