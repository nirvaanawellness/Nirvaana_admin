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
    IncentiveRecord, MonthlyClosing, PaymentReceivedBy,
    Expense, ExpenseCreate, ExpenseType, ExpenseCategory
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
    # Support login via email OR username
    user = await db.users.find_one({
        "$or": [
            {"email": credentials.email},
            {"username": credentials.email}  # Allow username in the email field
        ]
    })
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
            "username": user.get("username"),
            "role": user["role"],
            "full_name": user["full_name"],
            "user_id": str(user["_id"]),
            "assigned_property_id": user.get("assigned_property_id")
        }
    }

@api_router.get("/properties")
async def get_properties(
    include_archived: bool = Query(False, description="Include archived properties"),
    current_user: dict = Depends(get_current_user)
):
    """Get properties. By default only returns active properties."""
    query = {}
    if not include_archived:
        query["status"] = {"$ne": "archived"}
    
    properties_cursor = db.properties.find(query)
    properties = []
    async for prop in properties_cursor:
        prop_dict = {k: v for k, v in prop.items() if k != "_id"}
        prop_dict["id"] = str(prop["_id"])
        # Ensure status field exists (for backward compatibility)
        if "status" not in prop_dict:
            prop_dict["status"] = "active"
        properties.append(prop_dict)
    return properties

