from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from .db import init_db, get_session
from .models import Friend, FriendRead, NotifyRequest
from .notifications import send_email

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