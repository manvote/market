from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, abort,session, current_app
from .models import db, bcrypt

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import (
    LoginManager, login_required, current_user,
    login_user, logout_user, UserMixin
)
from decimal import Decimal
from .models import db, Admin, Product, Address, Order, OrderOTP, OTP
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from flask import jsonify
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

# Config
UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXT = {'png','jpg','jpeg','gif','webp'}

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET', 'dev_secret_for_local')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:manha%4004@localhost:5432/supermarket')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Init extensions
db.init_app(app)
bcrypt.init_app(app)

with app.app_context():
    db.create_all()

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "home"



# =====================================================
# MODELS
# =====================================================

class User(db.Model, UserMixin):
    __tablename__ = 'user'   # ✅ fixed double underscore
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password_hash = db.Column("password", db.String(200))

    addresses = db.relationship("Address", backref="user", lazy=True, cascade="all, delete-orphan")
    orders = db.relationship("Order", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
# =====================================================
# LOGIN MANAGER
# =====================================================
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# =====================================================
# ROUTES
# =====================================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/popular')
def popular():
    return render_template('popular.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/privacy')
def privacy(): 
    return render_template('privacy.html')

@app.route('/help')
def help_page():
    return render_template('help.html')

@app.route('/dairy')
def dairy():
    return render_template('dairy.html')

@app.route('/fragrance')
def fragrance():
    return render_template('fragrance.html')

@app.route('/frozen')
def frozen():
    return render_template('frozen.html')

@app.route('/fruits')
def fruits():
    return render_template('fruits.html')

@app.route('/household')
def household():
    return render_template('household.html')

@app.route('/masaladry')
def masaladry():
    return render_template('masaladry.html')

@app.route('/personal')
def personal():
    return render_template('personal.html')

@app.route('/snacks')
def snacks():
    return render_template('snacks.html')

@app.route('/stationary')
def stationeries():
    return render_template('stationary.html')

@app.route('/toys')
def toys():
    return render_template('toys.html')

@app.route('/vegetable')
def vegetable():
    return render_template('vegetable.html')

@app.route('/about')
def about():    
    return render_template('about.html')

@app.route('/careers')
def careers():              
    return render_template('careers.html')

@app.route('/payment')
def payment():            
    return render_template('payment.html')

@app.route('/contact')
def contact():            
    return render_template('contact.html')

# 🔑 Signup
@app.route('/signup', methods=['POST'])
def signup():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    password = request.form['password']

    if User.query.filter_by(email=email).first():
        flash("Email already exists!", "danger")
        return redirect(url_for('home'))

    new_user = User(full_name=name, email=email, phone=phone)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    flash("Signup successful, please login!", "success")
    return redirect(url_for('home'))

# 🔓 Login
@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']

    user = User.query.filter_by(email=email).first()
    if user and user.check_password(password):
        login_user(user)
        flash("Welcome back!", "success")
        return redirect(url_for('dashboard'))

    flash("Invalid credentials!", "danger")
    return redirect(url_for('home'))

@app.route('/logout')
def logout():
    logout_user()
    flash("You have logged out!", "info")
    return redirect(url_for('home'))

# 📊 Dashboard
@app.route('/dashboard')
@login_required
def dashboard():
    addresses = current_user.addresses
    orders = current_user.orders
    return render_template('dashboard.html', user=current_user, addresses=addresses, orders=orders)

# 📌 Profile + Address CRUD
@app.route("/update_profile", methods=["POST"])
@login_required
def update_profile():
    current_user.full_name = request.form["full_name"]
    current_user.email = request.form["email"]
    current_user.phone = request.form["phone"]
    db.session.commit()
    flash("Profile updated!", "success")
    return redirect(url_for("dashboard"))

@app.route("/add_address", methods=["POST"])
@login_required
def add_address():
    addr = Address(
        street=request.form["street"],
        city=request.form["city"],
        pincode=request.form["pincode"],
        user_id=current_user.id
    )
    db.session.add(addr)
    db.session.commit()
    flash("Address added!", "success")
    return redirect(url_for("dashboard"))

@app.route("/update_address/<int:id>", methods=["POST"])
@login_required
def update_address(id):
    addr = Address.query.get_or_404(id)
    if addr.user_id != current_user.id:
        abort(403)
    addr.street = request.form["street"]
    addr.city = request.form["city"]
    addr.pincode = request.form["pincode"]
    db.session.commit()
    flash("Address updated!", "success")
    return redirect(url_for("dashboard"))

@app.route("/delete_address/<int:id>")
@login_required
def delete_address(id):
    addr = Address.query.get_or_404(id)
    if addr.user_id != current_user.id:
        abort(403)
    db.session.delete(addr)
    db.session.commit()
    flash("Address deleted!", "success")
    return redirect(url_for("dashboard"))

@app.route('/assets/<path:filename>')
def custom_static(filename):
    return send_from_directory('assets', filename)


# helper
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in ALLOWED_EXT

# Admin login route
@app.route('/admin/login', methods=['GET','POST'])
def admin_login():
    if 'admin_id' in session:
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        email = request.form.get('email','').strip().lower()
        password = request.form.get('password','')
        admin = Admin.query.filter_by(email=email).first()
        if admin and check_password_hash(admin.password, password):
            session['admin_id'] = admin.id
            flash('Logged in successfully', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials', 'danger')
    return render_template('admin_login.html')

# Dashboard (list products)
@app.route('/admin/dashboard')
def admin_dashboard():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    products = Product.query.order_by(Product.created_at.desc()).all()
    return render_template('admin_dashboard.html', products=products)

# Add product
@app.route('/admin/product/add', methods=['POST'])
def add_product():
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    name = request.form.get('name','').strip()
    category = request.form.get('category','').strip()
    subcategory = request.form.get("subcategory",'').strip()
    price = request.form.get('price','0').strip()
    stock = request.form.get('stock','0').strip()
    unit = request.form.get("unit", "").strip()
    image_url_field = request.form.get('image_url','').strip()

    # validate
    if not name or not price:
        flash('Name and price are required', 'danger')
        return redirect(url_for('admin_dashboard'))

    # parse numeric
    try:
        price_val = Decimal(price)
    except:
        price_val = Decimal('0.00')

    try:
        stock_val = int(stock)
    except:
        stock_val = 0

    # handle file upload
    file = request.files.get('image_file')
    saved_url = None
    if file and file.filename:
        if allowed_file(file.filename):
            filename = secure_filename(file.filename)
            dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            # ensure unique filename
            base, ext = os.path.splitext(filename)
            i = 1
            while os.path.exists(dest):
                filename = f"{base}_{i}{ext}"
                dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                i += 1
            file.save(dest)
            saved_url = url_for('static', filename=f'uploads/{filename}')
        else:
            flash('File type not allowed', 'warning')
            return redirect(url_for('admin_dashboard'))

    final_image = saved_url or image_url_field or None

    p = Product(name=name, category=category or None, subcategory = subcategory or None, price=price_val, stock=stock_val, unit=unit or None, image_url=final_image)
    db.session.add(p)
    db.session.commit()
    flash('Product added', 'success')
    return redirect(url_for('admin_dashboard'))

# Edit product
@app.route('/admin/product/edit/<int:pid>', methods=['POST'])
def edit_product(pid):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))

    p = Product.query.get_or_404(pid)
    name = request.form.get('name','').strip()
    category = request.form.get('category','').strip()
    subcategory = request.form.get("subcategory",'').strip()
    price = request.form.get('price','0').strip()
    stock = request.form.get('stock','0').strip()
    unit = request.form.get("unit", "").strip()
    image_url_field = request.form.get('image_url','').strip()

    if not name or not price:
        flash('Name and price required', 'danger')
        return redirect(url_for('admin_dashboard'))

    try:
        price_val = Decimal(price)
    except:
        price_val = Decimal('0.00')
    try:
        stock_val = int(stock)
    except:
        stock_val = 0

    # image upload handling
    file = request.files.get('image_file')
    if file and file.filename:
        if allowed_file(file.filename):
            filename = secure_filename(file.filename)
            dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            base, ext = os.path.splitext(filename)
            i = 1
            while os.path.exists(dest):
                filename = f"{base}_{i}{ext}"
                dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                i += 1
            file.save(dest)
            p.image_url = url_for('static', filename=f'uploads/{filename}')
        else:
            flash('File type not allowed', 'warning')
            return redirect(url_for('admin_dashboard'))
    else:
        # if provided image_url_field, update; if empty, keep existing
        if image_url_field:
            p.image_url = image_url_field

    p.name = name
    p.category = category or None
    p.subcategory = subcategory or None
    p.price = price_val
    p.stock = stock_val
    p.unit = unit or None   # <-- added
    db.session.commit()
    flash('Product updated', 'success')
    return redirect(url_for('admin_dashboard'))

