from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database import engine, get_db
from models import Base, User, Note, Category, Tag
from auth import get_password_hash, verify_password, create_access_token, get_current_user

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Note Taking API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class NoteCreate(BaseModel):
    title: str
    content: str = ""
    category_id: Optional[int] = None
    tags: List[str] = []

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    is_archived: Optional[bool] = None

class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]
    category_id: Optional[int]
    category_name: Optional[str] = None
    tags: List[str] = []

class CategoryCreate(BaseModel):
    name: str
    color: str = "#3B82F6"

# Auth Endpoints
@app.post("/api/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create token
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}

# Note Endpoints
@app.get("/api/notes", response_model=List[NoteResponse])
def get_notes(
    archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notes = db.query(Note).filter(
        Note.user_id == current_user.id,
        Note.is_archived == archived
    ).order_by(Note.created_at.desc()).all()
    
    result = []
    for note in notes:
        result.append(NoteResponse(
            id=note.id,
            title=note.title,
            content=note.content,
            is_archived=note.is_archived,
            created_at=note.created_at,
            updated_at=note.updated_at,
            category_id=note.category_id,
            category_name=note.category.name if note.category else None,
            tags=[tag.name for tag in note.tags]
        ))
    return result

@app.post("/api/notes", response_model=NoteResponse)
def create_note(
    note: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_note = Note(
        title=note.title,
        content=note.content,
        user_id=current_user.id,
        category_id=note.category_id
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    # Add tags
    for tag_name in note.tags:
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
            db.commit()
            db.refresh(tag)
        db_note.tags.append(tag)
    db.commit()
    
    return NoteResponse(
        id=db_note.id,
        title=db_note.title,
        content=db_note.content,
        is_archived=db_note.is_archived,
        created_at=db_note.created_at,
        updated_at=db_note.updated_at,
        category_id=db_note.category_id,
        category_name=db_note.category.name if db_note.category else None,
        tags=[tag.name for tag in db_note.tags]
    )

@app.put("/api/notes/{note_id}")
def update_note(
    note_id: int,
    note: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.title is not None:
        db_note.title = note.title
    if note.content is not None:
        db_note.content = note.content
    if note.category_id is not None:
        db_note.category_id = note.category_id
    if note.is_archived is not None:
        db_note.is_archived = note.is_archived
    
    db.commit()
    return {"message": "Note updated"}

@app.delete("/api/notes/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(db_note)
    db.commit()
    return {"message": "Note deleted"}

# Category Endpoints
@app.get("/api/categories")
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    return [{"id": c.id, "name": c.name, "color": c.color} for c in categories]

@app.post("/api/categories")
def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_category = Category(
        name=category.name,
        color=category.color,
        user_id=current_user.id
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "color": db_category.color}

# Health check
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
