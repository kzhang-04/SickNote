from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./app.db"  # file app.db in backend/

engine = create_engine(
    DATABASE_URL, echo=True  # echo=True logs SQL; turn off later if noisy
)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    # import models so SQLModel sees them
    from . import models  # noqa
    SQLModel.metadata.create_all(engine)
    