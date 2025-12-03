from datetime import datetime
from sqlmodel import Session, select

from app.db import engine
from app.models import User
from app.security import get_password_hash

def upsert_user(email: str, role: str, full_name: str):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            print(f"Updating existing user: {email} (id={user.id})")
            user.full_name = full_name
            user.role = role
            user.hashed_password = get_password_hash("password123")
        else:
            print(f"Creating new user: {email}")
            user = User(
                email=email,
                full_name=full_name,
                role=role,
                hashed_password=get_password_hash("password123"),
                created_at=datetime.utcnow(),
            )
            session.add(user)

        session.commit()
        session.refresh(user)
        print(f"User now: id={user.id}, email={user.email}, role={user.role}")

def main():
    upsert_user("student@example.com", "student", "Test Student")
    upsert_user("professor@example.com", "professor", "Professor Test")

if __name__ == "__main__":
    main()