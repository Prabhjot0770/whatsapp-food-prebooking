from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True) # If null, user is superadmin
    role = Column(String, default="vendor")

    restaurant = relationship("Restaurant")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    orders = relationship("Order", back_populates="student")

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    block = Column(String)
    area = Column(String)
    
    menu_items = relationship("MenuItem", back_populates="restaurant")
    orders = relationship("Order", back_populates="restaurant")

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    category = Column(String, index=True)
    item_name = Column(String, index=True)
    variant = Column(String, nullable=True)
    price = Column(Float)
    notes = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    
    restaurant = relationship("Restaurant", back_populates="menu_items")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    status = Column(String, default="PENDING") # PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
    pickup_time = Column(String)
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="orders")
    restaurant = relationship("Restaurant", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"))
    quantity = Column(Integer, default=1)
    price = Column(Float)
    
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
