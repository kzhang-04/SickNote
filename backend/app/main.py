from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime, timezone

from .db import init_db, get_session, create_illness_log
from .models import ( LogCreate, LogRead, Friend, FriendRead, NotifyRequest,
                      SummaryResponse, IllnessLog, User, LoginRequest, LoginResponse,
                      ClassEnrollment, AddStudentRequest, StudentHealth,
                      ClassRead, Class, ClassCreate, JoinClassRequest)
from .notifications import send_email
from .security import authenticate_user, create_access_token

# FastAPI
app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# Just a basic check to see if its working not related to project.
@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post(
    "/api/reports",
    response_model=LogRead,
    status_code=status.HTTP_201_CREATED,
)
def create_report(
    log_data: LogCreate,
    session: Session = Depends(get_session),
):
    # TEMP: hard-code a student id until you wire up real current_user
    current_user_id = 1

    db_log = create_illness_log(session=session, log_in=log_data, user_id=current_user_id)
    return db_log




@app.delete("/api/reports")
def delete_all_reports(session: Session = Depends(get_session)):
    """Delete all illness log reports"""
    logs = session.exec(select(IllnessLog)).all()
    count = len(logs)

    for log in logs:
        session.delete(log)

    session.commit()

    return {"deleted_count": count, "message": f"Deleted {count} illness reports"}


# Friends API:
@app.get("/friends", response_model=list[FriendRead])
def get_friends(session: Session = Depends(get_session)):
    # For now, we assume the current student has user id 1
    owner_user_id = 1

    friends = session.exec(
        select(Friend).where(Friend.owner_user_id == owner_user_id)
    ).all()

    # We return Friend objects; FastAPI will convert them to FriendRead
    return friends


@app.post("/notify-friends")
def notify_friends(
    payload: NotifyRequest,
    session: Session = Depends(get_session),
):
    if not payload.friend_ids:
        raise HTTPException(status_code=400, detail="No friends selected")

    # assume current student has user id 1 for now
    owner_user_id = 1

    friends = session.exec(
        select(Friend).where(
            Friend.owner_user_id == owner_user_id,
            Friend.id.in_(payload.friend_ids),
        )
    ).all()

    if not friends:
        raise HTTPException(status_code=400, detail="No valid friends found")

    for friend in friends:
        send_email(
            to=friend.friend_email,
            subject="Your friend is sick",
            body=f"Hi {friend.friend_name}, your friend is not feeling well and may miss class.",
        )

    return {
        "notified_count": len(friends)
    }


@app.get("/api/classes/{class_id}/summary", response_model=SummaryResponse)
def get_class_summary(class_id: int, session: Session = Depends(get_session)):
    # 1) Get roster for this class
    enrollments = session.exec(
        select(ClassEnrollment).where(ClassEnrollment.class_id == class_id)
    ).all()

    if not enrollments:
        return SummaryResponse(
            available=False,
            message="No students have been added to this class yet.",
            students=[],
        )

    student_ids = [e.student_id for e in enrollments]

    # 2) Fetch all logs for those students (latest first)
    logs = session.exec(
        select(IllnessLog)
        .where(IllnessLog.user_id.in_(student_ids))
        .order_by(IllnessLog.created_at.desc())
    ).all()

    # Group latest log per student
    latest_by_student: dict[int, IllnessLog] = {}
    for log in logs:
        if log.user_id not in latest_by_student:
            latest_by_student[log.user_id] = log

    # 3) Fetch user info
    users = session.exec(select(User).where(User.id.in_(student_ids))).all()
    user_by_id = {u.id: u for u in users}

    # 4) Compute health status
    now = datetime.now(timezone.utc)
    SICK_DAYS = 7  # consider "sick" if last log is within 7 days

    students_health: list[StudentHealth] = []
    severities: list[int] = []
    symptom_freq: dict[str, int] = {}

    for sid in student_ids:
        user = user_by_id.get(sid)
        latest = latest_by_student.get(sid)

        is_sick = False
        latest_symptoms = None
        latest_severity = None
        latest_created_at = None

        if latest:
            latest_created_at = latest.created_at
            latest_symptoms = latest.symptoms
            latest_severity = latest.severity

            # Normalize datetime to be timezone-aware
            created_at = latest.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            # "sick" if recent
            if (now - created_at).days < SICK_DAYS:
                is_sick = True
                severities.append(latest.severity)
                for word in latest.symptoms.replace(",", " ").split():
                    w = word.strip().lower()
                    if w:
                        symptom_freq[w] = symptom_freq.get(w, 0) + 1

        students_health.append(
            StudentHealth(
                student_id=sid,
                full_name=user.full_name if user else None,
                email=user.email if user else "unknown",
                is_sick=is_sick,
                latest_symptoms=latest_symptoms,
                latest_severity=latest_severity,
                latest_created_at=latest_created_at,
            )
        )

    if not students_health:
        return SummaryResponse(
            available=False,
            message="No illness reports yet for this class.",
            students=[],
        )

    # Aggregated stats: only for sick students
    sick_students = [s for s in students_health if s.is_sick]
    count = len(sick_students)
    avg_severity = sum(severities) / len(severities) if severities else None

    common_symptoms_sorted = sorted(
        symptom_freq.items(), key=lambda x: x[1], reverse=True
    )[:5]
    common_symptoms_list = [symptom for symptom, _ in common_symptoms_sorted] or None

    return SummaryResponse(
        available=True,
        count=count,
        avg_severity=round(avg_severity, 2) if avg_severity is not None else None,
        common_symptoms=common_symptoms_list,
        message="Class health summary generated successfully",
        students=students_health,
    )


