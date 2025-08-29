from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

# -------------------------
# User Model (customers)
# -------------------------
class User(UserMixin, db.Model):
    __tablename__ = "users"   # ✅ not "user", safer for SQLAlchemy/Postgres
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    # Relationships
    addresses = db.relationship("Address", backref="user", lazy=True)
    orders = db.relationship("Order", backref="user", lazy=True)


# -------------------------
# Address Model
# -------------------------
class Address(db.Model):
    __tablename__ = 'address'
    id = db.Column(db.Integer, primary_key=True)
    street = db.Column(db.String(200))
    city = db.Column(db.String(100))
    pincode = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # ✅ fixed FK


# -------------------------
# Order Model
# -------------------------
class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # ✅ fixed FK
    customer_name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(32), nullable=False, index=True)
    address = db.Column(db.Text, nullable=False)
    items = db.Column(db.JSON, nullable=False)   # cart JSON
    subtotal = db.Column(db.Float, nullable=False, default=0.0)
    delivery = db.Column(db.Float, nullable=False, default=0.0)
    total = db.Column(db.Float, nullable=False, default=0.0)
    payment_mode = db.Column(db.String(32), nullable=False, default="COD")
    status = db.Column(db.String(32), nullable=False, default="pending")  # pending, out_for_delivery, delivered, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# -------------------------
# Order OTP Model
# -------------------------
class OrderOTP(db.Model):
    __tablename__ = "order_otps"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    otp = db.Column(db.String(16), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    tries = db.Column(db.Integer, default=0)
    used = db.Column(db.Boolean, default=False)

    order = db.relationship("Order", backref=db.backref("otps", lazy="dynamic"))


# -------------------------
# OTP Model (verification)
# -------------------------
class OTP(db.Model):
    __tablename__ = "otps"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# -------------------------
# Admin Model (for dashboard)
# -------------------------
class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)  # hashed


# -------------------------
# Product Model
# -------------------------
class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=True)
    subcategory = db.Column(db.String(120))
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    stock = db.Column(db.Integer, nullable=False, default=0)
    unit = db.Column(db.String(20))   # e.g. kg, L, pcs
    image_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
