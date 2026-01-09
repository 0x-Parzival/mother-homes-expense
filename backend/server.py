from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

security = HTTPBearer()

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "user"  # user or admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Flat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    rent_amount: float
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FlatCreate(BaseModel):
    name: str
    address: str
    rent_amount: float

class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rent_amount: float
    flat_id: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TenantCreate(BaseModel):
    name: str
    rent_amount: float
    flat_id: str

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # rent, maintenance, maid, food, cleaning, repairs, other
    description: str
    amount: float
    flat_id: str
    user_id: str
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    flat_id: str
    date: Optional[datetime] = None

class FlatSummary(BaseModel):
    flat: Flat
    total_income: float
    total_expenses: float
    profit: float
    profit_percentage: float
    tenant_count: int

class DashboardStats(BaseModel):
    total_flats: int
    total_tenants: int
    total_income: float
    total_expenses: float
    total_profit: float
    average_profit_percentage: float
    flats_summary: List[FlatSummary]

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if user_doc is None:
        raise credentials_exception
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(email=user_data.email, name=user_data.name)
    user_dict = user.model_dump()
    user_dict['hashed_password'] = get_password_hash(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc.get('hashed_password', '')):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'hashed_password'})
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

# Flat Routes
@api_router.post("/flats", response_model=Flat)
async def create_flat(flat_data: FlatCreate, current_user: User = Depends(get_current_user)):
    flat = Flat(**flat_data.model_dump(), user_id=current_user.id)
    flat_dict = flat.model_dump()
    flat_dict['created_at'] = flat_dict['created_at'].isoformat()
    await db.flats.insert_one(flat_dict)
    return flat

@api_router.get("/flats", response_model=List[Flat])
async def get_flats(current_user: User = Depends(get_current_user)):
    flats = await db.flats.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for flat in flats:
        if isinstance(flat['created_at'], str):
            flat['created_at'] = datetime.fromisoformat(flat['created_at'])
    return flats

@api_router.get("/flats/{flat_id}", response_model=Flat)
async def get_flat(flat_id: str, current_user: User = Depends(get_current_user)):
    flat = await db.flats.find_one({"id": flat_id, "user_id": current_user.id}, {"_id": 0})
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found")
    if isinstance(flat['created_at'], str):
        flat['created_at'] = datetime.fromisoformat(flat['created_at'])
    return Flat(**flat)

