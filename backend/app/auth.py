"""JWT authentication dependency for FastAPI.

Decodes NextAuth v4 JWT tokens (HS256, signed with NEXTAUTH_SECRET).
Returns the authenticated User (upserted) or None for anonymous requests.
"""

import logging
import os
import uuid
from datetime import datetime
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

logger = logging.getLogger(__name__)

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def _decode_nextauth_token(token: str) -> Optional[dict]:
    """Decode a NextAuth v4 JWT. Returns payload dict or None on failure."""
    if not NEXTAUTH_SECRET:
        logger.warning("NEXTAUTH_SECRET not set — all auth will be anonymous")
        return None
    try:
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("NextAuth token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.debug("NextAuth token invalid: %s", e)
        return None


def _upsert_user(db: Session, google_id: str, email: str, name: str, picture: Optional[str]) -> User:
    """Create or update a User row by google_id."""
    user = db.query(User).filter(User.google_id == google_id).first()
    if user is None:
        user = User(
            id=str(uuid.uuid4()),
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
            created_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        # Keep name/picture fresh in case user updated their Google profile
        user.name = name
        user.picture = picture
    db.commit()
    db.refresh(user)
    return user


def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency: returns authenticated User or None (anonymous)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode_nextauth_token(token)
    if payload is None:
        return None

    google_id = payload.get("sub")
    email = payload.get("email")
    name = payload.get("name") or email or "Unknown"
    picture = payload.get("picture")

    if not google_id or not email:
        logger.debug("NextAuth JWT missing sub or email")
        return None

    return _upsert_user(db, google_id, email, name, picture)


def require_user(user: Optional[User] = Depends(get_optional_user)) -> User:
    """FastAPI dependency: raises 401 if not authenticated."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    """FastAPI dependency: raises 403 if user is not the configured admin."""
    if not ADMIN_EMAIL or user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
