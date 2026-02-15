from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
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
from whatsapp_service import whatsapp_service
from email_service import email_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump(exclude={"password"})
    user_dict["password_hash"] = get_password_hash(user_data.password)
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    token = create_access_token({
        "email": user_data.email,
        "role": user_data.role,
        "user_id": user_id
    })
    
    return {
        "token": token,
        "user": {
            "email": user_data.email,
            "role": user_data.role,
            "full_name": user_data.full_name,
            "user_id": user_id
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "email": user["email"],
        "role": user["role"],
        "user_id": str(user["_id"])
    })
    
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "role": user["role"],
            "full_name": user["full_name"],
            "user_id": str(user["_id"]),
            "assigned_property_id": user.get("assigned_property_id")
        }
    }

@api_router.get("/properties")
async def get_properties(current_user: dict = Depends(get_current_user)):
    properties_cursor = db.properties.find({})
    properties = []
    async for prop in properties_cursor:
        prop_dict = {k: v for k, v in prop.items() if k != "_id"}
        prop_dict["id"] = str(prop["_id"])
        properties.append(prop_dict)
    return properties

@api_router.post("/properties")
async def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_admin)):
    prop_dict = property_data.model_dump()
    prop_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    prop_dict["active"] = True
    
    result = await db.properties.insert_one(prop_dict)
    prop_dict["id"] = str(result.inserted_id)
    return prop_dict

