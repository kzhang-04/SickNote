from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db import get_session
from app.models import IllnessLog, Friend
import pytest

# Create a temporary in-memory SQLite DB for testing
# Use StaticPool to share the same in-memory database across threads/connections
test_engine = create_engine(
    "sqlite:///:memory:", 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

# Override the dependency
def get_test_session():
    with Session(test_engine) as session:
        yield session

@pytest.fixture(name="session", scope="function")
def session_fixture():
    """Create a fresh database for each test"""
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)

@pytest.fixture(name="client", scope="function")
def client_fixture(session):
    """Create a test client with dependency override"""
    app.dependency_overrides[get_session] = get_test_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

# Test Cases
def test_class_summary_no_reports(client: TestClient):
    """No illness logs exist: should return available=False, message about insufficient data"""
    response = client.get("/api/class-summary")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert "Insufficient data" in data["message"]

def test_class_summary_privacy_threshold(client: TestClient):
    """
    Test privacy threshold:
    - < 10 reports: available=False
    - >= 10 reports: available=True
    """
    # Add 9 reports
    for _ in range(9):
        client.post("/api/reports", json={
            "symptoms": "fever",
            "severity": 3,
            "recoveryTime": 3
        })
    
    response = client.get("/api/class-summary")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert "Insufficient data" in data["message"]

    # Add 10th report
    client.post("/api/reports", json={
        "symptoms": "cough",
        "severity": 4,
        "recoveryTime": 4
    })

    response = client.get("/api/class-summary")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert data["count"] == 10

def test_class_summary_aggregation(client: TestClient):
    """Check aggregation logic with sufficient data (10+ reports)"""
    # We need at least 10 reports.
    # Let's add 3 specific ones we want to verify, and 7 "filler" ones.
    
    # 3 specific logs
    logs = [
        {"symptoms": "fever, cough", "severity": 4, "recoveryTime": 3},
        {"symptoms": "cough, sore throat", "severity": 2, "recoveryTime": 7},
        {"symptoms": "headache, fever", "severity": 5, "recoveryTime": 2},
    ]
    for log in logs:
        client.post("/api/reports", json=log)
        
    # 7 filler logs (severity 3)
    for _ in range(7):
        client.post("/api/reports", json={
            "symptoms": "tiredness", 
            "severity": 3, 
            "recoveryTime": 5
        })

    response = client.get("/api/class-summary")
    assert response.status_code == 200
    data = response.json()
    
    assert data["available"] is True
    assert data["count"] == 10
    
    # Calculate expected average severity
    # (4 + 2 + 5) + (7 * 3) = 11 + 21 = 32
    # 32 / 10 = 3.2
    assert abs(data["avg_severity"] - 3.2) < 0.01
    
    # Check common symptoms
    # "fever": 2, "cough": 2, "sore throat": 1, "headache": 1, "tiredness": 7
    # Top should be tiredness, then fever/cough
    assert "tiredness" in data["common_symptoms"]
    assert "fever" in data["common_symptoms"]

def test_class_summary_error_when_db_down():
    """Simulate DB error: API should return 500"""
    # We need a fresh client with raise_server_exceptions=False
    # to capture the 500 error instead of raising the exception.
    
    def broken_get_session():
        raise RuntimeError("DB unavailable")
    
    app.dependency_overrides[get_session] = broken_get_session
    
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/class-summary")
        assert response.status_code == 500
        
    app.dependency_overrides.clear()
