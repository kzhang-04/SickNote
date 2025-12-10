from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError

from .db import init_db, get_session, create_illness_log
from .models import (
    LogCreate,
    LogRead,
    Friend,
    FriendRead,
    NotifyRequest,
    SummaryResponse,
    IllnessLog,
    User,
    LoginRequest,
    LoginResponse,
    ClassEnrollment,
    AddStudentRequest,
    StudentHealth,
    ClassRead,
    Class,
    ClassCreate,
    JoinClassRequest,
    FriendCreate,
    PrivacyUpdate,
    PrivacyRead,
    UserCreate,
)
from .notifications import send_email
from .security import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_user,  # <-- must exist in security.py
)

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


# ---------------------- Illness Reports ----------------------


@app.post(
    "/api/reports",
    response_model=LogRead,
    status_code=status.HTTP_201_CREATED,
)
def create_report(
    log_data: LogCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_log = create_illness_log(
        session=session,
        log_in=log_data,
        user_id=current_user.id,
    )
    return db_log


@app.get("/api/reports", response_model=list[LogRead])
def list_reports(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Return all illness logs for the current user,
    most recent first.
    """
    logs = session.exec(
        select(IllnessLog)
        .where(IllnessLog.user_id == current_user.id)
        .order_by(IllnessLog.created_at.desc())
    ).all()
    return logs


@app.delete("/api/reports")
def delete_all_reports(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete all illness reports for the current user.
    """
    logs = session.exec(
        select(IllnessLog).where(IllnessLog.user_id == current_user.id)
    ).all()
    count = len(logs)

    for log in logs:
        session.delete(log)

    session.commit()

    return {"deleted_count": count, "message": f"Deleted {count} illness reports"}


@app.delete("/api/reports/{log_id}")
def delete_report(
    log_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a single illness log for the current user.
    """
    log = session.exec(
        select(IllnessLog).where(
            IllnessLog.id == log_id,
            IllnessLog.user_id == current_user.id,
        )
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Report not found")

    session.delete(log)
    session.commit()

    return {"message": "Report deleted", "log_id": log_id}


# ---------------------- Friends ----------------------


@app.get("/friends", response_model=list[FriendRead])
def get_friends(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friends = session.exec(
        select(Friend).where(Friend.owner_user_id == current_user.id)
    ).all()
    return friends


@app.post("/friends", response_model=FriendRead, status_code=status.HTTP_201_CREATED)
def create_friend(
    payload: FriendCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friend = Friend(
        owner_user_id=current_user.id,
        friend_name=payload.friend_name,
        friend_email=payload.friend_email,
    )
    session.add(friend)
    session.commit()
    session.refresh(friend)
    return friend


@app.post("/notify-friends")
def notify_friends(
    payload: NotifyRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = current_user

    # Block if privacy is professors-only
    if user.notification_privacy == "professors":
        raise HTTPException(
            status_code=403,
            detail="Notifications to friends are disabled due to privacy settings.",
        )

    if not payload.friend_ids:
        raise HTTPException(status_code=400, detail="No friends selected")

    friends = session.exec(
        select(Friend).where(
            Friend.owner_user_id == current_user.id,
            Friend.id.in_(payload.friend_ids),
        )
    ).all()

    if not friends:
        raise HTTPException(status_code=400, detail="No valid friends found")

    for friend in friends:
        send_email(
            to=friend.friend_email,
            subject="Your friend is sick",
            body=f"Hi {friend.friend_name}, your friend {user.full_name} is not feeling well, and"
                 f"will not be in class today.",
            from_address=user.email,
        )

    return {"notified_count": len(friends)}


@app.delete("/friends/{friend_id}")
def delete_friend(
    friend_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friend = session.exec(
        select(Friend).where(
            Friend.id == friend_id,
            Friend.owner_user_id == current_user.id,
        )
    ).first()

    if not friend:
        raise HTTPException(status_code=404, detail="Friend not found")

    session.delete(friend)
    session.commit()
    return {"message": "Friend deleted"}


# ---------------------- Class Summary (Professor) ----------------------


@app.get("/api/classes/{class_id}/summary", response_model=SummaryResponse)
def get_class_summary(
    class_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # (optional) enforce professor role, depending on your rules
    # if current_user.role != "professor":
    #     raise HTTPException(status_code=403, detail="Only professors can view class summary")

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

    logs = session.exec(
        select(IllnessLog)
        .where(IllnessLog.user_id.in_(student_ids))
        .order_by(IllnessLog.created_at.desc())
    ).all()

    latest_by_student: dict[int, IllnessLog] = {}
    for log in logs:
        if log.user_id not in latest_by_student:
            latest_by_student[log.user_id] = log

    users = session.exec(select(User).where(User.id.in_(student_ids))).all()
    user_by_id = {u.id: u for u in users}

    now = datetime.now(timezone.utc)
    SICK_DAYS = 7

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

            created_at = latest.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

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


# ---------------------- Privacy Settings ----------------------


@app.get("/api/settings/privacy", response_model=PrivacyRead)
def get_privacy_setting(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return PrivacyRead(notification_privacy=current_user.notification_privacy)


@app.post("/api/settings/privacy")
def update_privacy_setting(
    payload: PrivacyUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    allowed_settings = ["everyone", "friends", "professors"]
    if payload.notification_privacy not in allowed_settings:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid privacy setting. Must be one of: {', '.join(allowed_settings)}",
        )

    current_user.notification_privacy = payload.notification_privacy
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return {
        "message": "Notification privacy updated successfully",
        "setting": current_user.notification_privacy,
    }


# ---------------------- Auth ----------------------


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


@app.post("/auth/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(User).where(User.email == payload.email)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    hashed_pw = get_password_hash(payload.password)

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role or "student",
        hashed_password=hashed_pw,
    )

    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    session.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})

    return LoginResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        token=token,
    )


# ---------------------- Professor Classes ----------------------


@app.get("/api/professors/{professor_id}/classes", response_model=list[ClassRead])
def get_professor_classes(
    professor_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "professor" or current_user.id != professor_id:
        raise HTTPException(status_code=403, detail="Not allowed")

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
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "professor" or current_user.id != professor_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    new_class = Class(
        name=payload.name,
        code=payload.code,
        professor_id=professor_id,
    )
    session.add(new_class)
    session.commit()
    session.refresh(new_class)
    return new_class


@app.delete("/api/professors/{professor_id}/classes/{class_id}")
def delete_class(
    professor_id: int,
    class_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "professor" or current_user.id != professor_id:
        raise HTTPException(status_code=403, detail="Not allowed")

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


# ---------------------- Student Classes ----------------------


@app.get("/api/students/{student_id}/classes", response_model=list[ClassRead])
def get_student_classes(
    student_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Only allow a student to see their own classes
    if current_user.role != "student" or current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    enrollments = session.exec(
        select(ClassEnrollment).where(ClassEnrollment.student_id == student_id)
    ).all()

    if not enrollments:
        return []

    class_ids = [e.class_id for e in enrollments]

    classes = session.exec(
        select(Class).where(Class.id.in_(class_ids))
    ).all()

    return classes


@app.post("/api/students/{student_id}/join-class")
def join_class_by_code(
    student_id: int,
    payload: JoinClassRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student" or current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    clazz = session.exec(
        select(Class).where(Class.code == payload.code)
    ).first()

    if not clazz:
        raise HTTPException(status_code=404, detail="Class with this code not found")

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
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student" or current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not allowed")

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

    return {
        "message": "Student removed from class",
        "class_id": class_id,
        "student_id": student_id,
    }