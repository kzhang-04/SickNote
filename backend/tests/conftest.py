from typing import Callable, Dict

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db import get_session
from app.models import User
from app.security import get_password_hash

# Single in-memory SQLite DB shared across tests
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def get_test_session():
    """Override for app.db.get_session that uses the in-memory test DB."""
    with Session(test_engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture() -> TestClient:
    """
    Fresh FastAPI TestClient + clean DB for each test.

    - Drops & recreates all tables.
    - Overrides get_session to use the test engine.
    """
    # Clean slate DB for this test
    SQLModel.metadata.drop_all(test_engine)
    SQLModel.metadata.create_all(test_engine)

    # Override DB dependency
    app.dependency_overrides[get_session] = get_test_session

    # Skip real startup hooks that might touch the real DB
    app.router.on_startup.clear()

    with TestClient(app) as c:
        yield c

    # Clean up overrides after each test
    app.dependency_overrides.clear()


@pytest.fixture
def db_session() -> Session:
    """
    Provides a Session bound to the test_engine for direct DB setup.

    Use this when you want to insert rows directly into the DB.
    """
    with Session(test_engine) as session:
        yield session


@pytest.fixture
def create_user() -> Callable[[str, str, str], User]:
    """
    Helper to create a user directly in the test DB.

    Usage:
        user = create_user("alice@example.com", "password", "student")
    """
    def _create_user(email: str, password: str, role: str = "student") -> User:
        hashed_pw = get_password_hash(password)
        with Session(test_engine) as session:
            user = User(
                email=email,
                full_name="Test User",
                role=role,
                hashed_password=hashed_pw,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            return user

    return _create_user


@pytest.fixture
def student_auth_headers(
    client: TestClient,
    create_user: Callable[[str, str, str], User],
) -> Dict[str, str]:
    """
    Creates a student user, logs in via /auth/login,
    and returns Authorization headers for that student.
    """
    email = "student@example.com"
    password = "testpassword"

    create_user(email, password, role="student")

    res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, res.text
    token = res.json()["token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def professor_auth_headers(
    client: TestClient,
    create_user: Callable[[str, str, str], User],
) -> Dict[str, str]:
    """
    Creates a professor user, logs in via /auth/login,
    and returns Authorization headers for that professor.
    """
    email = "professor@example.com"
    password = "testpassword"

    create_user(email, password, role="professor")

    res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, res.text
    token = res.json()["token"]

    return {"Authorization": f"Bearer {token}"}