@api_router.put("/flats/{flat_id}", response_model=Flat)
async def update_flat(flat_id: str, flat_data: FlatCreate, current_user: User = Depends(get_current_user)):
    result = await db.flats.update_one(
        {"id": flat_id, "user_id": current_user.id},
        {"$set": flat_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flat not found")
    return await get_flat(flat_id, current_user)

@api_router.delete("/flats/{flat_id}")
async def delete_flat(flat_id: str, current_user: User = Depends(get_current_user)):
    result = await db.flats.delete_one({"id": flat_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flat not found")
    # Also delete associated tenants and expenses
    await db.tenants.delete_many({"flat_id": flat_id})
    await db.expenses.delete_many({"flat_id": flat_id})
    return {"message": "Flat deleted successfully"}

# Tenant Routes
@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(tenant_data: TenantCreate, current_user: User = Depends(get_current_user)):
    # Verify flat belongs to user
    flat = await db.flats.find_one({"id": tenant_data.flat_id, "user_id": current_user.id})
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found")
    
    tenant = Tenant(**tenant_data.model_dump(), user_id=current_user.id)
    tenant_dict = tenant.model_dump()
    tenant_dict['created_at'] = tenant_dict['created_at'].isoformat()
    await db.tenants.insert_one(tenant_dict)
    return tenant

@api_router.get("/tenants", response_model=List[Tenant])
async def get_tenants(flat_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {"user_id": current_user.id}
    if flat_id:
        query["flat_id"] = flat_id
    tenants = await db.tenants.find(query, {"_id": 0}).to_list(1000)
    for tenant in tenants:
        if isinstance(tenant['created_at'], str):
            tenant['created_at'] = datetime.fromisoformat(tenant['created_at'])
    return tenants

@api_router.put("/tenants/{tenant_id}", response_model=Tenant)
async def update_tenant(tenant_id: str, tenant_data: TenantCreate, current_user: User = Depends(get_current_user)):
    result = await db.tenants.update_one(
        {"id": tenant_id, "user_id": current_user.id},
        {"$set": tenant_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if isinstance(tenant['created_at'], str):
        tenant['created_at'] = datetime.fromisoformat(tenant['created_at'])
    return Tenant(**tenant)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: User = Depends(get_current_user)):
    result = await db.tenants.delete_one({"id": tenant_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant deleted successfully"}

# Expense Routes
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    # Verify flat belongs to user
    flat = await db.flats.find_one({"id": expense_data.flat_id, "user_id": current_user.id})
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found")
    
    expense_dict = expense_data.model_dump()
    if expense_dict.get('date'):
        date = expense_dict['date']
    else:
        date = datetime.now(timezone.utc)
    
    expense = Expense(**{**expense_dict, 'date': date}, user_id=current_user.id)
    expense_dict = expense.model_dump()
    expense_dict['date'] = expense_dict['date'].isoformat()
    await db.expenses.insert_one(expense_dict)
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    flat_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"user_id": current_user.id}
    if flat_id:
        query["flat_id"] = flat_id
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = datetime.fromisoformat(start_date).isoformat()
        if end_date:
            date_query["$lte"] = datetime.fromisoformat(end_date).isoformat()
        query["date"] = date_query
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    for expense in expenses:
        if isinstance(expense['date'], str):
            expense['date'] = datetime.fromisoformat(expense['date'])
    return expenses

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    update_dict = expense_data.model_dump()
    if update_dict.get('date'):
        update_dict['date'] = update_dict['date'].isoformat()
    
    result = await db.expenses.update_one(
        {"id": expense_id, "user_id": current_user.id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if isinstance(expense['date'], str):
        expense['date'] = datetime.fromisoformat(expense['date'])
    return Expense(**expense)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: User = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# Dashboard & Analytics
@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    flats = await db.flats.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    date_query = {}
    if start_date or end_date:
        if start_date:
            date_query["$gte"] = datetime.fromisoformat(start_date).isoformat()
        if end_date:
            date_query["$lte"] = datetime.fromisoformat(end_date).isoformat()
    
    flats_summary = []
    total_income = 0
    total_expenses = 0
    total_profit = 0
    
    for flat_doc in flats:
        if isinstance(flat_doc['created_at'], str):
            flat_doc['created_at'] = datetime.fromisoformat(flat_doc['created_at'])
        flat = Flat(**flat_doc)
        
        # Get tenants
        tenants = await db.tenants.find({"flat_id": flat.id}, {"_id": 0}).to_list(1000)
        tenant_count = len(tenants)
        income = sum(t['rent_amount'] for t in tenants)
        
        # Get expenses
        expense_query = {"flat_id": flat.id}
        if date_query:
            expense_query["date"] = date_query
        expenses = await db.expenses.find(expense_query, {"_id": 0}).to_list(10000)
        expense_total = sum(e['amount'] for e in expenses)
        
        profit = income - expense_total
        profit_percentage = (profit / income * 100) if income > 0 else 0
        
        flats_summary.append(FlatSummary(
            flat=flat,
            total_income=income,
            total_expenses=expense_total,
            profit=profit,
            profit_percentage=profit_percentage,
            tenant_count=tenant_count
        ))
        
        total_income += income
        total_expenses += expense_total
        total_profit += profit
    
    avg_profit_percentage = (total_profit / total_income * 100) if total_income > 0 else 0
    total_tenants = sum(fs.tenant_count for fs in flats_summary)
    
    return DashboardStats(
        total_flats=len(flats),
        total_tenants=total_tenants,
        total_income=total_income,
        total_expenses=total_expenses,
        total_profit=total_profit,
        average_profit_percentage=avg_profit_percentage,
        flats_summary=flats_summary
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()