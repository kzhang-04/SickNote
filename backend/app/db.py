from sqlmodel import SQLModel, create_engine, Session
from . import models

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(DATABASE_URL, echo=True, connect_args = {"check_same_thread": False})

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)