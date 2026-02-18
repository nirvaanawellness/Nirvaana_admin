from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    THERAPIST = "therapist"

class PaymentCycle(str, Enum):
    MONTHLY = "monthly"
    BIWEEKLY = "biweekly"

class PaymentReceivedBy(str, Enum):
    HOTEL = "hotel"
    NIRVAANA = "nirvaana"

class PaymentMode(str, Enum):
    CASH = "cash"
    UPI = "upi"
    CARD = "card"

class EntityStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class User(BaseModel):
    email: str
    phone: str
    password_hash: str
    role: UserRole
    full_name: str
    assigned_property_id: Optional[str] = None
    status: EntityStatus = EntityStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    archived_at: Optional[datetime] = None

class UserCreate(BaseModel):
    email: str
    phone: str
    password: str
    role: UserRole
    full_name: str
    assigned_property_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class OwnershipType(str, Enum):
    OUR_PROPERTY = "our_property"
    OUTSIDE_PROPERTY = "outside_property"

class Property(BaseModel):
    hotel_name: str
    location: str
    gst_number: str
    ownership_type: OwnershipType = OwnershipType.OUTSIDE_PROPERTY
    revenue_share_percentage: Optional[float] = None  # Only required for outside_property
    contract_start_date: Optional[str] = None
    payment_cycle: PaymentCycle = PaymentCycle.MONTHLY
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None
    active: bool = True
    status: EntityStatus = EntityStatus.ACTIVE
    archived_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyCreate(BaseModel):
    hotel_name: str
    location: str
    gst_number: Optional[str] = None
    ownership_type: OwnershipType = OwnershipType.OUTSIDE_PROPERTY
    revenue_share_percentage: Optional[float] = None  # Only required for outside_property
    contract_start_date: Optional[str] = None
    payment_cycle: Optional[PaymentCycle] = PaymentCycle.MONTHLY
    contact_person: Optional[str] = None
    contact_number: Optional[str] = None

class Therapist(BaseModel):
    user_id: str
    full_name: str
    phone: str
    email: str
    experience_years: float
    salary_expectation: Optional[float] = None
    id_proof_url: Optional[str] = None
    address: Optional[str] = None
    profile_photo_url: Optional[str] = None
    bank_details: Optional[str] = None
    assigned_property_id: str
    monthly_target: float = 0.0
    status: EntityStatus = EntityStatus.ACTIVE
    archived_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TherapistCreate(BaseModel):
    full_name: str
    phone: str
    email: str
    date_of_birth: str  # Format: YYYY-MM-DD (for password generation as DDMMYY)
    password: Optional[str] = None  # Optional - will be auto-generated from DOB if not provided
    experience_years: float
    salary_expectation: Optional[float] = None
    address: Optional[str] = None
    bank_details: Optional[str] = None
    assigned_property_id: str
    monthly_target: float = 0.0

class Attendance(BaseModel):
    therapist_id: str
    property_id: str
    date: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    gps_location: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceCheckIn(BaseModel):
    gps_location: Optional[str] = None

class ServiceEntry(BaseModel):
    therapist_id: str
    property_id: str
    customer_name: str
    customer_phone: str
    therapy_type: str
    therapy_duration: str
    base_price: float
    gst_amount: float
    total_amount: float
    payment_received_by: PaymentReceivedBy
    payment_mode: Optional[PaymentMode] = None
    date: str
    time: str
    locked: bool = False
    whatsapp_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceEntryCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None  # For feedback emails
    therapy_type: str
    therapy_duration: str
    base_price: float
    payment_received_by: PaymentReceivedBy
    payment_mode: Optional[PaymentMode] = None

    @field_validator('base_price')
    def validate_base_price(cls, v):
        if v <= 0:
            raise ValueError('Base price must be greater than 0')
        return v

class IncentiveRecord(BaseModel):
    therapist_id: str
    month: int
    year: int
    target: float
    threshold: float
    actual_sales: float
    excess_amount: float
    incentive_earned: float
    approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MonthlyClosing(BaseModel):
    property_id: str
    month: int
    year: int
    total_base_sales: float
    total_gst: float
    hotel_share: float
    nirvaana_share: float
    amount_received_by_hotel: float
    amount_received_by_nirvaana: float
    settlement_balance: float
    locked: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenData(BaseModel):
    email: str
    role: UserRole
    user_id: str

class ExpenseType(str, Enum):
    SALARY = "salary"
    LIVING_COST = "living_cost"
    MARKETING = "marketing"
    DISPOSABLES = "disposables"
    OIL_AROMATICS = "oil_aromatics"
    ESSENTIALS = "essentials"
    BILL_BOOKS = "bill_books"
    OTHER = "other"

class ExpenseCategory(str, Enum):
    RECURRING = "recurring"
    ADHOC = "adhoc"

class Expense(BaseModel):
    property_id: Optional[str] = None  # None = shared expense distributed across all properties
    expense_type: ExpenseType
    category: ExpenseCategory
    amount: float
    description: Optional[str] = None
    date: str
    therapist_id: Optional[str] = None  # For salary expenses
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    property_id: Optional[str] = None  # None = shared expense distributed across all properties
    expense_type: ExpenseType
    category: ExpenseCategory
    amount: float
    description: Optional[str] = None
    date: str
    therapist_id: Optional[str] = None

# OTP Models for Password Reset
class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class PasswordChange(BaseModel):
    email: str
    otp: str
    new_password: str

class OTPRecord(BaseModel):
    email: str
    otp: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    used: bool = False