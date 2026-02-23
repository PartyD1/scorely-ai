"""Database connection and session management."""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/rubric_db")

# Use psycopg (v3) driver — swap postgresql:// to postgresql+psycopg://
db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Neon (and other managed Postgres providers) require SSL on all remote connections
_connect_args = {}
if "localhost" not in db_url and "127.0.0.1" not in db_url:
    _connect_args = {"sslmode": "require"}

engine = create_engine(db_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yield a database session, closing it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
