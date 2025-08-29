# create_admin.py
from app import app
from models import db, Admin
from werkzeug.security import generate_password_hash

email = input("Admin email: ").strip().lower()
pw = input("Admin password: ").strip()

if not email or not pw:
    print("❌ Provide both email and password")
else:
    with app.app_context():
        hashed = generate_password_hash(pw)
        admin = Admin(email=email, password=hashed)
        db.session.add(admin)
        db.session.commit()
        print(f"✅ Admin created: {email}")