@api_router.get("/properties/{property_id}")
async def get_property(property_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    property_data = await db.properties.find_one({"_id": ObjectId(property_id)}, {"_id": 0})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_data

@api_router.put("/properties/{property_id}")
async def update_property(property_id: str, property_data: PropertyCreate, current_user: dict = Depends(get_current_admin)):
    from bson import ObjectId
    prop_dict = property_data.model_dump()
    result = await db.properties.update_one({"_id": ObjectId(property_id)}, {"$set": prop_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property updated successfully"}

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(get_current_admin)):
    from bson import ObjectId
    
    # Check if any therapists are assigned to this property
    therapists_count = await db.therapists.count_documents({"assigned_property_id": property_id})
    if therapists_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete property. {therapists_count} therapists are still assigned to it.")
    
    result = await db.properties.delete_one({"_id": ObjectId(property_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": "Property deleted successfully"}

@api_router.post("/therapists")
async def create_therapist(therapist_data: TherapistCreate, current_user: dict = Depends(get_current_admin)):
    existing = await db.users.find_one({"email": therapist_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Auto-generate secure password if not provided or if email service enabled
    use_email = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
    if use_email or not therapist_data.password:
        generated_password = email_service.generate_secure_password()
    else:
        generated_password = therapist_data.password
    
    user_dict = {
        "email": therapist_data.email,
        "phone": therapist_data.phone,
        "password_hash": get_password_hash(generated_password),
        "role": UserRole.THERAPIST,
        "full_name": therapist_data.full_name,
        "assigned_property_id": therapist_data.assigned_property_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    user_result = await db.users.insert_one(user_dict)
    user_id = str(user_result.inserted_id)
    
    therapist_dict = therapist_data.model_dump(exclude={"password"})
    therapist_dict["user_id"] = user_id
    therapist_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.therapists.insert_one(therapist_dict)
    
    # Send credentials via email
    email_result = None
    if use_email:
        try:
            email_result = await email_service.send_therapist_credentials(
                therapist_email=therapist_data.email,
                therapist_name=therapist_data.full_name,
                password=generated_password,
                property_name=therapist_data.assigned_property_id
            )
            logger.info(f"Email sent to {therapist_data.email}: {email_result}")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            # Don't fail therapist creation if email fails
    
    response = {
        "message": "Therapist created successfully",
        "user_id": user_id
    }
    
    # Include password in response if email not sent (for manual sharing)
    if not use_email or (email_result and not email_result.get("success")):
        response["password"] = generated_password
        response["note"] = "Please share these credentials with the therapist manually"
    else:
        response["note"] = f"Login credentials sent to {therapist_data.email}"
    
    return response

@api_router.get("/therapists")
async def get_therapists(current_user: dict = Depends(get_current_admin)):
    therapists_cursor = db.therapists.find({})
    therapists = []
    async for therapist in therapists_cursor:
        therapist_dict = {k: v for k, v in therapist.items() if k != "_id"}
        therapists.append(therapist_dict)
    return therapists

@api_router.delete("/therapists/{therapist_id}")
async def delete_therapist(therapist_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete therapist and their user account"""
    
    # Find therapist
    therapist = await db.therapists.find_one({"user_id": therapist_id})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    # Delete from therapists collection
    await db.therapists.delete_one({"user_id": therapist_id})
    
    # Delete user account
    from bson import ObjectId
    await db.users.delete_one({"_id": ObjectId(therapist_id)})
    
    return {"message": "Therapist removed successfully"}

@api_router.get("/therapists/me")
async def get_therapist_profile(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Not a therapist")
    
    therapist = await db.therapists.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist profile not found")
    return therapist

@api_router.post("/attendance/check-in")
async def check_in(data: AttendanceCheckIn, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Only therapists can check in")
    
    therapist = await db.therapists.find_one({"user_id": current_user["user_id"]})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({
        "therapist_id": current_user["user_id"],
        "date": today
    })
    
    if existing and existing.get("check_in_time"):
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    attendance_dict = {
        "therapist_id": current_user["user_id"],
        "property_id": therapist["assigned_property_id"],
        "date": today,
        "check_in_time": datetime.now(timezone.utc).isoformat(),
        "gps_location": data.gps_location,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.attendance.insert_one(attendance_dict)
    return {"message": "Checked in successfully", "time": attendance_dict["check_in_time"]}

@api_router.post("/attendance/check-out")
async def check_out(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Only therapists can check out")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    attendance = await db.attendance.find_one({
        "therapist_id": current_user["user_id"],
        "date": today
    })
    
    if not attendance:
        raise HTTPException(status_code=400, detail="No check-in found for today")
    
    if attendance.get("check_out_time"):
        raise HTTPException(status_code=400, detail="Already checked out")
    
    check_out_time = datetime.now(timezone.utc).isoformat()
    await db.attendance.update_one(
        {"therapist_id": current_user["user_id"], "date": today},
        {"$set": {"check_out_time": check_out_time}}
    )
    
    return {"message": "Checked out successfully", "time": check_out_time}

@api_router.get("/attendance/my-attendance")
async def get_my_attendance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Only therapists can view their attendance")
    
    attendance_records = await db.attendance.find(
        {"therapist_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    return attendance_records

@api_router.post("/services")
async def create_service_entry(service_data: ServiceEntryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Only therapists can create service entries")
    
    therapist = await db.therapists.find_one({"user_id": current_user["user_id"]})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    # Get property details for WhatsApp message
    property_name = therapist["assigned_property_id"]
    
    gst_amount = round(service_data.base_price * 0.18, 2)
    total_amount = round(service_data.base_price + gst_amount, 2)
    
    now = datetime.now(timezone.utc)
    service_dict = service_data.model_dump()
    service_dict.update({
        "therapist_id": current_user["user_id"],
        "property_id": therapist["assigned_property_id"],
        "gst_amount": gst_amount,
        "total_amount": total_amount,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "locked": True,
        "whatsapp_sent": False,
        "whatsapp_status": "pending",
        "created_at": now.isoformat()
    })
    
    result = await db.services.insert_one(service_dict)
    service_id = str(result.inserted_id)
    
    # Send WhatsApp feedback message
    try:
        whatsapp_result = await whatsapp_service.send_feedback_message(
            customer_phone=service_data.customer_phone,
            customer_name=service_data.customer_name,
            therapy_type=service_data.therapy_type,
            property_name=property_name,
            therapist_name=therapist.get("full_name", "Our therapist")
        )
        
        # Update service entry with WhatsApp status
        await db.services.update_one(
            {"_id": result.inserted_id},
            {
                "$set": {
                    "whatsapp_sent": whatsapp_result["success"],
                    "whatsapp_status": whatsapp_result["status"],
                    "whatsapp_message_id": whatsapp_result.get("message_id")
                }
            }
        )
        
        logger.info(f"WhatsApp message status for service {service_id}: {whatsapp_result['status']}")
        
    except Exception as e:
        logger.error(f"Failed to send WhatsApp for service {service_id}: {str(e)}")
        # Don't fail the service entry if WhatsApp fails
    
    return {
        "message": "Service entry created successfully",
        "service_id": service_id,
        "gst_amount": gst_amount,
        "total_amount": total_amount,
        "whatsapp_note": "Feedback message will be sent if WhatsApp is configured"
    }

@api_router.get("/services/my-services")
async def get_my_services(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Only therapists can view their services")
    
    services = await db.services.find(
        {"therapist_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return services

@api_router.get("/services")
async def get_all_services(
    property_id: Optional[List[str]] = Query(None),
    therapist_id: Optional[List[str]] = Query(None),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    query = {}
    
    # Handle multiple property IDs
    if property_id and len(property_id) > 0:
        if len(property_id) == 1:
            query["property_id"] = property_id[0]
        else:
            query["property_id"] = {"$in": property_id}
    
    # Handle multiple therapist IDs
    if therapist_id and len(therapist_id) > 0:
        if len(therapist_id) == 1:
            query["therapist_id"] = therapist_id[0]
        else:
            query["therapist_id"] = {"$in": therapist_id}
    
    # Handle date range
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    services = await db.services.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return services

@api_router.get("/incentives/my-incentive")
async def get_my_incentive(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "therapist":
        raise HTTPException(status_code=403, detail="Only therapists can view their incentives")
    
    therapist = await db.therapists.find_one({"user_id": current_user["user_id"]})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    services = await db.services.find({
        "therapist_id": current_user["user_id"],
        "date": {"$regex": f"^{current_year}-{current_month:02d}"}
    }, {"_id": 0}).to_list(10000)
    
    actual_sales = sum(s["base_price"] for s in services)
    target = therapist.get("monthly_target", 0)
    threshold = target * 0.9
    
    if actual_sales > threshold:
        excess_amount = actual_sales - threshold
        incentive_earned = excess_amount * 0.05
    else:
        excess_amount = 0
        incentive_earned = 0
    
    return {
        "target": target,
        "threshold": threshold,
        "actual_sales": actual_sales,
        "progress_percentage": round((actual_sales / target * 100) if target > 0 else 0, 2),
        "excess_amount": round(excess_amount, 2),
        "incentive_earned": round(incentive_earned, 2)
    }

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(
    property_id: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    query = {}
    if property_id:
        query["property_id"] = property_id
    
    services = await db.services.find(query, {"_id": 0}).to_list(100000)
    
    total_base_sales = sum(s["base_price"] for s in services)
    total_gst = sum(s["gst_amount"] for s in services)
    total_sales = sum(s["total_amount"] for s in services)
    
    hotel_received = sum(s["total_amount"] for s in services if s["payment_received_by"] == "hotel")
    nirvaana_received = sum(s["total_amount"] for s in services if s["payment_received_by"] == "nirvaana")
    
    customer_count = len(set(s["customer_phone"] for s in services))
    
    therapy_counts = {}
    for s in services:
        therapy_type = s["therapy_type"]
        therapy_counts[therapy_type] = therapy_counts.get(therapy_type, 0) + 1
    
    most_popular_therapy = max(therapy_counts.items(), key=lambda x: x[1])[0] if therapy_counts else "N/A"
    
    return {
        "total_base_sales": round(total_base_sales, 2),
        "total_gst": round(total_gst, 2),
        "total_sales": round(total_sales, 2),
        "hotel_received": round(hotel_received, 2),
        "nirvaana_received": round(nirvaana_received, 2),
        "customer_count": customer_count,
        "most_popular_therapy": most_popular_therapy,
        "total_services": len(services)
    }

@api_router.get("/revenue/property/{property_id}")
async def get_property_revenue(
    property_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_admin)
):
    from bson import ObjectId
    property_data = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    services = await db.services.find({
        "property_id": property_id,
        "date": {"$regex": f"^{target_year}-{target_month:02d}"}
    }, {"_id": 0}).to_list(100000)
    
    total_base_sales = sum(s["base_price"] for s in services)
    total_gst = sum(s["gst_amount"] for s in services)
    
    revenue_share = property_data["revenue_share_percentage"] / 100
    hotel_share = total_base_sales * revenue_share
    nirvaana_share = total_base_sales * (1 - revenue_share)
    
    hotel_received = sum(s["total_amount"] for s in services if s["payment_received_by"] == "hotel")
    nirvaana_received = sum(s["total_amount"] for s in services if s["payment_received_by"] == "nirvaana")
    
    settlement_balance = nirvaana_received - nirvaana_share
    
    return {
        "property_name": property_data["hotel_name"],
        "month": target_month,
        "year": target_year,
        "revenue_share_percentage": property_data["revenue_share_percentage"],
        "total_base_sales": round(total_base_sales, 2),
        "total_gst": round(total_gst, 2),
        "hotel_share": round(hotel_share, 2),
        "nirvaana_share": round(nirvaana_share, 2),
        "hotel_received": round(hotel_received, 2),
        "nirvaana_received": round(nirvaana_received, 2),
        "settlement_balance": round(settlement_balance, 2),
        "settlement_note": "Positive = Nirvaana owes Hotel, Negative = Hotel owes Nirvaana"
    }

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