@api_router.post("/properties")
async def create_property(property_data: PropertyCreate, current_user: dict = Depends(get_current_admin)):
    prop_dict = property_data.model_dump()
    prop_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    prop_dict["active"] = True
    prop_dict["status"] = "active"
    
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
    """Archive a property (soft delete). Historical data is preserved."""
    from bson import ObjectId
    
    # Archive instead of delete - update status to archived
    result = await db.properties.update_one(
        {"_id": ObjectId(property_id)},
        {
            "$set": {
                "status": "archived",
                "active": False,
                "archived_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Also archive all therapists assigned to this property
    property_data = await db.properties.find_one({"_id": ObjectId(property_id)})
    if property_data:
        await db.therapists.update_many(
            {"assigned_property_id": property_data.get("hotel_name")},
            {
                "$set": {
                    "status": "archived",
                    "archived_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    return {"message": "Property archived successfully. Historical data preserved."}

@api_router.put("/properties/{property_id}/restore")
async def restore_property(property_id: str, current_user: dict = Depends(get_current_admin)):
    """Restore an archived property"""
    from bson import ObjectId
    
    result = await db.properties.update_one(
        {"_id": ObjectId(property_id)},
        {
            "$set": {
                "status": "active",
                "active": True
            },
            "$unset": {"archived_at": ""}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": "Property restored successfully"}

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
async def get_therapists(
    include_archived: bool = Query(False, description="Include archived therapists"),
    current_user: dict = Depends(get_current_admin)
):
    """Get therapists. By default only returns active therapists."""
    query = {}
    if not include_archived:
        query["status"] = {"$ne": "archived"}
    
    therapists_cursor = db.therapists.find(query)
    therapists = []
    async for therapist in therapists_cursor:
        therapist_dict = {k: v for k, v in therapist.items() if k != "_id"}
        # Ensure status field exists (for backward compatibility)
        if "status" not in therapist_dict:
            therapist_dict["status"] = "active"
        therapists.append(therapist_dict)
    return therapists

@api_router.delete("/therapists/{therapist_id}")
async def delete_therapist(therapist_id: str, current_user: dict = Depends(get_current_admin)):
    """Archive a therapist (soft delete). Historical data is preserved."""
    
    # Find therapist
    therapist = await db.therapists.find_one({"user_id": therapist_id})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    # Archive therapist instead of delete
    await db.therapists.update_one(
        {"user_id": therapist_id},
        {
            "$set": {
                "status": "archived",
                "archived_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Also archive the user account (prevent login)
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(therapist_id)},
        {
            "$set": {
                "status": "archived",
                "archived_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Therapist archived successfully. Historical data preserved."}

@api_router.put("/therapists/{therapist_id}/restore")
async def restore_therapist(therapist_id: str, current_user: dict = Depends(get_current_admin)):
    """Restore an archived therapist"""
    from bson import ObjectId
    
    # Restore therapist
    result = await db.therapists.update_one(
        {"user_id": therapist_id},
        {
            "$set": {"status": "active"},
            "$unset": {"archived_at": ""}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    # Restore user account
    await db.users.update_one(
        {"_id": ObjectId(therapist_id)},
        {
            "$set": {"status": "active"},
            "$unset": {"archived_at": ""}
        }
    )
    
    return {"message": "Therapist restored successfully"}

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

@api_router.get("/attendance/admin/daily")
async def get_daily_attendance(
    date: Optional[str] = None,
    property_id: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    """Get daily attendance log for admin - shows who signed in/out on a specific day"""
    from bson import ObjectId
    
    # Default to today if no date provided
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Build query
    query = {"date": target_date}
    if property_id:
        query["property_id"] = property_id
    
    attendance_records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    
    # Get active therapist info to enrich the records
    active_therapists = await db.therapists.find(
        {"status": {"$ne": "archived"}},
        {"_id": 0, "user_id": 1, "full_name": 1, "assigned_property_id": 1}
    ).to_list(1000)
    
    therapist_map = {t["user_id"]: t for t in active_therapists}
    
    # Enrich attendance records with therapist info
    enriched_records = []
    for record in attendance_records:
        therapist_info = therapist_map.get(record["therapist_id"], {})
        enriched_records.append({
            **record,
            "therapist_name": therapist_info.get("full_name", "Unknown"),
            "assigned_property": therapist_info.get("assigned_property_id", "Unknown")
        })
    
    # Also identify therapists who haven't checked in yet
    checked_in_ids = {r["therapist_id"] for r in attendance_records}
    not_checked_in = []
    for therapist in active_therapists:
        if property_id and therapist.get("assigned_property_id") != property_id:
            continue
        if therapist["user_id"] not in checked_in_ids:
            not_checked_in.append({
                "therapist_id": therapist["user_id"],
                "therapist_name": therapist["full_name"],
                "assigned_property": therapist.get("assigned_property_id", "Unknown"),
                "status": "not_signed_in"
            })
    
    return {
        "date": target_date,
        "checked_in": enriched_records,
        "not_checked_in": not_checked_in,
        "total_checked_in": len(enriched_records),
        "total_not_checked_in": len(not_checked_in)
    }

@api_router.get("/attendance/admin/history/{therapist_id}")
async def get_therapist_attendance_history(
    therapist_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    """Get attendance history for a specific active therapist (admin view)"""
    
    # Verify therapist exists and is active
    therapist = await db.therapists.find_one({"user_id": therapist_id})
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    if therapist.get("status") == "archived":
        raise HTTPException(status_code=400, detail="Cannot view attendance history for archived therapists")
    
    # Build query
    query = {"therapist_id": therapist_id}
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = date_from
        if date_to:
            query["date"]["$lte"] = date_to
    
    records = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    return {
        "therapist_id": therapist_id,
        "therapist_name": therapist.get("full_name", "Unknown"),
        "assigned_property": therapist.get("assigned_property_id", "Unknown"),
        "attendance_records": records,
        "total_records": len(records)
    }

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

# ================= EXPENSE ENDPOINTS =================

@api_router.post("/expenses")
async def create_expense(expense_data: ExpenseCreate, current_user: dict = Depends(get_current_admin)):
    """Create a new expense record"""
    expense_dict = expense_data.model_dump()
    expense_dict["created_by"] = current_user["user_id"]
    expense_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.expenses.insert_one(expense_dict)
    expense_dict["id"] = str(result.inserted_id)
    
    return {"message": "Expense created successfully", "expense_id": str(result.inserted_id)}

@api_router.get("/expenses")
async def get_all_expenses(
    property_id: Optional[List[str]] = Query(None),
    expense_type: Optional[List[str]] = Query(None),
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    """Get all expenses with optional filters"""
    query = {}
    
    if property_id and len(property_id) > 0:
        if len(property_id) == 1:
            query["property_id"] = property_id[0]
        else:
            query["property_id"] = {"$in": property_id}
    
    if expense_type and len(expense_type) > 0:
        if len(expense_type) == 1:
            query["expense_type"] = expense_type[0]
        else:
            query["expense_type"] = {"$in": expense_type}
    
    if category:
        query["category"] = category
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    expenses_cursor = db.expenses.find(query)
    expenses = []
    async for expense in expenses_cursor:
        expense_dict = {k: v for k, v in expense.items() if k != "_id"}
        expense_dict["id"] = str(expense["_id"])
        expenses.append(expense_dict)
    
    return expenses

@api_router.get("/expenses/{expense_id}")
async def get_expense(expense_id: str, current_user: dict = Depends(get_current_admin)):
    """Get a specific expense by ID"""
    from bson import ObjectId
    expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense_dict = {k: v for k, v in expense.items() if k != "_id"}
    expense_dict["id"] = str(expense["_id"])
    return expense_dict

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete an expense record"""
    from bson import ObjectId
    result = await db.expenses.delete_one({"_id": ObjectId(expense_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

@api_router.get("/expenses/summary/by-property")
async def get_expense_summary(
    property_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_admin)
):
    """Get expense summary grouped by type for a property"""
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    query = {
        "date": {"$regex": f"^{target_year}-{target_month:02d}"}
    }
    if property_id:
        query["property_id"] = property_id
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    # Group by type
    summary = {
        "recurring": {"salary": 0, "living_cost": 0, "total": 0},
        "adhoc": {"marketing": 0, "disposables": 0, "oil_aromatics": 0, "essentials": 0, "bill_books": 0, "other": 0, "total": 0}
    }
    
    for expense in expenses:
        exp_type = expense["expense_type"]
        category = expense["category"]
        amount = expense["amount"]
        
        if category == "recurring":
            if exp_type in summary["recurring"]:
                summary["recurring"][exp_type] += amount
            summary["recurring"]["total"] += amount
        else:
            if exp_type in summary["adhoc"]:
                summary["adhoc"][exp_type] += amount
            summary["adhoc"]["total"] += amount
    
    summary["grand_total"] = summary["recurring"]["total"] + summary["adhoc"]["total"]
    summary["month"] = target_month
    summary["year"] = target_year
    summary["expense_count"] = len(expenses)
    
    return summary

# ==================== OTP PASSWORD CHANGE ====================
import random
import string
from models import OTPRequest, OTPVerify, PasswordChange

@api_router.post("/auth/request-otp")
async def request_otp(data: OTPRequest):
    """Request OTP for password change - sent to admin email"""
    # Find user by email OR username
    user = await db.users.find_one({
        "$or": [
            {"email": data.email},
            {"username": data.email}
        ]
    })
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only allow admins to change password via OTP
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="OTP password change is only available for admin users")
    
    # Use the actual user email for OTP storage (not username)
    actual_email = user["email"]
    
    # Generate 6-digit OTP
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Store OTP with expiry (10 minutes)
    otp_record = {
        "email": actual_email,  # Store actual email, not username
        "otp": otp,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc).replace(microsecond=0) + 
                       __import__('datetime').timedelta(minutes=10)).isoformat(),
        "used": False
    }
    
    # Remove any existing OTP for this email
    await db.otp_records.delete_many({"email": actual_email})
    
    # Insert new OTP
    await db.otp_records.insert_one(otp_record)
    
    # Send OTP via email
    try:
        result = await email_service.send_otp_email(
            email=actual_email,
            otp=otp,
            user_name=user.get("full_name", "Admin")
        )
        if result.get("success"):
            return {"message": "OTP sent to your registered email", "email_masked": f"***{actual_email[-10:]}", "email": actual_email}
        else:
            # If email fails, return OTP in response (for development)
            return {"message": "OTP generated (email delivery failed)", "otp": otp, "email": actual_email, "note": "Use this OTP to change password"}
    except Exception:
        # Return OTP in response if email fails
        return {"message": "OTP generated (email service unavailable)", "otp": otp, "email": actual_email, "note": "Use this OTP to change password"}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    """Verify OTP without changing password"""
    otp_record = await db.otp_records.find_one({
        "email": data.email,
        "otp": data.otp,
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    return {"message": "OTP verified successfully", "valid": True}

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange):
    """Change password after OTP verification"""
    # Verify OTP (OTP is stored by email, not username)
    otp_record = await db.otp_records.find_one({
        "email": data.email,
        "otp": data.otp,
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Validate password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password - find user by email stored in OTP record
    new_hash = get_password_hash(data.new_password)
    result = await db.users.update_one(
        {"email": otp_record["email"]},  # Use email from OTP record
        {"$set": {"password_hash": new_hash}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark OTP as used
    await db.otp_records.update_one(
        {"email": otp_record["email"], "otp": data.otp},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password changed successfully"}

# ==================== FORECASTING ====================
@api_router.get("/analytics/forecast")
async def get_forecast(current_user: dict = Depends(get_current_admin)):
    """Get next month revenue forecast using weighted moving average and linear regression"""
    import numpy as np
    
    # Get services from past 6 months
    now = datetime.now(timezone.utc)
    
    # Build monthly data
    monthly_data = []
    for i in range(6, 0, -1):
        target_month = now.month - i
        target_year = now.year
        if target_month <= 0:
            target_month += 12
            target_year -= 1
        
        date_prefix = f"{target_year}-{target_month:02d}"
        
        services = await db.services.find({
            "date": {"$regex": f"^{date_prefix}"}
        }, {"_id": 0, "base_price": 1}).to_list(10000)
        
        month_revenue = sum(s["base_price"] for s in services)
        month_services = len(services)
        
        monthly_data.append({
            "month": target_month,
            "year": target_year,
            "label": f"{target_year}-{target_month:02d}",
            "revenue": month_revenue,
            "services": month_services
        })
    
    # Calculate weighted moving average (recent months weighted more)
    weights = [1, 1.5, 2, 2.5, 3, 3.5]  # Increasing weights for recent months
    revenues = [m["revenue"] for m in monthly_data]
    
    if sum(revenues) == 0:
        return {
            "forecast_month": (now.month % 12) + 1,
            "forecast_year": now.year if now.month < 12 else now.year + 1,
            "predicted_revenue": 0,
            "predicted_services": 0,
            "confidence": "low",
            "method": "insufficient_data",
            "historical_data": monthly_data
        }
    
    weighted_avg = sum(r * w for r, w in zip(revenues, weights)) / sum(weights)
    
    # Linear regression for trend analysis
    x = np.array(range(len(revenues)))
    y = np.array(revenues)
    
    # Calculate regression coefficients
    n = len(x)
    sum_x = np.sum(x)
    sum_y = np.sum(y)
    sum_xy = np.sum(x * y)
    sum_x2 = np.sum(x * x)
    
    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x) if (n * sum_x2 - sum_x * sum_x) != 0 else 0
    intercept = (sum_y - slope * sum_x) / n
    
    # Predict next month (index = 6)
    regression_forecast = intercept + slope * 6
    
    # Combine weighted avg and regression (60% regression, 40% weighted avg)
    combined_forecast = (0.6 * regression_forecast + 0.4 * weighted_avg) if regression_forecast > 0 else weighted_avg
    
    # Calculate average services and apply growth rate
    avg_services = sum(m["services"] for m in monthly_data) / len(monthly_data) if monthly_data else 0
    service_growth = 1 + (slope / (sum_y / n) if sum_y > 0 else 0)  # Growth rate from revenue trend
    predicted_services = int(avg_services * max(0.8, min(1.5, service_growth)))
    
    # Determine confidence based on data consistency
    variance = np.var(revenues) if len(revenues) > 1 else 0
    mean_revenue = np.mean(revenues) if revenues else 0
    cv = (np.sqrt(variance) / mean_revenue * 100) if mean_revenue > 0 else 100  # Coefficient of variation
    
    if cv < 20:
        confidence = "high"
    elif cv < 40:
        confidence = "medium"
    else:
        confidence = "low"
    
    next_month = (now.month % 12) + 1
    next_year = now.year if now.month < 12 else now.year + 1
    
    return {
        "forecast_month": next_month,
        "forecast_year": next_year,
        "forecast_label": f"{next_year}-{next_month:02d}",
        "predicted_revenue": round(max(0, combined_forecast), 2),
        "predicted_services": max(0, predicted_services),
        "weighted_avg_forecast": round(weighted_avg, 2),
        "regression_forecast": round(max(0, regression_forecast), 2),
        "trend": "growing" if slope > 0 else "declining" if slope < 0 else "stable",
        "growth_rate_percent": round(slope / mean_revenue * 100 if mean_revenue > 0 else 0, 1),
        "confidence": confidence,
        "method": "weighted_moving_average_with_regression",
        "historical_data": monthly_data
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
