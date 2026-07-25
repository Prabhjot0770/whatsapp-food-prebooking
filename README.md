# WhatsApp Food Pre-Booking Platform

A campus food ordering system where students place orders entirely through WhatsApp — no app install required — while vendors manage incoming orders on a real-time web dashboard.

Built on a real, messy, multi-restaurant dataset spanning 54 restaurants across 7 campus areas, this project pairs a stateful conversational bot with a full FastAPI backend and a live React dashboard, connected by WebSockets so an order placed in a WhatsApp chat appears on a vendor's screen instantly, with no page refresh.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

Most campus food ordering happens through improvised systems — WhatsApp group chats, handwritten slips, or apps built for cities that don't map onto hostel blocks and shared canteens. This project treats WhatsApp itself as the ordering interface, since it's the one app every student already has open, and pairs it with a proper backend so that "chat with a bot" doesn't mean "data goes nowhere."

Every order placed in the WhatsApp conversation is written into a relational database with a real lifecycle (`PENDING → CONFIRMED → PREPARING → READY → COMPLETED`, with `CANCELLED` available throughout) and pushed live to a vendor-facing dashboard the moment it's placed.

## Features

**Student-facing (WhatsApp)**
- Browse restaurant menus by campus area or restaurant name
- Place an order and specify a pickup time
- Track an active order's status
- Cancel an order, with a confirmation step to prevent accidental cancellations
- Stateful conversation handling — the bot remembers what step of an order flow a student is in, without needing an external AI API call

**Vendor-facing (Web Dashboard)**
- Live order feed — new orders appear via WebSocket the instant they're placed, no refresh needed
- Update order status (preparing, ready, completed) with a click
- Toggle menu item availability on the fly — reflected immediately in what the bot tells students
- Analytics: total orders, total revenue, total students served
- Authenticated login (JWT-based), with role support for per-restaurant vendor accounts vs. a superadmin view

## Architecture

```
                     ┌─────────────────┐
   Student           │                 │
   (WhatsApp) ──────▶│  Twilio Sandbox │
                      │                 │
                      └────────┬────────┘
                               │ POST /whatsapp
                               ▼
                     ┌─────────────────────────────┐
                     │        FastAPI Backend       │
                     │  ┌─────────────────────────┐ │
                     │  │  chatbot.py              │ │      ┌──────────────────┐
                     │  │  (stateful conversation  │ │      │                  │
                     │  │   engine)                │ │◀────▶│  SQLite Database │
                     │  └─────────────────────────┘ │      │  (SQLAlchemy ORM)│
                     │  ┌─────────────────────────┐ │      └──────────────────┘
                     │  │  REST API (/api/*)       │ │
                     │  │  Auth (/auth/*, JWT)     │ │
                     │  └─────────────────────────┘ │
                     │  ┌─────────────────────────┐ │
                     │  │  WebSocket (/ws)         │ │
                     │  └────────────┬────────────┘ │
                     └───────────────┼───────────────┘
                                      │ live "NEW_ORDER" broadcast
                                      ▼
                     ┌─────────────────────────────┐
   Vendor            │   React Dashboard            │
   (Web Browser) ────▶│   (orders, analytics, menu) │
                     └─────────────────────────────┘
```

The key design decision: a single incoming WhatsApp message triggers a database write, a real-time broadcast, *and* a chat reply — all in one request cycle. The WhatsApp bot and the web dashboard aren't two separate systems bolted together; they're two views into one continuously updated source of truth.

**Why a rule-based conversation engine instead of an LLM?** The bot uses a deterministic state machine (see `chatbot.py`) rather than calling out to a language model. For a transactional system handling real orders and real money, predictability outweighs conversational flexibility — there's no risk of a hallucinated price or a misremembered order, and no per-message API cost.

## Tech Stack

