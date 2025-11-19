from fastapi import FastAPI
from .db import init_db

# FastAPI
app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()


# Just a basic check to see if its working not related to project.
@app.get("/health")
def health_check():
    return {"status": "ok"}