from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, JSON

# For Illness Log
# This will create the table, but you still need to read it with a class using FastAPI
class IllnessLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symptoms: List[str] = Field(
        sa_column=Column(JSON),  # store list as JSON
    )
    severity: int = Field(index=True)  # 1..5
    recovery_days: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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