# Auth
@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    print(">>> /auth/login payload:", payload.dict())
    user = authenticate_user(session, payload.email, payload.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})

    return LoginResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        token=token,
    )


@app.get("/api/professors/{professor_id}/classes", response_model=list[ClassRead])
def get_professor_classes(
    professor_id: int,
    session: Session = Depends(get_session),
):
    classes = session.exec(
        select(Class).where(Class.professor_id == professor_id)
    ).all()
    return classes

@app.post(
    "/api/professors/{professor_id}/classes",
    response_model=ClassRead,
    status_code=status.HTTP_201_CREATED,
)
def create_professor_class(
    professor_id: int,
    payload: ClassCreate,
    session: Session = Depends(get_session),
):
    # later you can assert that professor_id == current_user.id
    new_class = Class(
        name=payload.name,
        code=payload.code,
        professor_id=professor_id,
    )
    session.add(new_class)
    session.commit()
    session.refresh(new_class)
    return new_class


@app.post("/api/classes/{class_id}/students")
def add_student_to_class(
    class_id: int,
    payload: AddStudentRequest,
    session: Session = Depends(get_session),
):
    # Find the class
    clazz = session.exec(
        select(Class).where(Class.id == class_id)
    ).first()

    if not clazz:
        raise HTTPException(status_code=404, detail="Class not found")

    # Find the student user by email
    student = session.exec(
        select(User).where(User.email == payload.student_email)
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student user not found")

    # Prevent duplicate enrollment
    existing = session.exec(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.student_id == student.id,
        )
    ).first()
    if existing:
        return {"message": "Student already in this class"}

    enrollment = ClassEnrollment(
        class_id=class_id,
        student_id=student.id,
    )
    session.add(enrollment)
    session.commit()
    session.refresh(enrollment)

    return {
        "message": "Student added to class",
        "enrollment_id": enrollment.id,
        "student_id": student.id,
        "student_email": student.email,
        "class_id": clazz.id,
        "class_name": clazz.name,
    }

@app.delete("/api/professors/{professor_id}/classes/{class_id}")
def delete_class(
    professor_id: int,
    class_id: int,
    session: Session = Depends(get_session),
):
    # Only allow deleting classes that belong to this professor
    clazz = session.exec(
        select(Class).where(
            Class.id == class_id,
            Class.professor_id == professor_id,
        )
    ).first()

    if not clazz:
        raise HTTPException(status_code=404, detail="Class not found")

    session.delete(clazz)
    session.commit()

    return {"message": "Class deleted"}

@app.get("/api/students/{student_id}/classes", response_model=list[ClassRead])
def get_student_classes(student_id: int, session: Session = Depends(get_session)):
    # Find all enrollments for this student
    enrollments = session.exec(
        select(ClassEnrollment).where(ClassEnrollment.student_id == student_id)
    ).all()

    if not enrollments:
        return []

    class_ids = [e.class_id for e in enrollments]

    # Fetch those classes
    classes = session.exec(
        select(Class).where(Class.id.in_(class_ids))
    ).all()

    return classes


@app.post("/api/students/{student_id}/join-class")
def join_class_by_code(
    student_id: int,
    payload: JoinClassRequest,
    session: Session = Depends(get_session),
):
    # 1) Find class by code
    clazz = session.exec(
        select(Class).where(Class.code == payload.code)
    ).first()

    if not clazz:
        raise HTTPException(status_code=404, detail="Class with this code not found")

    # 2) Prevent duplicate enrollment
    existing = session.exec(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == clazz.id,
            ClassEnrollment.student_id == student_id,
        )
    ).first()

    if existing:
        return {
            "message": "You are already enrolled in this class",
            "class_id": clazz.id,
            "class_name": clazz.name,
        }

    # 3) Create enrollment
    enrollment = ClassEnrollment(
        class_id=clazz.id,
        student_id=student_id,
    )
    session.add(enrollment)
    session.commit()
    session.refresh(enrollment)

    return {
        "message": "Successfully joined class",
        "class_id": clazz.id,
        "class_name": clazz.name,
        "enrollment_id": enrollment.id,
    }

@app.delete("/api/classes/{class_id}/students/{student_id}")
def leave_class(
    class_id: int,
    student_id: int,
    session: Session = Depends(get_session),
):
    """
    Remove a student's enrollment from a class.
    """
    enrollment = session.exec(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.student_id == student_id,
        )
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Student is not enrolled in this class")

    session.delete(enrollment)
    session.commit()

    return {"message": "Student removed from class", "class_id": class_id, "student_id": student_id}
