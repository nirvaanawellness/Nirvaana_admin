from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from models import (
    User, UserCreate, UserLogin, UserRole,
    Property, PropertyCreate,
    Therapist, TherapistCreate,
    Attendance, AttendanceCheckIn,
    ServiceEntry, ServiceEntryCreate,
    IncentiveRecord, MonthlyClosing, PaymentReceivedBy
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_admin, security
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix=\"/api\")

@api_router.post(\"/auth/register\")
async def register(user_data: UserCreate):\n    existing = await db.users.find_one({\"email\": user_data.email})\n    if existing:\n        raise HTTPException(status_code=400, detail=\"Email already registered\")\n    \n    user_dict = user_data.model_dump(exclude={\"password\"})\n    user_dict[\"password_hash\"] = get_password_hash(user_data.password)\n    user_dict[\"created_at\"] = datetime.now(timezone.utc).isoformat()\n    \n    result = await db.users.insert_one(user_dict)\n    user_id = str(result.inserted_id)\n    \n    token = create_access_token({\n        \"email\": user_data.email,\n        \"role\": user_data.role,\n        \"user_id\": user_id\n    })\n    \n    return {\n        \"token\": token,\n        \"user\": {\n            \"email\": user_data.email,\n            \"role\": user_data.role,\n            \"full_name\": user_data.full_name,\n            \"user_id\": user_id\n        }\n    }

@api_router.post(\"/auth/login\")
async def login(credentials: UserLogin):\n    user = await db.users.find_one({\"email\": credentials.email})\n    if not user or not verify_password(credentials.password, user[\"password_hash\"]):\n        raise HTTPException(status_code=401, detail=\"Invalid credentials\")\n    \n    token = create_access_token({\n        \"email\": user[\"email\"],\n        \"role\": user[\"role\"],\n        \"user_id\": str(user[\"_id\"])\n    })\n    \n    return {\n        \"token\": token,\n        \"user\": {\n            \"email\": user[\"email\"],\n            \"role\": user[\"role\"],\n            \"full_name\": user[\"full_name\"],\n            \"user_id\": str(user[\"_id\"]),\n            \"assigned_property_id\": user.get(\"assigned_property_id\")\n        }\n    }

@api_router.get(\"/properties\")
async def get_properties(current_user: dict = Depends(get_current_user)):\n    properties = await db.properties.find({}, {\"_id\": 0}).to_list(1000)\n    return properties

@api_router.post(\"/properties\")
async def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_admin)):\n    prop_dict = property_data.model_dump()\n    prop_dict[\"created_at\"] = datetime.now(timezone.utc).isoformat()\n    prop_dict[\"active\"] = True\n    \n    result = await db.properties.insert_one(prop_dict)\n    prop_dict[\"id\"] = str(result.inserted_id)\n    return prop_dict

@api_router.get(\"/properties/{property_id}\")
async def get_property(property_id: str, current_user: dict = Depends(get_current_user)):\n    from bson import ObjectId\n    property_data = await db.properties.find_one({\"_id\": ObjectId(property_id)}, {\"_id\": 0})\n    if not property_data:\n        raise HTTPException(status_code=404, detail=\"Property not found\")\n    return property_data

@api_router.put(\"/properties/{property_id}\")
async def update_property(property_id: str, property_data: PropertyCreate, current_user: dict = Depends(get_current_admin)):\n    from bson import ObjectId\n    prop_dict = property_data.model_dump()\n    result = await db.properties.update_one({\"_id\": ObjectId(property_id)}, {\"$set\": prop_dict})\n    if result.matched_count == 0:\n        raise HTTPException(status_code=404, detail=\"Property not found\")\n    return {\"message\": \"Property updated successfully\"}

@api_router.post(\"/therapists\")
async def create_therapist(therapist_data: TherapistCreate, current_user: dict = Depends(get_current_admin)):\n    existing = await db.users.find_one({\"email\": therapist_data.email})\n    if existing:\n        raise HTTPException(status_code=400, detail=\"Email already registered\")\n    \n    user_dict = {\n        \"email\": therapist_data.email,\n        \"phone\": therapist_data.phone,\n        \"password_hash\": get_password_hash(therapist_data.password),\n        \"role\": UserRole.THERAPIST,\n        \"full_name\": therapist_data.full_name,\n        \"assigned_property_id\": therapist_data.assigned_property_id,\n        \"created_at\": datetime.now(timezone.utc).isoformat()\n    }\n    \n    user_result = await db.users.insert_one(user_dict)\n    user_id = str(user_result.inserted_id)\n    \n    therapist_dict = therapist_data.model_dump(exclude={\"password\"})\n    therapist_dict[\"user_id\"] = user_id\n    therapist_dict[\"created_at\"] = datetime.now(timezone.utc).isoformat()\n    \n    await db.therapists.insert_one(therapist_dict)\n    \n    return {\"message\": \"Therapist created successfully\", \"user_id\": user_id}

@api_router.get(\"/therapists\")
async def get_therapists(current_user: dict = Depends(get_current_admin)):\n    therapists = await db.therapists.find({}, {\"_id\": 0}).to_list(1000)\n    return therapists

@api_router.get(\"/therapists/me\")
async def get_therapist_profile(current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Not a therapist\")\n    \n    therapist = await db.therapists.find_one({\"user_id\": current_user[\"user_id\"]}, {\"_id\": 0})\n    if not therapist:\n        raise HTTPException(status_code=404, detail=\"Therapist profile not found\")\n    return therapist

@api_router.post(\"/attendance/check-in\")
async def check_in(data: AttendanceCheckIn, current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Only therapists can check in\")\n    \n    therapist = await db.therapists.find_one({\"user_id\": current_user[\"user_id\"]})\n    if not therapist:\n        raise HTTPException(status_code=404, detail=\"Therapist not found\")\n    \n    today = datetime.now(timezone.utc).strftime(\"%Y-%m-%d\")\n    existing = await db.attendance.find_one({\n        \"therapist_id\": current_user[\"user_id\"],\n        \"date\": today\n    })\n    \n    if existing and existing.get(\"check_in_time\"):\n        raise HTTPException(status_code=400, detail=\"Already checked in today\")\n    \n    attendance_dict = {\n        \"therapist_id\": current_user[\"user_id\"],\n        \"property_id\": therapist[\"assigned_property_id\"],\n        \"date\": today,\n        \"check_in_time\": datetime.now(timezone.utc).isoformat(),\n        \"gps_location\": data.gps_location,\n        \"created_at\": datetime.now(timezone.utc).isoformat()\n    }\n    \n    await db.attendance.insert_one(attendance_dict)\n    return {\"message\": \"Checked in successfully\", \"time\": attendance_dict[\"check_in_time\"]}

@api_router.post(\"/attendance/check-out\")
async def check_out(current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Only therapists can check out\")\n    \n    today = datetime.now(timezone.utc).strftime(\"%Y-%m-%d\")\n    attendance = await db.attendance.find_one({\n        \"therapist_id\": current_user[\"user_id\"],\n        \"date\": today\n    })\n    \n    if not attendance:\n        raise HTTPException(status_code=400, detail=\"No check-in found for today\")\n    \n    if attendance.get(\"check_out_time\"):\n        raise HTTPException(status_code=400, detail=\"Already checked out\")\n    \n    check_out_time = datetime.now(timezone.utc).isoformat()\n    await db.attendance.update_one(\n        {\"therapist_id\": current_user[\"user_id\"], \"date\": today},\n        {\"$set\": {\"check_out_time\": check_out_time}}\n    )\n    \n    return {\"message\": \"Checked out successfully\", \"time\": check_out_time}

@api_router.get(\"/attendance/my-attendance\")
async def get_my_attendance(current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Only therapists can view their attendance\")\n    \n    attendance_records = await db.attendance.find(\n        {\"therapist_id\": current_user[\"user_id\"]},\n        {\"_id\": 0}\n    ).sort(\"date\", -1).to_list(100)\n    \n    return attendance_records

@api_router.post(\"/services\")
async def create_service_entry(service_data: ServiceEntryCreate, current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Only therapists can create service entries\")\n    \n    therapist = await db.therapists.find_one({\"user_id\": current_user[\"user_id\"]})\n    if not therapist:\n        raise HTTPException(status_code=404, detail=\"Therapist not found\")\n    \n    gst_amount = round(service_data.base_price * 0.18, 2)\n    total_amount = round(service_data.base_price + gst_amount, 2)\n    \n    now = datetime.now(timezone.utc)\n    service_dict = service_data.model_dump()\n    service_dict.update({\n        \"therapist_id\": current_user[\"user_id\"],\n        \"property_id\": therapist[\"assigned_property_id\"],\n        \"gst_amount\": gst_amount,\n        \"total_amount\": total_amount,\n        \"date\": now.strftime(\"%Y-%m-%d\"),\n        \"time\": now.strftime(\"%H:%M:%S\"),\n        \"locked\": True,\n        \"whatsapp_sent\": False,\n        \"created_at\": now.isoformat()\n    })\n    \n    result = await db.services.insert_one(service_dict)\n    \n    return {\n        \"message\": \"Service entry created successfully\",\n        \"service_id\": str(result.inserted_id),\n        \"gst_amount\": gst_amount,\n        \"total_amount\": total_amount\n    }

@api_router.get(\"/services/my-services\")
async def get_my_services(current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Only therapists can view their services\")\n    \n    services = await db.services.find(\n        {\"therapist_id\": current_user[\"user_id\"]},\n        {\"_id\": 0}\n    ).sort(\"created_at\", -1).to_list(1000)\n    \n    return services

@api_router.get(\"/services\")
async def get_all_services(\n    property_id: Optional[str] = None,\n    therapist_id: Optional[str] = None,\n    date_from: Optional[str] = None,\n    date_to: Optional[str] = None,\n    current_user: dict = Depends(get_current_admin)\n):\n    query = {}\n    if property_id:\n        query[\"property_id\"] = property_id\n    if therapist_id:\n        query[\"therapist_id\"] = therapist_id\n    if date_from:\n        query[\"date\"] = {\"$gte\": date_from}\n    if date_to:\n        if \"date\" in query:\n            query[\"date\"][\"$lte\"] = date_to\n        else:\n            query[\"date\"] = {\"$lte\": date_to}\n    \n    services = await db.services.find(query, {\"_id\": 0}).sort(\"created_at\", -1).to_list(10000)\n    return services

@api_router.get(\"/incentives/my-incentive\")
async def get_my_incentive(current_user: dict = Depends(get_current_user)):\n    if current_user[\"role\"] != \"therapist\":\n        raise HTTPException(status_code=403, detail=\"Only therapists can view their incentives\")\n    \n    therapist = await db.therapists.find_one({\"user_id\": current_user[\"user_id\"]})\n    if not therapist:\n        raise HTTPException(status_code=404, detail=\"Therapist not found\")\n    \n    now = datetime.now(timezone.utc)\n    current_month = now.month\n    current_year = now.year\n    \n    services = await db.services.find({\n        \"therapist_id\": current_user[\"user_id\"],\n        \"date\": {\"$regex\": f\"^{current_year}-{current_month:02d}\"}\n    }, {\"_id\": 0}).to_list(10000)\n    \n    actual_sales = sum(s[\"base_price\"] for s in services)\n    target = therapist.get(\"monthly_target\", 0)\n    threshold = target * 0.9\n    \n    if actual_sales > threshold:\n        excess_amount = actual_sales - threshold\n        incentive_earned = excess_amount * 0.05\n    else:\n        excess_amount = 0\n        incentive_earned = 0\n    \n    return {\n        \"target\": target,\n        \"threshold\": threshold,\n        \"actual_sales\": actual_sales,\n        \"progress_percentage\": round((actual_sales / target * 100) if target > 0 else 0, 2),\n        \"excess_amount\": round(excess_amount, 2),\n        \"incentive_earned\": round(incentive_earned, 2)\n    }

@api_router.get(\"/analytics/dashboard\")
async def get_dashboard_analytics(\n    property_id: Optional[str] = None,\n    current_user: dict = Depends(get_current_admin)\n):\n    query = {}\n    if property_id:\n        query[\"property_id\"] = property_id\n    \n    services = await db.services.find(query, {\"_id\": 0}).to_list(100000)\n    \n    total_base_sales = sum(s[\"base_price\"] for s in services)\n    total_gst = sum(s[\"gst_amount\"] for s in services)\n    total_sales = sum(s[\"total_amount\"] for s in services)\n    \n    hotel_received = sum(s[\"total_amount\"] for s in services if s[\"payment_received_by\"] == \"hotel\")\n    nirvaana_received = sum(s[\"total_amount\"] for s in services if s[\"payment_received_by\"] == \"nirvaana\")\n    \n    customer_count = len(set(s[\"customer_phone\"] for s in services))\n    \n    therapy_counts = {}\n    for s in services:\n        therapy_type = s[\"therapy_type\"]\n        therapy_counts[therapy_type] = therapy_counts.get(therapy_type, 0) + 1\n    \n    most_popular_therapy = max(therapy_counts.items(), key=lambda x: x[1])[0] if therapy_counts else \"N/A\"\n    \n    return {\n        \"total_base_sales\": round(total_base_sales, 2),\n        \"total_gst\": round(total_gst, 2),\n        \"total_sales\": round(total_sales, 2),\n        \"hotel_received\": round(hotel_received, 2),\n        \"nirvaana_received\": round(nirvaana_received, 2),\n        \"customer_count\": customer_count,\n        \"most_popular_therapy\": most_popular_therapy,\n        \"total_services\": len(services)\n    }

@api_router.get(\"/revenue/property/{property_id}\")
async def get_property_revenue(\n    property_id: str,\n    month: Optional[int] = None,\n    year: Optional[int] = None,\n    current_user: dict = Depends(get_current_admin)\n):\n    from bson import ObjectId\n    property_data = await db.properties.find_one({\"_id\": ObjectId(property_id)})\n    if not property_data:\n        raise HTTPException(status_code=404, detail=\"Property not found\")\n    \n    now = datetime.now(timezone.utc)\n    target_month = month or now.month\n    target_year = year or now.year\n    \n    services = await db.services.find({\n        \"property_id\": property_id,\n        \"date\": {\"$regex\": f\"^{target_year}-{target_month:02d}\"}\n    }, {\"_id\": 0}).to_list(100000)\n    \n    total_base_sales = sum(s[\"base_price\"] for s in services)\n    total_gst = sum(s[\"gst_amount\"] for s in services)\n    \n    revenue_share = property_data[\"revenue_share_percentage\"] / 100\n    hotel_share = total_base_sales * revenue_share\n    nirvaana_share = total_base_sales * (1 - revenue_share)\n    \n    hotel_received = sum(s[\"total_amount\"] for s in services if s[\"payment_received_by\"] == \"hotel\")\n    nirvaana_received = sum(s[\"total_amount\"] for s in services if s[\"payment_received_by\"] == \"nirvaana\")\n    \n    settlement_balance = nirvaana_received - nirvaana_share\n    \n    return {\n        \"property_name\": property_data[\"hotel_name\"],\n        \"month\": target_month,\n        \"year\": target_year,\n        \"revenue_share_percentage\": property_data[\"revenue_share_percentage\"],\n        \"total_base_sales\": round(total_base_sales, 2),\n        \"total_gst\": round(total_gst, 2),\n        \"hotel_share\": round(hotel_share, 2),\n        \"nirvaana_share\": round(nirvaana_share, 2),\n        \"hotel_received\": round(hotel_received, 2),\n        \"nirvaana_received\": round(nirvaana_received, 2),\n        \"settlement_balance\": round(settlement_balance, 2),\n        \"settlement_note\": \"Positive = Nirvaana owes Hotel, Negative = Hotel owes Nirvaana\"\n    }

app.include_router(api_router)

app.add_middleware(\n    CORSMiddleware,\n    allow_credentials=True,\n    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),\n    allow_methods=[\"*\"],\n    allow_headers=[\"*\"],\n)

logging.basicConfig(\n    level=logging.INFO,\n    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'\n)\nlogger = logging.getLogger(__name__)

@app.on_event(\"shutdown\")\nasync def shutdown_db_client():\n    client.close()
