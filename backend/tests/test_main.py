from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime, timedelta, timezone

from app.models import IllnessLog, Friend, Class, ClassEnrollment, User


def test_health_ok(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# illnesses

def test_create_report_success(client: TestClient, create_user):
    user = create_user("reportstudent@example.com", "password", role="student")

    # login
    res_login = client.post(
        "/auth/login",
        json={"email": user.email, "password": "password"},
    )
    assert res_login.status_code == 200
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/reports",
        headers=headers,
        json={"symptoms": "Cough and fever", "severity": 3, "recoveryTime": 5},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["symptoms"] == "Cough and fever"
    assert data["severity"] == 3
    assert data["recoveryTime"] == 5


def test_create_report_unauthorized(client: TestClient):
    res = client.post(
        "/api/reports",
        json={"symptoms": "Cough", "severity": 2, "recoveryTime": 3},
    )
    assert res.status_code == 401


def test_list_reports_filters_by_current_user(
    client: TestClient,
    create_user,
    db_session: Session,
):
    # create two users
    user1 = create_user("u1@example.com", "password", role="student")
    user2 = create_user("u2@example.com", "password", role="student")

    # add logs for both users directly
    session = db_session
    now = datetime.now(timezone.utc)
    log1 = IllnessLog(
        user_id=user1.id,
        symptoms="Flu",
        severity=3,
        recoveryTime=4,
        created_at=now,
    )
    log2 = IllnessLog(
        user_id=user1.id,
        symptoms="Cold",
        severity=2,
        recoveryTime=2,
        created_at=now + timedelta(seconds=1),
    )
    log3 = IllnessLog(
        user_id=user2.id,
        symptoms="Headache",
        severity=1,
        recoveryTime=1,
        created_at=now,
    )
    session.add_all([log1, log2, log3])
    session.commit()

    # login as user1
    res_login = client.post(
        "/auth/login",
        json={"email": user1.email, "password": "password"},
    )
    assert res_login.status_code == 200
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/reports", headers=headers)
    assert res.status_code == 200
    data = res.json()
    # should only see user1's 2 logs, most recent first ("Cold" then "Flu")
    assert len(data) == 2
    assert data[0]["symptoms"] == "Cold"
    assert data[1]["symptoms"] == "Flu"


def test_delete_single_report_and_not_others(
    client: TestClient,
    create_user,
    db_session: Session,
):
    user1 = create_user("del1@example.com", "password", role="student")
    user2 = create_user("del2@example.com", "password", role="student")

    session = db_session
    log1 = IllnessLog(
        user_id=user1.id,
        symptoms="Flu",
        severity=3,
        recoveryTime=4,
    )
    log2 = IllnessLog(
        user_id=user1.id,
        symptoms="Cold",
        severity=2,
        recoveryTime=2,
    )
    log3 = IllnessLog(
        user_id=user2.id,
        symptoms="Other",
        severity=1,
        recoveryTime=1,
    )
    session.add_all([log1, log2, log3])
    session.commit()
    session.refresh(log1)
    log1_id = log1.id

    # login as user1
    res_login = client.post(
        "/auth/login",
        json={"email": user1.email, "password": "password"},
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # delete log1
    res_del = client.delete(f"/api/reports/{log1_id}", headers=headers)
    assert res_del.status_code == 200

    # verify log1 deleted, log2 and log3 remain in DB
    remaining = session.query(IllnessLog).all()
    ids = {l.id for l in remaining}
    assert log1_id not in ids
    assert len(remaining) == 2


def test_delete_report_not_found_returns_404(
    client: TestClient,
    create_user,
):
    user = create_user("delmissing@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login",
        json={"email": user.email, "password": "password"},
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.delete("/api/reports/9999", headers=headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Report not found"


def test_delete_all_reports_only_current_user(
    client: TestClient,
    create_user,
    db_session: Session,
):
    user1 = create_user("all1@example.com", "password", role="student")
    user2 = create_user("all2@example.com", "password", role="student")

    session = db_session
    logs = [
        IllnessLog(user_id=user1.id, symptoms="A", severity=1, recoveryTime=1),
        IllnessLog(user_id=user1.id, symptoms="B", severity=2, recoveryTime=2),
        IllnessLog(user_id=user2.id, symptoms="C", severity=3, recoveryTime=3),
    ]
    session.add_all(logs)
    session.commit()

    # login as user1
    res_login = client.post(
        "/auth/login", json={"email": user1.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.delete("/api/reports", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["deleted_count"] == 2

    remaining = session.query(IllnessLog).all()
    # only user2's log remains
    assert len(remaining) == 1
    assert remaining[0].user_id == user2.id


# friends

def test_get_friends_only_current_user(
    client: TestClient,
    create_user,
    db_session: Session,
):
    user1 = create_user("friends1@example.com", "password", role="student")
    user2 = create_user("friends2@example.com", "password", role="student")

    session = db_session
    f1 = Friend(
        owner_user_id=user1.id,
        friend_name="Alice",
        friend_email="alice@example.com",
    )
    f2 = Friend(
        owner_user_id=user2.id,
        friend_name="Bob",
        friend_email="bob@example.com",
    )
    session.add_all([f1, f2])
    session.commit()

    res_login = client.post(
        "/auth/login", json={"email": user1.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/friends", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["friend_name"] == "Alice"


def test_create_friend_success(client: TestClient, create_user):
    user = create_user("newfriend@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/friends",
        headers=headers,
        json={"friend_name": "Charlie", "friend_email": "charlie@example.com"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["friend_name"] == "Charlie"
    assert data["friend_email"] == "charlie@example.com"


def test_delete_friend_not_found(client: TestClient, create_user):
    user = create_user("nofriend@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.delete("/friends/9999", headers=headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Friend not found"


def test_notify_friends_happy_path(
    client: TestClient,
    create_user,
    db_session: Session,
    monkeypatch,
):
    # student with default notification_privacy="friends"
    user = create_user("notify@example.com", "password", role="student")

    # create a friend
    session = db_session
    friend = Friend(
        owner_user_id=user.id,
        friend_name="Friend One",
        friend_email="friend1@example.com",
    )
    session.add(friend)
    session.commit()
    session.refresh(friend)
    friend_id = friend.id

    # mock send_email so we don't actually send
    called = {}

    def fake_send_email(to, subject, body, from_address=None):
        called["to"] = to
        called["subject"] = subject
        called["body"] = body
        called["from"] = from_address

    monkeypatch.setattr("app.main.send_email", fake_send_email)

    # login
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/notify-friends",
        headers=headers,
        json={"friend_ids": [friend_id]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["notified_count"] == 1

    assert called["to"] == "friend1@example.com"
    assert called["from"] == user.email
    assert "Friend One" in called["body"]


def test_notify_friends_privacy_professors_blocked(
    client: TestClient,
    create_user,
    db_session: Session,
):
    user = create_user("privprof@example.com", "password", role="student")

    # flip privacy to professors
    session = db_session
    db_user = session.get(User, user.id)
    db_user.notification_privacy = "professors"
    session.add(db_user)
    session.commit()

    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/notify-friends",
        headers=headers,
        json={"friend_ids": [1]},
    )
    assert res.status_code == 403
    assert "disabled due to privacy settings" in res.json()["detail"]


def test_notify_friends_no_friend_ids(client: TestClient, create_user):
    user = create_user("nofids@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/notify-friends",
        headers=headers,
        json={"friend_ids": []},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "No friends selected"


def test_notify_friends_no_valid_friends(
    client: TestClient,
    create_user,
    db_session: Session,
):
    # current user
    user1 = create_user("user1@example.com", "password", role="student")
    # another user who owns the friend
    user2 = create_user("user2@example.com", "password", role="student")

    session = db_session
    friend = Friend(
        owner_user_id=user2.id,
        friend_name="OtherFriend",
        friend_email="other@example.com",
    )
    session.add(friend)
    session.commit()
    session.refresh(friend)
    friend_id = friend.id

    res_login = client.post(
        "/auth/login", json={"email": user1.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/notify-friends",
        headers=headers,
        json={"friend_ids": [friend_id]},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "No valid friends found"


# privacy

def test_get_privacy_setting(client: TestClient, create_user):
    user = create_user("privacy@example.com", "password", role="student")
    # default is "friends"
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/settings/privacy", headers=headers)
    assert res.status_code == 200
    assert res.json()["notification_privacy"] == "friends"


def test_update_privacy_setting_valid(client: TestClient, create_user):
    user = create_user("privacy2@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/settings/privacy",
        headers=headers,
        json={"notification_privacy": "everyone"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["setting"] == "everyone"


def test_update_privacy_setting_invalid_value(client: TestClient, create_user):
    user = create_user("privacybad@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": user.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/settings/privacy",
        headers=headers,
        json={"notification_privacy": "invalid_value"},
    )
    assert res.status_code == 400
    assert "Invalid privacy setting" in res.json()["detail"]


# ---------- Auth ----------


def test_signup_and_login_success(client: TestClient):
    email = "signup@example.com"
    password = "mypassword"

    res_signup = client.post(
        "/auth/signup",
        json={
            "email": email,
            "full_name": "Sign Up User",
            "password": password,
            "role": "student",
        },
    )
    assert res_signup.status_code == 201
    data = res_signup.json()
    assert data["email"] == email
    assert data["role"] == "student"
    assert "token" in data

    res_login = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert res_login.status_code == 200
    assert "token" in res_login.json()


def test_signup_duplicate_email_fails(client: TestClient, create_user):
    email = "dup@example.com"
    create_user(email, "password", role="student")

    res = client.post(
        "/auth/signup",
        json={
            "email": email,
            "full_name": "Duplicate",
            "password": "password",
            "role": "student",
        },
    )
    assert res.status_code == 400
    assert "Email is already registered" in res.json()["detail"]


def test_login_wrong_password(client: TestClient, create_user):
    email = "wrongpass@example.com"
    create_user(email, "correct", role="student")

    res = client.post(
        "/auth/login",
        json={"email": email, "password": "incorrect"},
    )
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]


def test_login_unknown_email(client: TestClient):
    res = client.post(
        "/auth/login",
        json={"email": "noone@example.com", "password": "pw"},
    )
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]


# professor endpoints

def test_professor_can_create_and_list_classes(
    client: TestClient,
    create_user,
):
    prof = create_user("prof@example.com", "password", role="professor")

    # login as professor
    res_login = client.post(
        "/auth/login",
        json={"email": prof.email, "password": "password"},
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # create class
    res_create = client.post(
        f"/api/professors/{prof.id}/classes",
        headers=headers,
        json={"name": "CS101", "code": "CS101A"},
    )
    assert res_create.status_code == 201
    created = res_create.json()
    assert created["name"] == "CS101"

    # list classes
    res_list = client.get(f"/api/professors/{prof.id}/classes", headers=headers)
    assert res_list.status_code == 200
    classes = res_list.json()
    assert len(classes) == 1
    assert classes[0]["name"] == "CS101"


def test_student_cannot_access_professor_classes(
    client: TestClient,
    create_user,
):
    prof = create_user("prof2@example.com", "password", role="professor")
    student = create_user("stud@example.com", "password", role="student")

    res_login = client.post(
        "/auth/login", json={"email": student.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/professors/{prof.id}/classes", headers=headers)
    assert res.status_code == 403


def test_professor_delete_class(
    client: TestClient,
    create_user,
    db_session: Session,
):
    prof = create_user("prof3@example.com", "password", role="professor")

    session = db_session
    clazz = Class(name="ClassToDelete", code="DEL1", professor_id=prof.id)
    session.add(clazz)
    session.commit()
    session.refresh(clazz)
    class_id = clazz.id

    # login as professor
    res_login = client.post(
        "/auth/login", json={"email": prof.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.delete(
        f"/api/professors/{prof.id}/classes/{class_id}", headers=headers
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Class deleted"


# student endpoints

def test_student_join_and_list_classes(
    client: TestClient,
    create_user,
    db_session: Session,
):
    # create professor and class
    prof = create_user("prof4@example.com", "password", role="professor")

    session = db_session
    clazz = Class(name="JoinableClass", code="JOINME", professor_id=prof.id)
    session.add(clazz)
    session.commit()
    session.refresh(clazz)
    class_id = clazz.id
    code = clazz.code

    student = create_user("stud2@example.com", "password", role="student")

    # login as student
    res_login = client.post(
        "/auth/login", json={"email": student.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # join class by code
    res_join = client.post(
        f"/api/students/{student.id}/join-class",
        headers=headers,
        json={"student_id": student.id, "code": code},
    )
    assert res_join.status_code == 200
    join_data = res_join.json()
    assert join_data["class_id"] == class_id

    # list classes for student
    res_list = client.get(
        f"/api/students/{student.id}/classes",
        headers=headers,
    )
    assert res_list.status_code == 200
    classes = res_list.json()
    assert len(classes) == 1
    assert classes[0]["name"] == "JoinableClass"


def test_student_join_class_with_invalid_code(
    client: TestClient,
    create_user,
):
    student = create_user("stud3@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": student.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/api/students/{student.id}/join-class",
        headers=headers,
        json={"student_id": student.id, "code": "NOPE"},
    )
    assert res.status_code == 404
    assert "Class with this code not found" in res.json()["detail"]


def test_student_leave_class_not_enrolled(
    client: TestClient,
    create_user,
    db_session: Session,
):
    prof = create_user("prof5@example.com", "password", role="professor")

    session = db_session
    clazz = Class(name="StandaloneClass", code="STAND", professor_id=prof.id)
    session.add(clazz)
    session.commit()
    session.refresh(clazz)
    class_id = clazz.id

    student = create_user("stud4@example.com", "password", role="student")
    res_login = client.post(
        "/auth/login", json={"email": student.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.delete(
        f"/api/classes/{class_id}/students/{student.id}",
        headers=headers,
    )
    assert res.status_code == 404
    assert "Student is not enrolled in this class" in res.json()["detail"]


# class

def test_class_summary_no_enrollments(
    client: TestClient,
    create_user,
    db_session: Session,
):
    prof = create_user("prof6@example.com", "password", role="professor")

    session = db_session
    clazz = Class(name="EmptyClass", code="EMPTY", professor_id=prof.id)
    session.add(clazz)
    session.commit()
    session.refresh(clazz)
    class_id = clazz.id

    # login as professor
    res_login = client.post(
        "/auth/login", json={"email": prof.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/classes/{class_id}/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is False
    assert "No students have been added" in data["message"]


def test_class_summary_with_data(
    client: TestClient,
    create_user,
    db_session: Session,
):
    prof = create_user("prof7@example.com", "password", role="professor")
    s1 = create_user("s1@example.com", "password", role="student")
    s2 = create_user("s2@example.com", "password", role="student")

    session = db_session
    clazz = Class(name="HealthClass", code="HEALTH", professor_id=prof.id)
    session.add(clazz)
    session.commit()
    session.refresh(clazz)

    # enroll students
    e1 = ClassEnrollment(class_id=clazz.id, student_id=s1.id)
    e2 = ClassEnrollment(class_id=clazz.id, student_id=s2.id)
    session.add_all([e1, e2])

    now = datetime.now(timezone.utc)
    # logs in last 7 days so they count as "sick"
    l1 = IllnessLog(
        user_id=s1.id,
        symptoms="cough fever",
        severity=3,
        recoveryTime=4,
        created_at=now,
    )
    l2 = IllnessLog(
        user_id=s2.id,
        symptoms="fever headache",
        severity=5,
        recoveryTime=7,
        created_at=now,
    )
    session.add_all([l1, l2])
    session.commit()

    # login as professor
    res_login = client.post(
        "/auth/login", json={"email": prof.email, "password": "password"}
    )
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/classes/{clazz.id}/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True
    assert data["count"] == 2
    # average of 3 and 5 is 4.0
    assert data["avg_severity"] == 4.0
    assert "fever" in data["common_symptoms"]