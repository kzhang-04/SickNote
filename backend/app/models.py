from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, JSON

class LogCreate(SQLModel):
    symptoms: str
    severity: int
    recovery_time: str

# For Illness Log
# This will create the table, but you still need to read it with a class using FastAPI
class IllnessLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symptoms: str
    severity: int = Field(index=True)  # 1..5
    recovery_time: str
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
# I just have the schema class here I'm not sure if you need a table.
class SummaryResponse(SQLModel):
    available: bool
    count: Optional[int] = None
    avg_severity: Optional[float] = None