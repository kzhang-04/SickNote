from sqlmodel import Session, select

from app.db import engine
from app.models import User, Class, ClassEnrollment


def main():
    with Session(engine) as session:
        # Find professor
        prof = session.exec(
            select(User).where(User.email == "professor@example.com")
        ).first()
        if not prof:
            print("Professor not found, run seed_professor.py first.")
            return

        # Find student
        student = session.exec(
            select(User).where(User.email == "student@example.com")
        ).first()
        if not student:
            print("Student not found, run auth_user_test.py first.")
            return

        # Create two classes if they don't exist
        existing_classes = session.exec(
            select(Class).where(Class.professor_id == prof.id)
        ).all()

        if existing_classes:
            print("Classes already exist:")
            for c in existing_classes:
                print(f"- id={c.id}, name={c.name}, code={c.code}")
        else:
            c1 = Class(name="Intro to Programming", code="CS101 A1", professor_id=prof.id)
            c2 = Class(name="Data Structures", code="CS112 B2", professor_id=prof.id)
            session.add(c1)
            session.add(c2)
            session.commit()
            session.refresh(c1)
            session.refresh(c2)
            print(f"Created classes: {c1.id} / {c2.id}")

        # Reload classes to get IDs
        classes = session.exec(
            select(Class).where(Class.professor_id == prof.id)
        ).all()

        # Enroll student in *first* class
        target_class = classes[0]

        existing_enrollment = session.exec(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == target_class.id,
                ClassEnrollment.student_id == student.id,
            )
        ).first()

        if existing_enrollment:
            print(
                f"Student already enrolled: class_id={target_class.id}, student_id={student.id}"
            )
        else:
            enrollment = ClassEnrollment(
                class_id=target_class.id,
                student_id=student.id,
            )
            session.add(enrollment)
            session.commit()
            session.refresh(enrollment)
            print(
                f"Enrolled student {student.email} in class {target_class.name} (id={target_class.id})"
            )


if __name__ == "__main__":
    main()