# Delete product
@app.route('/admin/product/delete/<int:pid>', methods=['POST'])
def delete_product(pid):
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    flash('Product deleted', 'success')
    return redirect(url_for('admin_dashboard'))

# Logout
@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_id', None)
    flash('Logged out', 'info')
    return redirect(url_for('admin_login'))

# convenience: serve uploaded files if needed (static folder handles it normally)
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)



  # make sure you have Product model imported

# --- New API route ---
@app.route("/api/products/<category>")
def get_products_by_category(category):
    subcategory = request.args.get("subcategory")  # ✅ new
    query = Product.query.filter_by(category=category)

    if subcategory:  # ✅ filter when subcategory is passed
        query = query.filter_by(subcategory=subcategory)

    products = query.all()
    data = []
    for p in products:
        data.append({
            "id": p.id,
            "name": p.name,
            "price": float(p.price),   # ✅ convert Decimal to float for JSON
            "stock": p.stock,
            "unit": p.unit,
            "image_url": p.image_url,
            "subcategory": p.subcategory
        })
    return jsonify(data)


# =====================================================
# OTP and Order APIs                                            
# =====================================================

@property
def date(self):
    return self.created_at# ---------- Helpers ----------
def _gen_otp(digits=6):
    return ''.join(random.choices("0123456789", k=digits))