| Layer | Technology |
|---|---|
| WhatsApp integration | Twilio WhatsApp Sandbox / API |
| Backend framework | FastAPI |
| ORM / Database | SQLAlchemy + SQLite |
| Real-time updates | FastAPI WebSockets |
| Auth | JWT (`python-jose`), password hashing via `passlib` |
| Frontend framework | React 19 + Vite |
| Routing | React Router |
| Charts / analytics | Recharts |
| Notifications | react-hot-toast |
| Icons | lucide-react |

## Project Structure

```
.
├── backend/
│   ├── main.py            # FastAPI app: Twilio webhook, REST API, WebSocket endpoint
│   ├── chatbot.py          # Stateful conversation engine
│   ├── models.py           # SQLAlchemy models (Student, Restaurant, MenuItem, Order, OrderItem, User)
│   ├── database.py         # DB engine/session setup
│   ├── auth.py              # Password hashing, JWT creation/verification
│   ├── auth_router.py       # /auth/token, /auth/me endpoints
│   ├── websocket_router.py  # WebSocket connection handling
│   └── food_booking.db      # SQLite database (pre-populated from the campus menu dataset)
├── frontend/
│   ├── src/                # React dashboard source
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── Project2_merged_data.xlsx  # Source menu dataset — 54 restaurants, 7 campus areas
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Twilio](https://www.twilio.com/try-twilio) account (free tier is sufficient for the WhatsApp Sandbox)
- [ngrok](https://ngrok.com/) (or similar) to expose your local backend to Twilio during development

### Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy twilio "python-jose[cryptography]" "passlib[bcrypt]" python-multipart pandas openpyxl
uvicorn main:app --reload --port 8000
```

> **Note:** This repo doesn't currently include a `requirements.txt`. Once your environment is working, generate one to lock it in:
> ```bash
> pip freeze > requirements.txt
> ```

### Expose the backend to Twilio

```bash
ngrok http 8000
```

In the Twilio Console: **Messaging → Try it out → Send a WhatsApp message → Sandbox settings**, set "When a message comes in" to:
```
https://<your-ngrok-subdomain>.ngrok-free.dev/whatsapp
```
Method: `POST`.

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard will run on Vite's default port (typically `5173`) and communicate with the backend's REST (`/api/*`) and WebSocket (`/ws`) endpoints — confirm the backend URL your frontend is configured to call matches wherever `uvicorn` is actually running.

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/whatsapp` | Twilio webhook — receives incoming WhatsApp messages |
| `GET` | `/ws` (WebSocket) | Real-time order broadcast channel for the dashboard |
| `GET` | `/api/orders` | List all orders with student, restaurant, and item details |
| `GET` | `/api/stats` | Aggregate stats: total orders, revenue, students |
| `GET` | `/api/menu` | List menu items (up to 500) |
| `POST` | `/api/menu/{item_id}/toggle` | Toggle a menu item's availability |
| `POST` | `/auth/token` | Vendor login — returns a JWT access token |
| `GET` | `/auth/me` | Return the currently authenticated user |

## Security Notes

A few things to address before this goes anywhere near a real deployment:

- **`SECRET_KEY` in `auth.py` is currently hardcoded** in source (and literally named to warn against production use). Move it to an environment variable before deploying anywhere public:
  ```python
  import os
  SECRET_KEY = os.environ["JWT_SECRET_KEY"]
  ```
- **CORS is currently wide open** (`allow_origins=["*"]`) — fine for local development, but should be restricted to your actual frontend's domain before deployment.
- The Twilio **Sandbox** used here is for development only — it requires each user to manually opt in and isn't guaranteed for production message delivery. A real deployment needs Meta's verified WhatsApp Business API.

## Roadmap

- [ ] Move off Twilio Sandbox to a verified WhatsApp Business sender
- [ ] Replace plain-text menus with WhatsApp's native interactive list/button messages
- [ ] Add a `requirements.txt` and environment-based configuration
- [ ] Deploy backend + frontend to persistent hosting (currently designed for local + ngrok development)
- [ ] Payment integration

## License
MIT
