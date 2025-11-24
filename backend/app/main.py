from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .db import init_db, get_session, create_illness_log
from .models import LogCreate, LogRead, Friend, FriendRead, NotifyRequest, SummaryResponse, IllnessLog
from .notifications import send_email

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
    db_log = create_illness_log(session=session, log_in=log_data)
    return db_log


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


@app.get("/api/class-summary", response_model=SummaryResponse)
def get_class_summary(session: Session = Depends(get_session)):
    MIN_REPORTS = 1 # do not return data if less than this number of reports
    
    # Get all illness logs
    logs = session.exec(select(IllnessLog)).all()
    
    if len(logs) < MIN_REPORTS:
        return SummaryResponse(
            available=False,
            message=f"Insufficient data. Need at least {MIN_REPORTS} reports for privacy (currently: {len(logs)})"
        )
    
    # Calculate stats
    total_count = len(logs)
    avg_severity = sum(log.severity for log in logs) / total_count
    
    # find most common symptoms
    symptom_freq: dict[str, int] = {}
    for log in logs:
        symptoms = [s.strip().lower() for s in log.symptoms.replace(',', ' ').split()]
        for symptom in symptoms:
            if symptom: # if symptom is not empty
                symptom_freq[symptom] = symptom_freq.get(symptom, 0) + 1
    
    # get top 5 most common symptoms
    common_symptoms = sorted(symptom_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    common_symptoms_list = [symptom for symptom, _ in common_symptoms]
    
    return SummaryResponse(
        available=True,
        count=total_count,
        avg_severity=round(avg_severity, 2),
        common_symptoms=common_symptoms_list,
        message="Class health summary generated successfully"
    )