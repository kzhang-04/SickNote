from sqlmodel import Session, select
from app.db import engine
from app.models import User, ClassEnrollment

def main():
    with Session(engine) as session:
        print("=== Users ===")
        for u in session.exec(select(User)).all():
            print(f"id={u.id}, email={u.email}, role={u.role}")

        print("\n=== ClassEnrollments ===")
        for e in session.exec(select(ClassEnrollment)).all():
            print(
                f"id={e.id}, professor_id={e.professor_id}, student_id={e.student_id}"
            )

if __name__ == "__main__":
    main()