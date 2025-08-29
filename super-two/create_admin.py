# create_admin.py
from app import app
from models import db, Admin
from werkzeug.security import generate_password_hash

email = input("Admin email: ").strip().lower()
pw = input("Admin password: ").strip()
if not email or not pw:
    print("Provide both")
else:
    with app.app_context():
        db.create_all()
        hashed = generate_password_hash(pw)
        a = Admin(email=email, password=hashed)
        db.session.add(a)
        db.session.commit()
        print("Admin created:", email)