DEFAULT_COUNTRY_CODE = "+91"  # change if needed

def _format_whatsapp_number(phone_raw):
    if not phone_raw:
        return None
    # keep only digits and plus sign
    s = ''.join(ch for ch in phone_raw if ch.isdigit() or ch == '+')
    if len(s) == 10:  # assume local number
        return f"whatsapp:{DEFAULT_COUNTRY_CODE}{s}"
    if s.startswith("91") and len(s) == 12:
        return f"whatsapp:+{s}"
    if s.startswith("+"):
        return f"whatsapp:{s}"
    # fallback
    return f"whatsapp:{DEFAULT_COUNTRY_CODE}{s}"

from twilio.rest import Client

TWILIO_ACCOUNT_SID = "AC9d40cd8c592008cfe30c1469b81eca25"
TWILIO_AUTH_TOKEN = "bff6b805c032425cec0dfdbc5905bdcd"
TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886"
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "60")) 
MAX_OTP_TRIES = int(os.getenv("MAX_OTP_TRIES", "5"))

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def _send_whatsapp_message(to_number, body):
    to_whatsapp = _format_whatsapp_number(to_number)
    if not to_whatsapp:
        current_app.logger.error(f"Invalid phone number: {to_number}")
        return False

    try:
        current_app.logger.info(f"Sending WhatsApp from {TWILIO_WHATSAPP_FROM} to {to_whatsapp}")
        msg = twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_FROM,
            to=to_whatsapp,
            body=body
        )
        current_app.logger.info(f"Twilio Message SID: {msg.sid}")
        return True
    except Exception as e:
        current_app.logger.error(f"Twilio send failed: {e}")
        return False


