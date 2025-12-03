from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, JSON
from pydantic import validator, EmailStr

class LogCreate(SQLModel):
    symptoms: str
    severity: int
    recoveryTime: int

    # Ensure severity is within 1-5
    @validator('severity')
    def valid_severity(cls, v):
        if not isinstance(v, int):
            raise ValueError("Severity must be an integer")
        if v < 1 or v > 5:
            raise ValueError("Severity must be between 1 and 5")
        return v

    # Ensure recoveryTime is positive
    @validator('recoveryTime')
    def valid_recoveryTime(cls, v):
        if not isinstance(v, int):
            raise ValueError("Recovery time must be an integer")
        if v <= 0:
            raise ValueError("Recovery time must be positive")
        return v

# For Illness Log
# This will create the table, but you still need to read it with a class using FastAPI
class IllnessLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    symptoms: str
    severity: int = Field(index=True)  # 1..5
    recoveryTime: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LogRead(LogCreate):
    id: int
    created_at: datetime

# For Friends Lists
class Friend(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_user_id: int
    friend_name: str
    friend_email: str

class FriendRead(SQLModel):
    id: int
    friend_name: str
    friend_email: str

class NotifyRequest(SQLModel):
    friend_ids: List[int]


# For Professor Summary
class ClassEnrollment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    professor_id: int = Field(foreign_key="user.id")
    student_id: int = Field(foreign_key="user.id")

class StudentHealth(SQLModel):
    student_id: int
    full_name: Optional[str] = None
    email: EmailStr
    is_sick: bool
    latest_symptoms: Optional[str] = None
    latest_severity: Optional[int] = None
    latest_created_at: Optional[datetime] = None

class SummaryResponse(SQLModel):
    available: bool
    count: Optional[int] = None  # number of sick students
    avg_severity: Optional[float] = None
    common_symptoms: Optional[List[str]] = None
    message: Optional[str] = None

    # per-student health rows
    students: List[StudentHealth] = []

class AddStudentRequest(SQLModel):
    student_email: EmailStr

# For auth

class UserBase(SQLModel):
    email: EmailStr = Field(index=True)
    full_name: Optional[str] = None
    role: str = "student"  # or "professor"


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: datetime


class LoginRequest(SQLModel):
    email: EmailStr
    password: str


class LoginResponse(SQLModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    token: str
