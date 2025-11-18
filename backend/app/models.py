from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field, Column, JSON


class IllnessLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # in future: user_id: int
    symptoms: List[str] = Field(
        sa_column=Column(JSON),  # store list as JSON
    )
    severity: int = Field(index=True)  # 1..5
    recovery_days: int
    created_at: datetime = Field(default_factory=datetime.utcnow)