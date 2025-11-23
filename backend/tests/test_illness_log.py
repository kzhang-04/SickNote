from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from app.main import app
from app.db import get_session, init_db
from app.models import IllnessLog
import pytest

# Create a temporary in-memory SQLite DB for testing
test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

# Override the dependency
def get_test_session():
    with Session(test_engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture():
    init_db(test_engine)
    app.dependency_overrides[get_session] = get_test_session
    app.router.on_startup.clear()

    with TestClient(app) as client:
        yield client

    SQLModel.metadata.drop_all(test_engine)

# Test Cases
def test_create_illness_log_success(client: TestClient):
    response = client.post(
        "/api/reports",
        json={
            "symptoms": "Flu",
            "severity": 3,
            "recoveryTime": 5
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["severity"] == 3

def test_create_illness_log_missing_field(client: TestClient):
    response = client.post(
        "/api/reports",
        json={
            "symptoms": "Flu",
            "severity": 2
            # missing recoveryTime
        }
    )
    assert response.status_code == 422

def test_severity_not_integer(client: TestClient):
    response = client.post(
        "/api/reports",
        json={
            "symptoms": "Flu",
            "severity": "high",  # invalid
            "recoveryTime": 5
        }
    )
    assert response.status_code == 422

def test_recovery_time_not_integer(client: TestClient):
    response = client.post(
        "/api/reports",
        json={
            "symptoms": "Flu",
            "severity": 3,
            "recoveryTime": "soon"  # invalid
        }
    )
    assert response.status_code == 422

def test_severity_out_of_range(client: TestClient):
    response = client.post(
        "/api/reports",
        json={
            "symptoms": "Flu",
            "severity": -1,
            "recoveryTime": 5
        }
    )
    assert response.status_code == 422