# ---------- Route: create order and send delivery OTP via WhatsApp ----------

@app.route("/api/order/init", methods=["POST"])
@login_required
def api_order_init():
    """
    Expects JSON:
    {
      customer: { name, phone, address },
      items: [...],
      pricing: { subtotal, delivery, total },
      payment_mode: 'COD',
      channel: 'whatsapp'   # optional
    }
    """
    data = request.get_json() or {}
    cust = data.get("customer") or {}
    items = data.get("items") or []
    pricing = data.get("pricing") or {}

    # --- Validation ---
    name = (cust.get("name") or "").strip()
    phone = (cust.get("phone") or "").strip()
    address = (cust.get("address") or "").strip()
    if not (name and phone and address and items):
        return jsonify({"ok": False, "message": "Incomplete order data"}), 400

    # --- Create order tied to logged-in user ---
    order = Order(
        user_id=current_user.id,
        customer_name=name,
        phone=phone,
        address=address,
        items=items,
        subtotal=float(pricing.get("subtotal", 0)),
        delivery=float(pricing.get("delivery", 0)),
        total=float(pricing.get("total", 0)),
        payment_mode=data.get("payment_mode", "COD"),
        status="pending"
    )
    db.session.add(order)
    db.session.commit()  # order.id now available

    # --- Generate OTP ---
    otp_code = _gen_otp(6)
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    otp_row = OrderOTP(order_id=order.id, otp=otp_code, expires_at=expires_at)
    db.session.add(otp_row)
    db.session.commit()

    # --- Send OTP via WhatsApp ---
    to_whatsapp = _format_whatsapp_number(phone)
    body = (
        f"Hi {name}, your M-Mart delivery OTP for order #{order.id} is {otp_code}.\n"
        "Please share this OTP with the delivery partner on arrival. Do not share with others."
    )

    send_res = _send_whatsapp_message(to_whatsapp, body)

    if not send_res:
        return jsonify({
            "ok": True,
            "message": "Order created but failed to send OTP",
            "order_id": order.id
        }), 500

    return jsonify({
        "ok": True,
        "message": "OTP sent successfully",
        "order_id": order.id,
        "otp": otp_code
    })



# ---------- Route: Delivery person verifies OTP and confirms delivery ----------
@app.route("/api/order/verify_delivery", methods=["POST"])
def api_order_verify_delivery():
    """
    Delivery verification endpoint.
    Protect this route by requiring admin session or a delivery auth in your system.
    This example checks for 'admin_id' in session (you already have admin login).
    Request JSON: { order_id: 123, otp: "123456" }
    """
    if 'admin_id' not in session:
        return jsonify({"ok": False, "message": "unauthorized"}), 401

    data = request.get_json() or {}
    order_id = data.get("order_id")
    otp_try = (data.get("otp") or "").strip()
    if not order_id or not otp_try:
        return jsonify({"ok": False, "message": "missing parameters"}), 400

    otp_row = OrderOTP.query.filter_by(order_id=order_id, used=False).order_by(OrderOTP.created_at.desc()).first()
    if not otp_row:
        return jsonify({"ok": False, "message": "no active otp for this order"}), 404

    if datetime.utcnow() > otp_row.expires_at:
        return jsonify({"ok": False, "message": "otp_expired"}), 400

    if otp_row.tries >= MAX_OTP_TRIES:
        return jsonify({"ok": False, "message": "otp_attempts_exceeded"}), 403

    if otp_row.otp != otp_try:
        otp_row.tries += 1
        db.session.commit()
        return jsonify({"ok": False, "message": "invalid_otp", "tries_left": MAX_OTP_TRIES - otp_row.tries}), 400

    # correct OTP
    otp_row.used = True
    order = Order.query.get(order_id)
    order.status = "delivered"
    db.session.commit()

    return jsonify({"ok": True, "message": "delivery_confirmed", "order_id": order_id})


# =====================================================
if __name__ == '__main__':
    app.run(debug=True)


