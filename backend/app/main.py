from fastapi import FastAPI

from .db import init_db

app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}
