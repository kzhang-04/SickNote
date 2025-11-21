from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from .db import init_db, get_session, create_illness_log
from .models import LogCreate, LogRead, Friend, FriendRead

# FastAPI
app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins-origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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
    status_code=status.HTTP_201_CREATED
)

def create_report(
    log_data: LogCreate,
    session: Session = Depends(get_session)
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
