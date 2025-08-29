from .app import db, app
from sqlalchemy import text

with app.app_context():
    # Use connection instead of engine.execute
    with db.engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.commit()  # ✅ commit changes

    # Recreate tables
    db.create_all()

    print("✅ Database reset with CASCADE: All tables dropped and recreated.")
