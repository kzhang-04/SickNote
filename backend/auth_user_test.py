from sqlmodel import Session, select

from app.db import engine
from app.models import User
from app.security import get_password_hash


def main():
    email = "student@example.com"
    plain_password = "password123"  # you’ll use this to log in

    with Session(engine) as session:
        # Check if user already exists
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            print(f"User already exists: {existing.email} (id={existing.id})")
            return

        user = User(
            email=email,
            full_name="Test Student",
            role="student",
            hashed_password=get_password_hash(plain_password),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Created user: id={user.id}, email={user.email}")


if __name__ == "__main__":
    main()
