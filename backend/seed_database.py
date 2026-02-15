import asyncio
import sys
import os
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from auth import get_password_hash

async def seed_database():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding Nirvaana Wellness ERP Database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.properties.delete_many({})
    await db.therapists.delete_many({})
    await db.attendance.delete_many({})
    await db.services.delete_many({})
    print("✅ Cleared existing data")
    
    # Create Admin User
    admin_user = {
        "email": "admin@nirvaana.com",
        "phone": "+919876543210",
        "password_hash": get_password_hash("admin123"),
        "role": "super_admin",
        "full_name": "Admin User",
        "assigned_property_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    admin_result = await db.users.insert_one(admin_user)
    print(f"✅ Created Admin User - Email: admin@nirvaana.com, Password: admin123")
    
    # Create Properties
    properties = [
        {
            "hotel_name": "Taj Palace Mumbai",
            "location": "Colaba, Mumbai",
            "gst_number": "27AABCT1332L1ZX",
            "revenue_share_percentage": 50.0,
            "contract_start_date": "2024-01-01",
            "payment_cycle": "monthly",
            "contact_person": "Rajesh Kumar",
            "contact_number": "+912233445566",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "hotel_name": "The Oberoi Udaipur",
            "location": "Lake Pichola, Udaipur",
            "gst_number": "08AABCT2445M1ZY",
            "revenue_share_percentage": 55.0,
            "contract_start_date": "2024-02-15",
            "payment_cycle": "monthly",
            "contact_person": "Priya Sharma",
            "contact_number": "+912944556677",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    property_ids = []
    for prop in properties:
        result = await db.properties.insert_one(prop)
        property_ids.append(prop["hotel_name"])
        print(f"✅ Created Property - {prop['hotel_name']}")
    
    # Create Therapist Users and Profiles
    therapists_data = [
        {
            "full_name": "Anita Desai",
            "email": "anita@nirvaana.com",
            "phone": "+919123456781",
            "password": "therapist123",
            "experience_years": 5.0,
            "salary_expectation": 35000.0,
            "address": "Mumbai, Maharashtra",
            "assigned_property_id": property_ids[0],
            "monthly_target": 150000.0
        },
        {
            "full_name": "Rahul Verma",
            "email": "rahul@nirvaana.com",
            "phone": "+919123456782",
            "password": "therapist123",
            "experience_years": 3.5,
            "salary_expectation": 30000.0,
            "address": "Udaipur, Rajasthan",
            "assigned_property_id": property_ids[1],
            "monthly_target": 120000.0
        },
        {
            "full_name": "Meera Patel",
            "email": "meera@nirvaana.com",
            "phone": "+919123456783",
            "password": "therapist123",
            "experience_years": 7.0,
            "salary_expectation": 40000.0,
            "address": "Mumbai, Maharashtra",
            "assigned_property_id": property_ids[0],
            "monthly_target": 180000.0
        }
    ]
    
    for therapist_data in therapists_data:
        # Create user account
        user = {
            "email": therapist_data["email"],
            "phone": therapist_data["phone"],
            "password_hash": get_password_hash(therapist_data["password"]),
            "role": "therapist",
            "full_name": therapist_data["full_name"],
            "assigned_property_id": therapist_data["assigned_property_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        user_result = await db.users.insert_one(user)
        user_id = str(user_result.inserted_id)
        
        # Create therapist profile
        therapist_profile = {
            "user_id": user_id,
            "full_name": therapist_data["full_name"],
            "phone": therapist_data["phone"],
            "email": therapist_data["email"],
            "experience_years": therapist_data["experience_years"],
            "salary_expectation": therapist_data["salary_expectation"],
            "address": therapist_data["address"],
            "assigned_property_id": therapist_data["assigned_property_id"],
            "monthly_target": therapist_data["monthly_target"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.therapists.insert_one(therapist_profile)
        print(f"✅ Created Therapist - {therapist_data['full_name']} (Email: {therapist_data['email']}, Password: therapist123)")
    
    # Create sample service entries for current month
    sample_services = [
        {
            "customer_name": "Vikram Singh",
            "customer_phone": "+919998887771",
            "therapy_type": "Shirodhara",
            "base_price": 3500.0,
            "property": property_ids[0]
        },
        {
            "customer_name": "Deepa Menon",
            "customer_phone": "+919998887772",
            "therapy_type": "Hot Stone Massage",
            "base_price": 4500.0,
            "property": property_ids[0]
        },
        {
            "customer_name": "Amit Kapoor",
            "customer_phone": "+919998887773",
            "therapy_type": "Deep Tissue Massage",
            "base_price": 5000.0,
            "property": property_ids[1]
        }
    ]
    
    # Get first therapist's user_id for sample services
    first_therapist = await db.therapists.find_one({"email": "anita@nirvaana.com"})
    if first_therapist:
        for service in sample_services:
            gst_amount = round(service["base_price"] * 0.18, 2)
            total_amount = round(service["base_price"] + gst_amount, 2)
            
            service_entry = {
                "therapist_id": first_therapist["user_id"],
                "property_id": service["property"],
                "customer_name": service["customer_name"],
                "customer_phone": service["customer_phone"],
                "therapy_type": service["therapy_type"],
                "therapy_duration": "60 minutes",
                "base_price": service["base_price"],
                "gst_amount": gst_amount,
                "total_amount": total_amount,
                "payment_received_by": "hotel" if service == sample_services[0] else "nirvaana",
                "payment_mode": "card",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                "locked": True,
                "whatsapp_sent": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.services.insert_one(service_entry)
        print(f"✅ Created {len(sample_services)} sample service entries")
    
    print("\n🎉 Database seeding complete!")
    print("\n📋 Test Credentials:")
    print("=" * 50)
    print("\n👨‍💼 ADMIN LOGIN:")
    print("   Email: admin@nirvaana.com")
    print("   Password: admin123")
    print("\n💆 THERAPIST LOGINS:")
    print("   Email: anita@nirvaana.com | Password: therapist123")
    print("   Email: rahul@nirvaana.com | Password: therapist123")
    print("   Email: meera@nirvaana.com | Password: therapist123")
    print("\n" + "=" * 50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
