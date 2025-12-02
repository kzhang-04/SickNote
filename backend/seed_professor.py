from datetime import datetime
from sqlmodel import Session, select

from app.db import engine
from app.models import User
from app.security import get_password_hash


def main():
    email = "professor@example.com"
    plain_password = "password123"

    with Session(engine) as session:
        # check if professor already exists
        statement = select(User).where(User.email == email)
        existing = session.exec(statement).first()

        if existing:
            print(f"Professor already exists: {existing.email} (id={existing.id})")
            return

        user = User(
            email=email,
            full_name="Test Professor",
            role="professor",
            hashed_password=get_password_hash(plain_password),
            created_at=datetime.utcnow(),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        print(f"Created professor: id={user.id}, email={user.email}")


if __name__ == "__main__":
    main()