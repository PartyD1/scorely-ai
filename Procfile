release: cd backend && python -m alembic upgrade head
web: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
