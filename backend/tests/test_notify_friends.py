# This test file is using its own test_app.db, DB file to make it easier to run the tests
# Make sure environmnet variables have been exported before testing

from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, delete
from app.main import app
from app.db import get_session, init_db
from app.models import Friend

TEST_DATABASE_URL = "sqlite:///./test_app.db"

test_engine = create_engine(
    TEST_DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False},
)


def override_get_session():
    with Session(test_engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session

client = TestClient(app)


def setup_module(_module):

    init_db(engine=test_engine)

    with Session(test_engine) as session:
        session.exec(delete(Friend))
        session.commit()

        f1 = Friend(
            owner_user_id=1,
            friend_name="example1",
            friend_email="example1@example.com",
        )
        f2 = Friend(
            owner_user_id=1,
            friend_name="example2",
            friend_email="example2@example.com",
        )

        session.add(f1)
        session.add(f2)
        session.commit()


def test_get_friends_returns_seeded_friends():
    resp = client.get("/friends")
    assert resp.status_code == 200

    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    names = {f["friend_name"] for f in data}
    assert "example1" in names
    assert "example2" in names


def test_notify_friends_success():
    friends = client.get("/friends").json()
    assert len(friends) >= 1

    first_id = friends[0]["id"]

    resp = client.post("/notify-friends", json={"friend_ids": [first_id]})
    assert resp.status_code == 200

    data = resp.json()
    assert data["notified_count"] == 1


def test_notify_friends_no_selection():
    resp = client.post("/notify-friends", json={"friend_ids": []})
    assert resp.status_code == 400
    assert "No friends selected" in resp.json()["detail"]


def test_notify_friends_invalid_ids():
    resp = client.post("/notify-friends", json={"friend_ids": [99999]})
    assert resp.status_code == 400
    assert "No valid friends found" in resp.json()["detail"]