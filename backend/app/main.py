from fastapi import FastAPI, Depends
from sqlmodel import Session, select
from .db import init_db, get_session
from .models import Friend, FriendRead

# FastAPI
app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()


# Just a basic check to see if its working not related to project.
@app.get("/health")
def health_check():
    return {"status": "ok"}

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