from sqlmodel import SQLModel, create_engine, Session
from .models import IllnessLog, LogCreate

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False}
)


def get_session():
    with Session(engine) as session:
        yield session


def init_db(engine=engine):
    SQLModel.metadata.create_all(engine)


def create_illness_log(session: Session, log_in: LogCreate) -> IllnessLog:
    db_log = IllnessLog.model_validate(log_in.model_dump())

    session.add(db_log)
    session.commit()
    session.refresh(db_log)

    return db_log